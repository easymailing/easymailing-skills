import type { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { request } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output, formatTable } from "../format.js";
import {
  ENGINE_DEFAULT_MODELS,
  exitCodeForCoverageStatus,
  machineSummaryLine,
  normalizeCoverageEngines,
  renderCoverageJson,
  renderCoverageMarkdown,
  renderCoverageTable,
  renderCoverageTsv,
  runLlmCoverage,
  type LlmAskResult,
} from "../llmCoverage.js";
import { readPromptsFile } from "./_promptsFile.js";

// ===========================================================================
// Shared helpers
// ===========================================================================

function parseFilter(expr: string): [string, string, number | string] {
  const parts = expr.split(",").map((s) => s.trim());
  if (parts.length !== 3) {
    throw new Error(`Invalid --filter expr: "${expr}". Expected "field,op,value".`);
  }
  const [field, op, valueRaw] = parts;
  const asNum = Number(valueRaw);
  const value = !Number.isNaN(asNum) && valueRaw !== "" ? asNum : valueRaw;
  return [field, op, value];
}

function buildFilters(exprs: string[] | undefined): any[] | undefined {
  if (!exprs || exprs.length === 0) return undefined;
  const triples = exprs.map(parseFilter).map(([f, o, v]) => [f, o, v]);
  if (triples.length === 1) return triples[0] as any[];
  const out: any[] = [];
  triples.forEach((t, i) => {
    if (i > 0) out.push("and");
    out.push(t);
  });
  return out;
}

function domainOf(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .toLowerCase();
  }
}

function writeOut(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (dir && dir !== ".") fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
}

function frontmatter(meta: Record<string, any>): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(meta)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((x) => JSON.stringify(x)).join(", ")}]`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

// ===========================================================================
// llm-ask helper (also used by llm-coverage)
// ===========================================================================

const ENGINE_PATHS: Record<string, string> = {
  chatgpt: "/v3/ai_optimization/chat_gpt/llm_responses/live",
  claude: "/v3/ai_optimization/claude/llm_responses/live",
  gemini: "/v3/ai_optimization/gemini/llm_responses/live",
  perplexity: "/v3/ai_optimization/perplexity/llm_responses/live",
};

export interface RunLlmAskOpts {
  engine: string;
  prompt: string;
  model?: string;
  webSearch?: boolean;
  country?: string;
  maxTokens?: number;
  temperature?: number;
  systemMessage?: string;
  forceWebSearch?: boolean;
  useReasoning?: boolean;
  location: number;
  language: string;
  useCache: boolean;
}

export interface RunLlmAskDependencies {
  request?: typeof request;
  cache?: {
    get: typeof get;
    set: typeof set;
  };
}

export async function runLlmAsk(
  opts: RunLlmAskOpts,
  dependencies: RunLlmAskDependencies = {},
): Promise<LlmAskResult> {
  const engine = opts.engine;
  const path = ENGINE_PATHS[engine];
  if (!path) throw new Error(`Unknown engine: ${engine}`);
  const model = opts.model ?? ENGINE_DEFAULT_MODELS[engine];
  const requestFn = dependencies.request ?? request;
  const cacheGet = dependencies.cache?.get ?? get;
  const cacheSet = dependencies.cache?.set ?? set;

  const cacheKey = makeKey("llm-ask", `${engine}:${model}:${opts.prompt}`, opts.location, opts.language);
  if (opts.useCache) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit as LlmAskResult;
  }

  const body: any = {
    user_prompt: opts.prompt,
    model_name: model,
    max_output_tokens: opts.maxTokens ?? 1024,
    web_search: opts.webSearch ?? true,
  };
  // Gemini rejects web_search_country_iso_code; the other engines accept it.
  if (engine !== "gemini") {
    body.web_search_country_iso_code = opts.country ?? "ES";
  }
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.systemMessage) body.system_message = opts.systemMessage.slice(0, 500);
  if (engine === "claude") {
    if (opts.forceWebSearch !== undefined) body.force_web_search = opts.forceWebSearch;
    if (opts.useReasoning !== undefined) body.use_reasoning = opts.useReasoning;
  }

  // path here is full path including /v3 prefix; client adds BASE which is also /v3
  // so we need to drop /v3 from the path
  const apiPath = path.replace(/^\/v3/, "");
  const result = await requestFn(apiPath, [body], {
    fullResponse: true,
    context: { engine, model },
  });
  const first = result?.[0];
  if (!first) throw new Error(`Empty response from ${engine}`);

  const items = first.items ?? [];
  let answer = "";
  const annotations: { title: string; url: string; domain: string }[] = [];
  for (const it of items) {
    if (it.type !== "message") continue;
    const sections = it.sections ?? [];
    for (const sec of sections) {
      if (sec.type === "text") {
        if (sec.text) answer += (answer ? "\n" : "") + sec.text;
        for (const a of sec.annotations ?? []) {
          annotations.push({ title: a.title ?? "", url: a.url ?? "", domain: domainOf(a.url ?? "") });
        }
      }
    }
  }

  const out: LlmAskResult = {
    engine,
    model: first.model_name ?? model,
    money_spent: first.money_spent ?? 0,
    input_tokens: first.input_tokens ?? 0,
    output_tokens: first.output_tokens ?? 0,
    answer,
    annotations,
    fan_out_queries: first.fan_out_queries ?? [],
    web_search: first.web_search ?? !!body.web_search,
  };

  if (opts.useCache) cacheSet(cacheKey, out);
  return out;
}

// ===========================================================================
// Helpers for parsing target files (llm-sov-cross)
// ===========================================================================

interface CrossTarget {
  aggregation_key: string;
  target: any[];
}

function parseTargetsFile(filePath: string): CrossTarget[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Targets file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  // Try JSON first
  if (raw.startsWith("[") || raw.startsWith("{")) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Targets JSON must be an array");
    return parsed as CrossTarget[];
  }
  // Markdown table
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (lines.length < 2) throw new Error("Markdown targets must have header + at least one row");
  // line 0: header, line 1: separator (---), then rows
  const rows: CrossTarget[] = [];
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i].split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length < 3) continue;
    const [key, value, type] = cells;
    if (type === "keyword") {
      rows.push({ aggregation_key: key, target: [{ keyword: value }] });
    } else if (type === "domain") {
      rows.push({ aggregation_key: key, target: [{ domain: value }] });
    }
  }
  return rows;
}

// ===========================================================================
// Command registration
// ===========================================================================

export function registerAiCommands(program: Command): void {
  // -------------------------------------------------------------------------
  // 1) llm-mentions
  // -------------------------------------------------------------------------
  program
    .command("llm-mentions <query>")
    .description("LLM mentions for a keyword or domain (Google AIO / ChatGPT data)")
    .option("--domain", "treat <query> as domain target instead of keyword")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--platform <name>", "google | chat_gpt", "google")
    .option("--search-scope <list>", "comma-separated search scope", "any")
    .option("--match-type <type>", "word_match | partial_match", "word_match")
    .option("--limit <n>", "result limit", "50")
    .option("--include-subdomains", "only with --domain")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (query: string, opts) => {
      try {
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const fmt = getFormat(opts);
        const platform = opts.platform as string;
        const scope = (opts.searchScope as string).split(",").map((s) => s.trim()).filter(Boolean);
        const limit = parseInt(opts.limit);

        const cacheTag = opts.domain ? `domain:${query}` : `kw:${query}:${opts.matchType}`;
        const cacheKey = makeKey("llm-mentions", `${platform}:${cacheTag}:${scope.join(",")}:${limit}`, loc, lang);
        if (opts.cache !== false) {
          const hit = get(cacheKey);
          if (hit) {
            console.log(output(hit as any, fmt));
            return;
          }
        }

        const targetEntry: any = opts.domain
          ? { domain: query, search_scope: scope }
          : { keyword: query, search_scope: scope, match_type: opts.matchType };
        if (opts.domain && opts.includeSubdomains) targetEntry.include_subdomains = true;

        const body: any = {
          target: [targetEntry],
          location_code: loc,
          language_code: lang,
          platform,
          limit,
        };

        const result = await request("/ai_optimization/llm_mentions/search/live", [body], { fullResponse: true });
        const items = (result?.[0]?.items ?? []) as any[];

        const rows = items.map((item) => ({
          question: item.question ?? "",
          answer_excerpt: (item.answer ?? "").toString().slice(0, 200),
          ai_search_volume: item.ai_search_volume ?? "",
          sources_count: item.sources?.length ?? 0,
          source_domains: (item.sources ?? []).map((s: any) => s.domain).filter(Boolean).join("|"),
          brand_entities: (item.brand_entities ?? []).map((b: any) => b.title).filter(Boolean).join("|"),
          last_response_at: item.last_response_at ?? "",
        }));

        set(cacheKey, rows);
        console.log(output(rows as any, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 2) llm-top-domains
  // -------------------------------------------------------------------------
  program
    .command("llm-top-domains <keyword>")
    .description("Top domains cited by LLMs for a keyword")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--platform <name>", "platform", "google")
    .option("--links-scope <type>", "sources | search_results", "sources")
    .option("--items-limit <n>", "items_list_limit (1-10)", "10")
    .option("--internal-limit <n>", "internal_list_limit (1-10)", "5")
    .option("--filter <expr>", "filter expression (repeatable)", (v: string, prev: string[] = []) => prev.concat([v]), [] as string[])
    .option("--out <path>", "write markdown report")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (keyword: string, opts) => {
      try {
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const platform = opts.platform as string;
        const linksScope = opts.linksScope as string;
        const itemsLimit = Math.min(parseInt(opts.itemsLimit), 10);
        const internalLimit = Math.min(parseInt(opts.internalLimit), 10);
        const fmt = getFormat(opts);

        const filters = buildFilters(opts.filter);

        const body: any = {
          target: [{ keyword, search_scope: ["any"] }],
          location_code: loc,
          language_code: lang,
          platform,
          links_scope: linksScope,
          items_list_limit: itemsLimit,
          internal_list_limit: internalLimit,
        };
        if (filters) body.initial_dataset_filters = filters;

        const cacheKey = makeKey(
          "llm-top-domains",
          `${platform}:${keyword}:${linksScope}:${itemsLimit}:${internalLimit}:${JSON.stringify(filters ?? null)}`,
          loc,
          lang,
        );
        let result: any[] | undefined;
        if (opts.cache !== false) {
          const hit = get(cacheKey);
          if (hit) result = hit;
        }
        if (!result) {
          result = await request("/ai_optimization/llm_mentions/top_domains/live", [body], { fullResponse: true });
          set(cacheKey, result);
        }

        const total = result?.[0]?.total ?? {};
        const totalKey = linksScope === "sources" ? "sources_domain" : "search_results_domain";
        const list: any[] = total[totalKey] ?? [];

        const rows = list.map((row) => ({
          domain: row.key ?? row.domain ?? "",
          mentions: row.mentions ?? "",
          ai_search_volume: row.ai_search_volume ?? "",
          impressions: row.impressions ?? "",
        }));

        console.log(output(rows as any, fmt));

        if (opts.out) {
          const md: string[] = [];
          md.push(
            frontmatter({
              type: "llm-cited-domains",
              generated_at: new Date().toISOString(),
              keyword,
              location: loc,
              language: lang,
              platform,
              links_scope: linksScope,
            }),
          );
          md.push("");
          md.push(`| domain | mentions | ai_search_volume | impressions |`);
          md.push(`|---|---|---|---|`);
          for (const r of rows) {
            md.push(`| ${r.domain} | ${r.mentions} | ${r.ai_search_volume} | ${r.impressions} |`);
          }
          md.push("");
          writeOut(opts.out, md.join("\n"));
          console.error(`Wrote ${opts.out}`);
        }
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 3) llm-top-pages
  // -------------------------------------------------------------------------
  program
    .command("llm-top-pages <keyword>")
    .description("Top URLs cited by LLMs for a keyword")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--platform <name>", "platform", "google")
    .option("--links-scope <type>", "sources | search_results", "sources")
    .option("--items-limit <n>", "items_list_limit (1-10)", "10")
    .option("--internal-limit <n>", "internal_list_limit (1-10)", "5")
    .option("--filter <expr>", "filter expression (repeatable)", (v: string, prev: string[] = []) => prev.concat([v]), [] as string[])
    .option("--out <path>", "write markdown report")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (keyword: string, opts) => {
      try {
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const platform = opts.platform as string;
        const linksScope = opts.linksScope as string;
        const itemsLimit = Math.min(parseInt(opts.itemsLimit), 10);
        const internalLimit = Math.min(parseInt(opts.internalLimit), 10);
        const fmt = getFormat(opts);

        const filters = buildFilters(opts.filter);

        const body: any = {
          target: [{ keyword, search_scope: ["any"] }],
          location_code: loc,
          language_code: lang,
          platform,
          links_scope: linksScope,
          items_list_limit: itemsLimit,
          internal_list_limit: internalLimit,
        };
        if (filters) body.initial_dataset_filters = filters;

        const cacheKey = makeKey(
          "llm-top-pages",
          `${platform}:${keyword}:${linksScope}:${itemsLimit}:${internalLimit}:${JSON.stringify(filters ?? null)}`,
          loc,
          lang,
        );
        let result: any[] | undefined;
        if (opts.cache !== false) {
          const hit = get(cacheKey);
          if (hit) result = hit;
        }
        if (!result) {
          result = await request("/ai_optimization/llm_mentions/top_pages/live", [body], { fullResponse: true });
          set(cacheKey, result);
        }

        // top_pages doesn't provide a `total.sources_url` roll-up.
        // Aggregate metrics from each item's `platform[]` array (rolled up across platforms).
        const items = (result?.[0]?.items ?? []) as any[];
        const rows = items.map((it) => {
          const url = it.key ?? "";
          const platforms = it.platform ?? [];
          let mentions = 0;
          let aiSearchVolume = 0;
          let impressions = 0;
          for (const p of platforms) {
            mentions += p.mentions ?? 0;
            aiSearchVolume += p.ai_search_volume ?? 0;
            impressions += p.impressions ?? 0;
          }
          return {
            url,
            domain: domainOf(url),
            mentions,
            ai_search_volume: aiSearchVolume,
            impressions,
          };
        });

        console.log(output(rows as any, fmt));

        if (opts.out) {
          const md: string[] = [];
          md.push(
            frontmatter({
              type: "llm-cited-pages",
              generated_at: new Date().toISOString(),
              keyword,
              location: loc,
              language: lang,
              platform,
              links_scope: linksScope,
            }),
          );
          md.push("");
          md.push(`| url | domain | mentions | ai_search_volume | impressions |`);
          md.push(`|---|---|---|---|---|`);
          for (const r of rows) {
            md.push(`| ${r.url} | ${r.domain} | ${r.mentions} | ${r.ai_search_volume} | ${r.impressions} |`);
          }
          md.push("");
          writeOut(opts.out, md.join("\n"));
          console.error(`Wrote ${opts.out}`);
        }
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 4) llm-sov-cross
  // -------------------------------------------------------------------------
  program
    .command("llm-sov-cross")
    .description("Share of Voice across 2-10 brands (cross_aggregated_metrics)")
    .requiredOption("--targets <file>", "JSON or markdown file with targets")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--platform <name>", "platform", "google")
    .option("--internal-limit <n>", "internal_list_limit", "10")
    .option("--out <path>", "write markdown report")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (opts) => {
      try {
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const platform = opts.platform as string;
        const internalLimit = parseInt(opts.internalLimit);
        const fmt = getFormat(opts);

        const targets = parseTargetsFile(opts.targets);
        if (targets.length < 2 || targets.length > 10) {
          throw new Error(`Must provide between 2 and 10 targets (got ${targets.length}).`);
        }

        const body: any = {
          targets,
          location_code: loc,
          language_code: lang,
          platform,
          internal_list_limit: internalLimit,
        };

        const cacheKey = makeKey(
          "llm-sov-cross",
          `${platform}:${JSON.stringify(targets)}:${internalLimit}`,
          loc,
          lang,
        );
        let result: any[] | undefined;
        if (opts.cache !== false) {
          const hit = get(cacheKey);
          if (hit) result = hit;
        }
        if (!result) {
          result = await request(
            "/ai_optimization/llm_mentions/cross_aggregated_metrics/live",
            [body],
            { fullResponse: true },
          );
          set(cacheKey, result);
        }

        const items = (result?.[0]?.items ?? []) as any[];

        const rows = items.map((item) => {
          // Sum across platform entries
          const platforms = item.platform ?? [];
          let mentions = 0;
          let aiSearchVolume = 0;
          let impressions = 0;
          for (const p of platforms) {
            mentions += p.mentions ?? 0;
            aiSearchVolume += p.ai_search_volume ?? 0;
            impressions += p.impressions ?? 0;
          }
          const topSources = (item.sources_domain ?? [])
            .slice(0, 3)
            .map((s: any) => s.key ?? s.domain)
            .filter(Boolean)
            .join("|");
          return {
            brand: item.key ?? "",
            mentions,
            ai_search_volume: aiSearchVolume,
            impressions,
            sources_top: topSources,
          };
        });

        console.log(output(rows as any, fmt));

        if (opts.out) {
          const md: string[] = [];
          md.push(
            frontmatter({
              type: "llm-sov-cross",
              generated_at: new Date().toISOString(),
              location: loc,
              language: lang,
              platform,
              brands_tracked: rows.map((r) => r.brand),
            }),
          );
          md.push("");
          md.push("## Share of Voice agregado (Google AIO)");
          md.push("");
          md.push(`| Brand | Mentions | AI search volume | Impressions | Top sources |`);
          md.push(`|---|---|---|---|---|`);
          for (const r of rows) {
            md.push(`| ${r.brand} | ${r.mentions} | ${r.ai_search_volume} | ${r.impressions} | ${r.sources_top} |`);
          }
          md.push("");
          writeOut(opts.out, md.join("\n"));
          console.error(`Wrote ${opts.out}`);
        }
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 5) llm-aggregated
  // -------------------------------------------------------------------------
  program
    .command("llm-aggregated <query>")
    .description("Aggregated metrics for a keyword/domain across all dimensions")
    .option("--domain", "treat <query> as domain target")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--platform <name>", "platform", "google")
    .option("--search-scope <list>", "comma-separated", "any")
    .option("--match-type <type>", "word_match | partial_match", "word_match")
    .option("--internal-limit <n>", "internal_list_limit", "10")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (query: string, opts) => {
      try {
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const platform = opts.platform as string;
        const scope = (opts.searchScope as string).split(",").map((s) => s.trim()).filter(Boolean);
        const fmt = getFormat(opts);

        const targetEntry: any = opts.domain
          ? { domain: query, search_scope: scope }
          : { keyword: query, search_scope: scope, match_type: opts.matchType };
        const body: any = {
          target: [targetEntry],
          location_code: loc,
          language_code: lang,
          platform,
          internal_list_limit: parseInt(opts.internalLimit),
        };

        const cacheKey = makeKey(
          "llm-aggregated",
          `${platform}:${opts.domain ? "d" : "k"}:${query}:${scope.join(",")}`,
          loc,
          lang,
        );
        let result: any[] | undefined;
        if (opts.cache !== false) {
          const hit = get(cacheKey);
          if (hit) result = hit;
        }
        if (!result) {
          result = await request(
            "/ai_optimization/llm_mentions/aggregated_metrics/live",
            [body],
            { fullResponse: true },
          );
          set(cacheKey, result);
        }

        const total = result?.[0]?.total ?? {};

        if (fmt === "json") {
          console.log(JSON.stringify(total, null, 2));
          return;
        }

        // Build sections
        const sections: { title: string; rows: any[] }[] = [];
        const section = (title: string, arr: any[] | undefined, take: number, mapper: (r: any) => any) => {
          if (!arr || arr.length === 0) return;
          sections.push({ title, rows: arr.slice(0, take).map(mapper) });
        };
        section("location", total.location, 50, (r) => ({ location: r.key, mentions: r.mentions, ai_search_volume: r.ai_search_volume, impressions: r.impressions }));
        section("language", total.language, 50, (r) => ({ language: r.key, mentions: r.mentions, ai_search_volume: r.ai_search_volume, impressions: r.impressions }));
        section("platform", total.platform, 50, (r) => ({ platform: r.key, mentions: r.mentions, ai_search_volume: r.ai_search_volume, impressions: r.impressions }));
        section("sources_domain (top 10)", total.sources_domain, 10, (r) => ({ domain: r.key, mentions: r.mentions, ai_search_volume: r.ai_search_volume, impressions: r.impressions }));
        section("search_results_domain (top 10)", total.search_results_domain, 10, (r) => ({ domain: r.key, mentions: r.mentions, ai_search_volume: r.ai_search_volume, impressions: r.impressions }));
        section("brand_entities_title (top 10)", total.brand_entities_title, 10, (r) => ({ title: r.key, mentions: r.mentions, ai_search_volume: r.ai_search_volume, impressions: r.impressions }));
        section("brand_entities_category (top 5)", total.brand_entities_category, 5, (r) => ({ category: r.key, mentions: r.mentions, ai_search_volume: r.ai_search_volume, impressions: r.impressions }));

        if (sections.length === 0) {
          console.log("No data.");
          return;
        }

        const blocks: string[] = [];
        for (const s of sections) {
          blocks.push(`# ${s.title}`);
          blocks.push(fmt === "table" ? formatTable(s.rows) : output(s.rows, fmt));
          blocks.push("");
        }
        console.log(blocks.join("\n"));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 6) llm-ask
  // -------------------------------------------------------------------------
  program
    .command("llm-ask <prompt>")
    .description("Ask a prompt directly to ChatGPT/Claude/Gemini/Perplexity")
    .requiredOption("--engine <name>", "chatgpt | claude | gemini | perplexity")
    .option("--model <name>", "override default model for engine")
    .option("--web-search", "enable web search (default true)")
    .option("--no-web-search", "disable web search")
    .option("--country <iso>", "web search country", "ES")
    .option("--max-tokens <n>", "max output tokens", "1024")
    .option("--temperature <f>", "temperature")
    .option("--system-message <text>", "system prompt (max 500 chars)")
    .option("--force-web-search", "claude-only: force web search")
    .option("--use-reasoning", "claude-only: enable reasoning")
    .option("-l, --location <code>", "location code (cache only)", "2724")
    .option("--language <code>", "language code (cache only)", "es")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (prompt: string, opts) => {
      try {
        const engine = opts.engine as string;
        if (!ENGINE_PATHS[engine]) throw new Error(`Unknown engine: ${engine}`);
        const fmt = getFormat(opts);

        const res = await runLlmAsk({
          engine,
          prompt,
          model: opts.model,
          webSearch: opts.webSearch,
          country: opts.country,
          maxTokens: opts.maxTokens ? parseInt(opts.maxTokens) : undefined,
          temperature: opts.temperature !== undefined ? parseFloat(opts.temperature) : undefined,
          systemMessage: opts.systemMessage,
          forceWebSearch: opts.forceWebSearch,
          useReasoning: opts.useReasoning,
          location: parseInt(opts.location),
          language: opts.language,
          useCache: opts.cache !== false,
        });

        if (fmt === "json") {
          console.log(JSON.stringify({
            engine: res.engine,
            model: res.model,
            money_spent: res.money_spent,
            answer: res.answer,
            annotations: res.annotations,
            fan_out_queries: res.fan_out_queries,
            input_tokens: res.input_tokens,
            output_tokens: res.output_tokens,
          }, null, 2));
          return;
        }

        const row = {
          engine: res.engine,
          model: res.model,
          money_spent: res.money_spent,
          input_tokens: res.input_tokens,
          output_tokens: res.output_tokens,
          answer_excerpt: res.answer.slice(0, 300),
          sources_count: res.annotations.length,
          source_domains: Array.from(new Set(res.annotations.map((a) => a.domain).filter(Boolean))).join("|"),
          fan_out_count: res.fan_out_queries.length,
        };
        console.log(output([row], fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 7) llm-scrape
  // -------------------------------------------------------------------------
  program
    .command("llm-scrape <keyword>")
    .description("Scrape ChatGPT/Gemini UI for a keyword")
    .requiredOption("--engine <name>", "chatgpt | gemini")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--force-web-search", "force web search")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (keyword: string, opts) => {
      try {
        const engine = opts.engine as string;
        const fmt = getFormat(opts);
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        let apiPath: string;
        if (engine === "chatgpt") apiPath = "/ai_optimization/chat_gpt/llm_scraper/live/advanced";
        else if (engine === "gemini") apiPath = "/ai_optimization/gemini/llm_scraper/live/advanced";
        else throw new Error(`Unknown engine for scrape: ${engine}`);

        const body: any = {
          keyword,
          location_code: loc,
          language_code: lang,
        };
        // Gemini scraper rejects force_web_search; only send it to chatgpt.
        if (engine === "chatgpt") {
          body.force_web_search = !!opts.forceWebSearch;
        }

        const cacheKey = makeKey("llm-scrape", `${engine}:${keyword}:${body.force_web_search}`, loc, lang);
        let result: any[] | undefined;
        if (opts.cache !== false) {
          const hit = get(cacheKey);
          if (hit) result = hit;
        }
        if (!result) {
          result = await request(apiPath, [body], { fullResponse: true });
          set(cacheKey, result);
        }

        const first = result?.[0] ?? {};

        if (fmt === "json") {
          // trim long text fields
          const trim = (obj: any): any => {
            if (Array.isArray(obj)) return obj.map(trim);
            if (obj && typeof obj === "object") {
              const out: any = {};
              for (const [k, v] of Object.entries(obj)) {
                if (typeof v === "string" && v.length > 500) out[k] = v.slice(0, 500) + "…";
                else out[k] = trim(v);
              }
              return out;
            }
            return obj;
          };
          console.log(JSON.stringify(trim(first), null, 2));
          return;
        }

        const sources = (first.sources ?? []) as any[];
        const rows = sources.map((s, i) => ({
          rank: s.position ?? i + 1,
          title: s.title ?? "",
          domain: s.domain ?? domainOf(s.url ?? ""),
          url: s.url ?? "",
        }));
        console.log(output(rows as any, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 8) ai-volume
  // -------------------------------------------------------------------------
  program
    .command("ai-volume <keywords...>")
    .description("AI search volume for 1-1000 keywords")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (keywords: string[], opts) => {
      try {
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const fmt = getFormat(opts);

        if (keywords.length < 1 || keywords.length > 1000) {
          throw new Error(`Must provide 1-1000 keywords (got ${keywords.length})`);
        }

        const body: any = {
          keywords,
          location_code: loc,
          language_code: lang,
        };

        const cacheKey = makeKey("ai-volume", keywords.slice().sort().join("|"), loc, lang);
        let result: any[] | undefined;
        if (opts.cache !== false) {
          const hit = get(cacheKey);
          if (hit) result = hit;
        }
        if (!result) {
          result = await request(
            "/ai_optimization/ai_keyword_data/keywords_search_volume/live",
            [body],
            { fullResponse: true },
          );
          set(cacheKey, result);
        }

        const items = (result?.[0]?.items ?? []) as any[];
        const rows = items.map((it) => {
          const monthly = it.ai_monthly_searches ?? [];
          const recent = monthly.slice(0, 12);
          const avg = recent.length > 0
            ? Math.round(
                recent.reduce((s: number, r: any) => s + (r.ai_search_volume ?? r.search_volume ?? 0), 0) /
                  recent.length,
              )
            : "";
          return {
            keyword: it.keyword ?? "",
            ai_search_volume: it.ai_search_volume ?? "",
            latest_monthly: monthly?.[0]?.ai_search_volume ?? monthly?.[0]?.search_volume ?? "",
            trend_12mo_avg: avg,
          };
        });

        console.log(output(rows as any, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 9) llm-coverage
  // -------------------------------------------------------------------------
  program
    .command("llm-coverage <prompts-file>")
    .description("Coverage of brands across prompts × engines")
    .requiredOption("--brands <list>", "comma-separated brand list")
    .option("--engines <list>", "comma-separated engines", "chatgpt,claude,gemini,perplexity")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--country <iso>", "web search country", "ES")
    .option("--max-tokens <n>", "max tokens per request", "1024")
    .option("--yes", "skip cost guard")
    .option("--out <path>", "write markdown report")
    .option("--concurrency <n>", "parallel post-probe llm-ask workers", "8")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (promptsFile: string, opts) => {
      try {
        const { prompts } = readPromptsFile(promptsFile);
        if (prompts.length < 1) {
          console.error("No prompts in file:", promptsFile);
          process.exit(1);
        }
        const brands = (opts.brands as string).split(",").map((b) => b.trim().toLowerCase()).filter(Boolean);
        if (brands.length === 0) {
          console.error("--brands is required");
          process.exit(1);
        }
        const engines = normalizeCoverageEngines((opts.engines as string).split(","));
        for (const e of engines) {
          if (!ENGINE_PATHS[e]) throw new Error(`Unknown engine: ${e}`);
        }

        const totalCalls = prompts.length * engines.length;
        if (totalCalls > 20 && !opts.yes) {
          const estCost = (totalCalls * 0.04).toFixed(2);
          console.error(
            `Cost guard: ${prompts.length} prompts × ${engines.length} engines = ${totalCalls} calls ≈ $${estCost}. Pass --yes to proceed.`,
          );
          process.exit(1);
        }

        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const country = opts.country as string;
        const maxTokens = parseInt(opts.maxTokens);
        const useCache = opts.cache !== false;
        const fmt = getFormat(opts);
        console.error(`Running ${totalCalls} requested llm-coverage cells with per-engine probes...`);
        const report = await runLlmCoverage({
          prompts,
          brands,
          engines,
          location: loc,
          language: lang,
          country,
          maxTokens,
          maxRetries: 2,
          useCache,
          concurrency: parseInt(opts.concurrency ?? "8"),
        }, { ask: runLlmAsk });

        if (fmt === "json") console.log(renderCoverageJson(report));
        else if (fmt === "table") console.log(renderCoverageTable(report));
        else console.log(renderCoverageTsv(report));

        if (opts.out) {
          writeOut(opts.out, renderCoverageMarkdown(report));
          console.error(`Wrote ${opts.out}`);
        }

        console.error(machineSummaryLine(report.machine_summary));
        process.exitCode = exitCodeForCoverageStatus(report.status);
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // -------------------------------------------------------------------------
  // 10) llm-discover-prompts — descubre preguntas reales donde competidores aparecen
  // -------------------------------------------------------------------------
  program
    .command("llm-discover-prompts")
    .description("Descubre las preguntas reales donde los competidores aparecen como brand entity o en sources")
    .requiredOption("--competitors <file>", "markdown/json con competidores (formato targets-geo.md)")
    .option("--our-brand <name>", "tu brand para filtrar preguntas donde ya apareces", "easymailing")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--platform <name>", "platform", "google")
    .option("--per-competitor-limit <n>", "items por competidor (max 100)", "50")
    .option("--min-volume <n>", "filtrar preguntas con ai_search_volume <", "100")
    .option("--out <path>", "write markdown to this file")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (opts) => {
      try {
        const competitors = parseTargetsFile(opts.competitors);
        if (competitors.length === 0) {
          console.error("No competitors found in", opts.competitors);
          process.exit(1);
        }
        const ourBrand = (opts.ourBrand as string).toLowerCase();
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const platform = opts.platform as string;
        const perCompLimit = Math.min(parseInt(opts.perCompetitorLimit), 100);
        const minVolume = parseInt(opts.minVolume);
        const fmt = getFormat(opts);

        // Skip our brand itself if it appears in the file
        const compTargets = competitors.filter((c) => c.aggregation_key.toLowerCase() !== ourBrand);

        // Aggregate by question text
        interface QRow {
          question: string;
          ai_search_volume: number;
          competitors_present: Set<string>;
          sources: Set<string>;
          brand_entities: Set<string>;
          our_brand_present: boolean;
        }
        const agg: Map<string, QRow> = new Map();

        console.error(`Querying ${compTargets.length} competitors × up to ${perCompLimit} items each...`);

        for (const comp of compTargets) {
          const compKey = comp.aggregation_key.toLowerCase();
          const target0 = comp.target[0] ?? {};
          // Use whatever the target file provided (keyword or domain). For keywords, search_scope must be
          // ["any" | "question" | "answer" | "brand_entities" | "fan_out_queries"]; we use brand_entities + answer.
          // For domains, search_scope is "sources" (cited as source).
          const isKeyword = "keyword" in target0;
          const searchScope = isKeyword ? ["brand_entities", "answer"] : ["sources"];
          const body: any = {
            target: [{ ...target0, search_scope: searchScope }],
            location_code: loc,
            language_code: lang,
            platform,
            limit: perCompLimit,
            initial_dataset_filters: [["ai_search_volume", ">=", minVolume]],
          };

          const cacheKey = makeKey(
            "llm-discover-prompts",
            `${platform}:${compKey}:${perCompLimit}:${minVolume}`,
            loc,
            lang,
          );
          let result: any[] | undefined;
          if (opts.cache !== false) {
            const hit = get(cacheKey);
            if (hit) result = hit;
          }
          if (!result) {
            try {
              result = await request("/ai_optimization/llm_mentions/search/live", [body], { fullResponse: true });
              set(cacheKey, result);
            } catch (e: any) {
              console.error(`[${compKey}] failed: ${e.message}`);
              continue;
            }
          }
          const items: any[] = result?.[0]?.items ?? [];
          for (const it of items) {
            const q = (it.question ?? "").trim();
            if (!q) continue;
            const vol = Number(it.ai_search_volume ?? 0);
            const sources: string[] = (it.sources ?? []).map((s: any) => s.domain).filter(Boolean);
            const brandEntities: string[] = (it.brand_entities ?? []).map((b: any) => b.title).filter(Boolean);
            const ourPresent =
              sources.some((d) => d.toLowerCase().includes(ourBrand)) ||
              brandEntities.some((b) => b.toLowerCase().includes(ourBrand)) ||
              (it.answer ?? "").toLowerCase().includes(ourBrand);

            const existing = agg.get(q);
            if (existing) {
              existing.competitors_present.add(compKey);
              sources.forEach((s) => existing.sources.add(s.toLowerCase()));
              brandEntities.forEach((b) => existing.brand_entities.add(b));
              existing.our_brand_present = existing.our_brand_present || ourPresent;
              // keep max ai_search_volume seen
              if (vol > existing.ai_search_volume) existing.ai_search_volume = vol;
            } else {
              agg.set(q, {
                question: q,
                ai_search_volume: vol,
                competitors_present: new Set([compKey]),
                sources: new Set(sources.map((s) => s.toLowerCase())),
                brand_entities: new Set(brandEntities),
                our_brand_present: ourPresent,
              });
            }
          }
        }

        // To array, sort by ai_search_volume desc
        const all = Array.from(agg.values()).sort((a, b) => b.ai_search_volume - a.ai_search_volume);
        const opportunities = all.filter((r) => !r.our_brand_present);
        const defenders = all.filter((r) => r.our_brand_present);

        const rows = opportunities.map((r) => ({
          question: r.question.slice(0, 120),
          ai_search_volume: r.ai_search_volume,
          competitors_present: Array.from(r.competitors_present).sort().join(","),
          top_sources: Array.from(r.sources).slice(0, 3).join("|"),
        }));

        console.log(output(rows as any, fmt));

        if (opts.out) {
          const lines: string[] = [];
          lines.push(
            frontmatter({
              type: "prompts-discovered-llms",
              generated_at: new Date().toISOString(),
              location: loc,
              language: lang,
              platform,
              competitors_queried: compTargets.length,
              questions_total: all.length,
              opportunities: opportunities.length,
              defenders: defenders.length,
              min_volume: minVolume,
            }),
          );
          lines.push("");
          lines.push("## Oportunidad: preguntas donde competidores aparecen y nosotros NO");
          lines.push("");
          lines.push("| Volumen | Pregunta | Competidores presentes | Top sources |");
          lines.push("|---:|---|---|---|");
          for (const r of opportunities) {
            const q = r.question.replace(/\|/g, "\\|").slice(0, 150);
            lines.push(
              `| ${r.ai_search_volume} | ${q} | ${Array.from(r.competitors_present).sort().join(", ")} | ${Array.from(r.sources).slice(0, 3).join(" · ")} |`,
            );
          }
          lines.push("");
          lines.push("## Defender: preguntas donde ya aparecemos (no perder posición)");
          lines.push("");
          lines.push("| Volumen | Pregunta | Competidores presentes | Top sources |");
          lines.push("|---:|---|---|---|");
          for (const r of defenders) {
            const q = r.question.replace(/\|/g, "\\|").slice(0, 150);
            lines.push(
              `| ${r.ai_search_volume} | ${q} | ${Array.from(r.competitors_present).sort().join(", ")} | ${Array.from(r.sources).slice(0, 3).join(" · ")} |`,
            );
          }
          lines.push("");
          writeOut(opts.out, lines.join("\n"));
          console.error(`Wrote ${opts.out} — ${opportunities.length} oportunidades, ${defenders.length} defender`);
        }
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });
}
