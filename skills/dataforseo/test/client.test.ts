import assert from "node:assert/strict";
import test from "node:test";
import { DataForSeoError, request } from "../src/client.js";

test("client throws a typed DataForSEO task error with field, engine, and model", async () => {
  const transport = async () => new Response(JSON.stringify({
    status_code: 20000,
    tasks: [{
      status_code: 40501,
      status_message: "Invalid Field: 'model_name'.",
    }],
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  await assert.rejects(
    request("/ai_optimization/claude/llm_responses/live", [{}], {
      fullResponse: true,
      transport,
      context: { engine: "claude", model: "claude-sonnet-4-0" },
    }),
    (error: unknown) => {
      assert.ok(error instanceof DataForSeoError);
      assert.equal(error.httpStatus, 200);
      assert.equal(error.statusCode, 40501);
      assert.equal(error.statusMessage, "Invalid Field: 'model_name'.");
      assert.equal(error.field, "model_name");
      assert.equal(error.engine, "claude");
      assert.equal(error.model, "claude-sonnet-4-0");
      return true;
    },
  );
});

test("client wraps transport failures without losing engine and model context", async () => {
  const transport = async (): Promise<Response> => {
    const error = new Error("fetch failed") as Error & { code?: string };
    error.code = "ETIMEDOUT";
    throw error;
  };

  await assert.rejects(
    request("/ai_optimization/chat_gpt/llm_responses/live", [{}], {
      fullResponse: true,
      transport,
      context: { engine: "chatgpt", model: "gpt-4o-mini" },
    }),
    (error: unknown) => {
      assert.ok(error instanceof DataForSeoError);
      assert.equal(error.engine, "chatgpt");
      assert.equal(error.model, "gpt-4o-mini");
      assert.equal(error.causeCode, "ETIMEDOUT");
      return true;
    },
  );
});

test("client preserves a nested Node fetch cause code", async () => {
  const transport = async (): Promise<Response> => {
    throw new TypeError("fetch failed", { cause: { code: "ETIMEDOUT" } });
  };

  await assert.rejects(
    request("/ai_optimization/chat_gpt/llm_responses/live", [{}], {
      fullResponse: true,
      transport,
      context: { engine: "chatgpt", model: "gpt-4o-mini" },
    }),
    (error: unknown) => {
      assert.ok(error instanceof DataForSeoError);
      assert.equal(error.causeCode, "ETIMEDOUT");
      return true;
    },
  );
});
