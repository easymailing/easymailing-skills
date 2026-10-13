import assert from "node:assert/strict";
import test from "node:test";
import { DataForSeoError, request } from "../src/client.js";
import {
  classifyLlmFailure,
  exitCodeForCoverageStatus,
  mapCoverageStatusToCalendarLog,
  machineSummaryLine,
  normalizeCoverageEngines,
  renderCoverageJson,
  renderCoverageMarkdown,
  renderCoverageTable,
  renderCoverageTsv,
  runLlmCoverage,
  type LlmAskInvocation,
  type LlmAskResult,
} from "../src/llmCoverage.js";

function answer(engine: string, text: string): LlmAskResult {
  return {
    engine,
    model: `${engine}-model`,
    money_spent: 0.01,
    input_tokens: 10,
    output_tokens: 20,
    answer: text,
    annotations: [],
    fan_out_queries: [],
    web_search: true,
  };
}

function typedError(init: ConstructorParameters<typeof DataForSeoError>[1]): DataForSeoError {
  return new DataForSeoError(init.statusMessage ?? "request failed", init);
}

async function classifyHttp200TaskCode(
  statusCode: number,
  statusMessage = "API failure",
  field?: string,
) {
  try {
    await request("/ai_optimization/chat_gpt/llm_responses/live", [{}], {
      fullResponse: true,
      transport: async () => new Response(JSON.stringify({
        status_code: 20000,
        tasks: [{ status_code: statusCode, status_message: statusMessage, field }],
      }), { status: 200, headers: { "content-type": "application/json" } }),
      context: { engine: "chatgpt", model: "gpt-4o-mini" },
    });
  } catch (error) {
    return classifyLlmFailure(error);
  }
  throw new Error(`Expected status_code ${statusCode} to fail`);
}

const baseOptions = {
  prompts: ["first prompt", "second prompt"],
  brands: ["easymailing"],
  engines: ["chatgpt"],
  location: 2724,
  language: "es",
  country: "ES",
  maxTokens: 1024,
  maxRetries: 2,
};

test("uses one cache-disabled probe per engine and reuses its answer", async () => {
  const invocations: LlmAskInvocation[] = [];
  let networkCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    networkCalls++;
    throw new Error("network access is forbidden in tests");
  };

  try {
    const report = await runLlmCoverage({
      ...baseOptions,
      engines: ["chatgpt", "gemini"],
    }, {
      ask: async (invocation) => {
        invocations.push(invocation);
        return answer(invocation.engine, `Easymailing from ${invocation.engine}`);
      },
      sleep: async () => {},
    });

    assert.equal(networkCalls, 0);
    assert.equal(invocations.length, 4);
    for (const engine of ["chatgpt", "gemini"]) {
      const engineCalls = invocations.filter((call) => call.engine === engine);
      assert.equal(engineCalls.filter((call) => call.prompt === "first prompt").length, 1);
      assert.equal(engineCalls[0].useCache, false);
      assert.equal(engineCalls[1].prompt, "second prompt");
    }
    assert.equal(report.status, "success");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects case-normalized duplicate engines before making any calls", async () => {
  let calls = 0;
  assert.throws(
    () => normalizeCoverageEngines(["ChatGPT", " chatgpt "]),
    /Duplicate engine: chatgpt/,
  );

  await assert.rejects(
    runLlmCoverage({
      ...baseOptions,
      engines: ["ChatGPT", " chatgpt "],
    }, {
      ask: async (invocation) => {
        calls++;
        return answer(invocation.engine, "Easymailing");
      },
      sleep: async () => {},
    }),
    /Duplicate engine: chatgpt/,
  );
  assert.equal(calls, 0);
});

test("bounds post-probe cell concurrency without duplicating the probe", async () => {
  let active = 0;
  let maxActive = 0;
  let probeCalls = 0;
  const report = await runLlmCoverage({
    ...baseOptions,
    prompts: ["probe", "two", "three", "four"],
    concurrency: 2,
  }, {
    ask: async (invocation) => {
      if (invocation.prompt === "probe") {
        probeCalls++;
        return answer(invocation.engine, "Easymailing");
      }
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      active--;
      return answer(invocation.engine, "Easymailing");
    },
    sleep: async () => {},
  });

  assert.equal(probeCalls, 1);
  assert.equal(maxActive, 2);
  assert.equal(report.status, "success");
});

test("retries a transient probe exactly twice before succeeding", async () => {
  let attempts = 0;
  const report = await runLlmCoverage({
    ...baseOptions,
    prompts: ["only prompt"],
  }, {
    ask: async (invocation) => {
      attempts++;
      if (attempts < 3) {
        throw typedError({
          httpStatus: 503,
          engine: invocation.engine,
          model: invocation.model,
        });
      }
      return answer(invocation.engine, "Easymailing");
    },
    sleep: async () => {},
  });

  assert.equal(attempts, 3);
  assert.equal(report.status, "success");
  assert.equal(report.metadata.failure_count, 0);
});

test("an exhausted transient probe is N/D but remaining prompts still run", async () => {
  let probeAttempts = 0;
  let secondPromptAttempts = 0;
  const report = await runLlmCoverage(baseOptions, {
    ask: async (invocation) => {
      if (invocation.prompt === "first prompt") {
        probeAttempts++;
        throw typedError({
          httpStatus: 200,
          statusCode: 50301,
          statusMessage: "Internal server error",
          engine: invocation.engine,
          model: invocation.model,
        });
      }
      secondPromptAttempts++;
      return answer(invocation.engine, "Easymailing");
    },
    sleep: async () => {},
  });

  assert.equal(probeAttempts, 3);
  assert.equal(secondPromptAttempts, 1);
  assert.equal(report.coverage_per_prompt[0].cells.chatgpt, "N/D");
  assert.equal(report.coverage_per_prompt[1].cells.chatgpt, "observed");
  assert.equal(report.status, "partial");
});

test("a field-specific deterministic probe error opens only that engine circuit", async () => {
  const calls: Record<string, number> = { claude: 0, chatgpt: 0 };
  const report = await runLlmCoverage({
    ...baseOptions,
    prompts: ["one", "two", "three"],
    engines: ["claude", "chatgpt"],
  }, {
    ask: async (invocation) => {
      calls[invocation.engine]++;
      if (invocation.engine === "claude") {
        throw typedError({
          httpStatus: 200,
          statusCode: 40501,
          statusMessage: "Invalid Field: 'model_name'.",
          field: "model_name",
          engine: invocation.engine,
          model: invocation.model,
        });
      }
      return answer(invocation.engine, "Easymailing");
    },
    sleep: async () => {},
  });

  assert.deepEqual(calls, { claude: 1, chatgpt: 3 });
  assert.equal(report.status, "partial");
  assert.deepEqual(report.metadata.requested_prompt_counts, { claude: 3, chatgpt: 3 });
  assert.deepEqual(report.metadata.observed_prompt_counts, { claude: 0, chatgpt: 3 });
  assert.equal(report.metadata.failure_count, 1);
  assert.equal(report.metadata.failures[0].category, "deterministic_engine_configuration");
  assert.equal(report.metadata.failures[0].field, "model_name");
  assert.equal(report.coverage_per_prompt[2].cells.claude, "N/D");
});

test("a deterministic probe error without the probed engine identity aborts fail-closed", async () => {
  let calls = 0;
  const report = await runLlmCoverage({
    ...baseOptions,
    engines: ["claude", "chatgpt"],
  }, {
    ask: async () => {
      calls++;
      throw typedError({
        statusCode: 40501,
        statusMessage: "Invalid Field: 'model_name'.",
        field: "model_name",
      });
    },
    sleep: async () => {},
  });

  assert.equal(calls, 1);
  assert.equal(report.status, "failed");
  assert.equal(report.machine_summary.status, "error");
});

test("fatal auth, input, and unknown failures abort the run", async (t) => {
  const cases: Array<{ name: string; error: Error; category: string }> = [
    {
      name: "auth",
      error: typedError({ httpStatus: 401, statusCode: 40100, statusMessage: "Authentication failed" }),
      category: "fatal_input_auth",
    },
    {
      name: "input without a field-specific circuit signal",
      error: typedError({ httpStatus: 400, statusCode: 40501, statusMessage: "Invalid request" }),
      category: "fatal_input_auth",
    },
    {
      name: "unknown",
      error: new Error("unexpected failure"),
      category: "unknown_fatal",
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      let calls = 0;
      const report = await runLlmCoverage({
        ...baseOptions,
        engines: ["chatgpt", "gemini"],
      }, {
        ask: async () => {
          calls++;
          throw scenario.error;
        },
        sleep: async () => {},
      });

      assert.equal(calls, 1);
      assert.equal(report.status, "failed");
      assert.equal(report.metadata.failures[0].category, scenario.category);
      assert.equal(report.machine_summary.status, "error");
    });
  }
});

test("a post-probe exhausted transient failure stays N/D and produces partial status", async () => {
  let calls = 0;
  const report = await runLlmCoverage(baseOptions, {
    ask: async (invocation) => {
      calls++;
      if (invocation.prompt === "first prompt") return answer(invocation.engine, "No tracked brand here");
      throw typedError({ httpStatus: 503, engine: invocation.engine, model: invocation.model });
    },
    sleep: async () => {},
  });

  assert.equal(calls, 4);
  assert.equal(report.status, "partial");
  assert.equal(report.coverage_per_prompt[0].cells.chatgpt, "observed");
  assert.equal(report.coverage_per_prompt[1].cells.chatgpt, "N/D");
  assert.equal(report.coverage_per_brand[0].engines.chatgpt.coverage, "0 / 1");
  assert.deepEqual(report.metadata.observed_prompt_counts, { chatgpt: 1 });
  assert.equal(report.metadata.failure_count, 1);
});

test("zero means an observed answer without the brand, while no answer is N/D", async () => {
  const report = await runLlmCoverage(baseOptions, {
    ask: async (invocation) => {
      if (invocation.prompt === "first prompt") return answer(invocation.engine, "Mail software");
      throw typedError({
        statusCode: 40501,
        statusMessage: "Invalid Field: 'temperature'.",
        field: "temperature",
        engine: invocation.engine,
        model: invocation.model,
      });
    },
    sleep: async () => {},
  });

  assert.equal(report.coverage_per_brand[0].engines.chatgpt.mentions, 0);
  assert.equal(report.coverage_per_brand[0].engines.chatgpt.observed, 1);
  assert.equal(report.coverage_per_brand[0].engines.chatgpt.coverage, "0 / 1");
  assert.equal(report.coverage_per_prompt[1].cells.chatgpt, "N/D");
});

test("all observed cells succeed and no observed cells fail", async () => {
  const success = await runLlmCoverage(baseOptions, {
    ask: async (invocation) => answer(invocation.engine, "Easymailing"),
    sleep: async () => {},
  });
  assert.equal(success.status, "success");

  const failed = await runLlmCoverage(baseOptions, {
    ask: async (invocation) => {
      throw typedError({
        statusCode: 40501,
        statusMessage: "Invalid Field: 'model_name'.",
        field: "model_name",
        engine: invocation.engine,
        model: invocation.model,
      });
    },
    sleep: async () => {},
  });
  assert.equal(failed.status, "failed");
  assert.equal(failed.machine_summary.status, "error");
  assert.equal(failed.coverage_per_brand[0].engines.chatgpt.coverage, "N/D");
  assert.equal(failed.coverage_per_brand[0].total.coverage, "N/D");
});

test("classifier is closed and machine status mapping is complete", () => {
  assert.equal(classifyLlmFailure(typedError({ httpStatus: 429 })), "transient_retryable");
  assert.equal(
    classifyLlmFailure(typedError({ statusCode: 40501, field: "model_name", engine: "chatgpt" })),
    "deterministic_engine_configuration",
  );
  assert.equal(classifyLlmFailure(typedError({ statusCode: 40100, statusMessage: "Authentication failed" })), "fatal_input_auth");
  assert.equal(classifyLlmFailure(typedError({ statusCode: 49999, statusMessage: "Unrecognized API failure" })), "unknown_fatal");
  assert.equal(classifyLlmFailure(new Error("other")), "unknown_fatal");
  assert.deepEqual({
    success: mapCoverageStatusToCalendarLog("success"),
    partial: mapCoverageStatusToCalendarLog("partial"),
    failed: mapCoverageStatusToCalendarLog("failed"),
  }, {
    success: "success",
    partial: "partial",
    failed: "error",
  });
  assert.equal(exitCodeForCoverageStatus("success"), 0);
  assert.equal(exitCodeForCoverageStatus("partial"), 0);
  assert.equal(exitCodeForCoverageStatus("failed"), 1);
  assert.equal(
    machineSummaryLine({ schema_version: 1, source: "dataforseo.llm-coverage", status: "partial" }),
    'DATAFORSEO_LLM_COVERAGE_SUMMARY={"schema_version":1,"source":"dataforseo.llm-coverage","status":"partial"}',
  );
});

test("HTTP auth/input takes precedence over 40501 and engine config fields are allowlisted", () => {
  assert.equal(classifyLlmFailure(typedError({
    httpStatus: 400,
    statusCode: 50301,
    engine: "chatgpt",
  })), "fatal_input_auth");
  assert.equal(classifyLlmFailure(typedError({
    httpStatus: 400,
    statusCode: 40501,
    field: "location_code",
    engine: "chatgpt",
  })), "fatal_input_auth");
  assert.equal(classifyLlmFailure(typedError({
    httpStatus: 401,
    statusCode: 40501,
    field: "model_name",
    engine: "chatgpt",
  })), "fatal_input_auth");

  for (const field of [
    "location_code",
    "language_code",
    "country",
    "web_search_country_iso_code",
    "max_tokens",
    "max_output_tokens",
    "user_prompt",
  ]) {
    assert.equal(classifyLlmFailure(typedError({
      httpStatus: 200,
      statusCode: 40501,
      field,
      engine: "chatgpt",
    })), "fatal_input_auth", field);
  }

  assert.equal(classifyLlmFailure(typedError({
    httpStatus: 200,
    statusCode: 40501,
    field: "model_name",
  })), "fatal_input_auth");
  assert.equal(classifyLlmFailure(typedError({
    httpStatus: 200,
    statusCode: 40501,
    field: "force_web_search",
    engine: "chatgpt",
  })), "fatal_input_auth");
  assert.equal(classifyLlmFailure(typedError({
    httpStatus: 200,
    statusCode: 40501,
    field: "force_web_search",
    engine: "claude",
  })), "deterministic_engine_configuration");
});

test("HTTP 400/401 plus 40501 aborts before probing another engine", async (t) => {
  const scenarios = [
    { httpStatus: 400, field: "location_code" },
    { httpStatus: 401, field: "model_name" },
  ];

  for (const scenario of scenarios) {
    await t.test(`${scenario.httpStatus} ${scenario.field}`, async () => {
      let calls = 0;
      const report = await runLlmCoverage({
        ...baseOptions,
        engines: ["chatgpt", "gemini"],
      }, {
        ask: async (invocation) => {
          calls++;
          throw typedError({
            httpStatus: scenario.httpStatus,
            statusCode: 40501,
            statusMessage: `Invalid Field: '${scenario.field}'.`,
            field: scenario.field,
            engine: invocation.engine,
            model: invocation.model,
          });
        },
        sleep: async () => {},
      });

      assert.equal(calls, 1);
      assert.equal(report.status, "failed");
      assert.equal(report.metadata.failures[0].category, "fatal_input_auth");
    });
  }
});

test("classifies only known Node and Undici transport failures as transient", () => {
  assert.equal(
    classifyLlmFailure(new DataForSeoError("fetch failed")),
    "transient_retryable",
  );

  for (const causeCode of [
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
    "UND_ERR_SOCKET",
  ]) {
    assert.equal(
      classifyLlmFailure(new DataForSeoError("transport failed", { cause: { code: causeCode } })),
      "transient_retryable",
      causeCode,
    );
  }

  assert.equal(
    classifyLlmFailure(new DataForSeoError("fetch failed for an unknown reason")),
    "unknown_fatal",
  );
  assert.equal(
    classifyLlmFailure(new DataForSeoError("transport failed", { cause: { code: "UND_ERR_UNKNOWN" } })),
    "unknown_fatal",
  );
});

test("classifies official DataForSEO HTTP-200 status codes without broad inference", async () => {
  const transientCodes = [40103, 40209, 50000, 50001, 50301, 50302, 50303, 50304, 50401, 50402];
  for (const statusCode of transientCodes) {
    assert.equal(
      await classifyHttp200TaskCode(statusCode),
      "transient_retryable",
      `status_code ${statusCode}`,
    );
  }

  const fatalCodes = [40100, 40104, 40207, 40210, 40402, 40503, 40506, 50100];
  for (const statusCode of fatalCodes) {
    assert.equal(
      await classifyHttp200TaskCode(statusCode),
      "fatal_input_auth",
      `status_code ${statusCode}`,
    );
  }

  assert.equal(
    await classifyHttp200TaskCode(40501, "Invalid Field"),
    "fatal_input_auth",
  );
  assert.equal(
    await classifyHttp200TaskCode(40501, "Invalid Field: 'model_name'.", "model_name"),
    "deterministic_engine_configuration",
  );
  assert.equal(
    await classifyHttp200TaskCode(49999),
    "unknown_fatal",
  );
});

test("JSON, table, and Markdown expose byte-equivalent metadata", async () => {
  const report = await runLlmCoverage(baseOptions, {
    ask: async (invocation) => {
      if (invocation.prompt === "first prompt") return answer(invocation.engine, "Easymailing");
      throw typedError({ httpStatus: 503, engine: invocation.engine, model: invocation.model });
    },
    sleep: async () => {},
  });
  const metadataJson = JSON.stringify(report.metadata);
  const jsonMetadata = JSON.stringify(JSON.parse(renderCoverageJson(report)).metadata);
  const tableMetadata = renderCoverageTable(report).match(/^metadata_json\t(.+)$/m)?.[1];
  const markdownMetadata = renderCoverageMarkdown(report).match(/^<!-- metadata_json (.+) -->$/m)?.[1];

  assert.equal(jsonMetadata, metadataJson);
  assert.equal(tableMetadata, metadataJson);
  assert.equal(JSON.stringify(JSON.parse(markdownMetadata ?? "")), metadataJson);
});

test("metadata HTML comment safely round-trips brands and failures containing a close sequence", async () => {
  const maliciousBrand = "brand-->escaped";
  const report = await runLlmCoverage({
    ...baseOptions,
    brands: [maliciousBrand],
  }, {
    ask: async (invocation) => {
      if (invocation.prompt === "first prompt") return answer(invocation.engine, maliciousBrand);
      throw new DataForSeoError("failure --> injected", {
        httpStatus: 503,
        engine: invocation.engine,
        model: invocation.model,
      });
    },
    sleep: async () => {},
  });

  const markdown = renderCoverageMarkdown(report);
  const comment = markdown.split("\n").find((line) => line.startsWith("<!-- metadata_json "));
  assert.ok(comment);
  assert.equal(comment.match(/-->/g)?.length, 1);
  assert.ok(comment.endsWith(" -->"));

  const prefix = "<!-- metadata_json ";
  const parsed = JSON.parse(comment.slice(prefix.length, -4));
  assert.deepEqual(parsed, report.metadata);
  assert.equal(parsed.brands[0], maliciousBrand);
  assert.equal(parsed.failures[0].message, "failure --> injected");
});

test("Markdown starts with parseable YAML frontmatter and puts machine metadata after it", async () => {
  const report = await runLlmCoverage(baseOptions, {
    ask: async (invocation) => answer(invocation.engine, "Easymailing"),
    sleep: async () => {},
  });
  const markdown = renderCoverageMarkdown(report);
  assert.equal(markdown.slice(0, 4), "---\n");

  const frontmatterEnd = markdown.indexOf("\n---\n", 4);
  assert.ok(frontmatterEnd > 4);
  const entries = Object.fromEntries(markdown.slice(4, frontmatterEnd).trim().split("\n").map((line) => {
    const separator = line.indexOf(":");
    return [line.slice(0, separator), line.slice(separator + 1).trim()];
  }));

  assert.equal(entries.type, "llm-coverage");
  assert.ok(!Number.isNaN(Date.parse(JSON.parse(entries.generated_at))));
  assert.equal(Number(entries.location), 2724);
  assert.equal(JSON.parse(entries.language), "es");
  assert.deepEqual(JSON.parse(entries.engines), ["chatgpt"]);
  assert.deepEqual(JSON.parse(entries.brands), ["easymailing"]);
  assert.equal(entries.status, "success");
  assert.deepEqual(JSON.parse(entries.requested_prompt_counts), { chatgpt: 2 });
  assert.deepEqual(JSON.parse(entries.observed_prompt_counts), { chatgpt: 2 });
  assert.equal(Number(entries.failure_count), 0);
  assert.ok(markdown.indexOf("<!-- metadata_json ") > frontmatterEnd);
});

test("escapes dynamic Markdown headers and TSV headers and values deterministically", async () => {
  const unsafeBrand = "brand|slash\\tab\tline\nbreak";
  const report = await runLlmCoverage({
    ...baseOptions,
    prompts: ["prompt\twith\nline"],
    brands: [unsafeBrand],
  }, {
    ask: async (invocation) => answer(invocation.engine, "no mention"),
    sleep: async () => {},
  });

  const markdown = renderCoverageMarkdown(report);
  const promptHeader = markdown.split("\n").find((line) => line.startsWith("| prompt |"));
  assert.ok(promptHeader?.includes("brand\\|slash\\\\tab line break_engines"));
  assert.equal(promptHeader?.includes("brand|slash"), false);

  const tsv = renderCoverageTsv(report);
  assert.ok(tsv.includes("brand|slash\\\\tab\\tline\\nbreak"));
  assert.ok(tsv.includes("prompt\\twith\\nline"));
  const dataLines = tsv.split("\n");
  assert.ok(dataLines.every((line) => !line.includes("prompt\twith")));
});
