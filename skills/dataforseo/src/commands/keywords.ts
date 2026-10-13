import type { Command } from "commander";
import { request, extractItems } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output, round2 } from "../format.js";

// .ai returns monthly_searches as {"YYYY-MM": value}, regular as [{year,month,search_volume}]
function parseTrend(ms: any): string {
  if (!ms) return "";
  if (typeof ms === "object" && !Array.isArray(ms)) {
    return Object.values(ms).join(",");
  }
  if (Array.isArray(ms)) {
    return ms.map((m: any) => m.search_volume).join(",");
  }
  return "";
}

function parseMonths(ms: any): string {
  if (!ms) return "";
  if (typeof ms === "object" && !Array.isArray(ms)) {
    return Object.entries(ms).map(([k, v]) => `${k}:${v}`).join(",");
  }
  if (Array.isArray(ms)) {
    return ms.map((m: any) => `${m.year}-${String(m.month).padStart(2, "0")}:${m.search_volume}`).join(",");
  }
  return "";
}

function commonOpts(cmd: Command): Command {
  return cmd
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("-n, --limit <n>", "max results", "50")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--human", "output as human-readable table")
    .option("--no-cache", "skip cache");
}

export function registerKeywordCommands(program: Command): void {
  // --- volume ---
  commonOpts(
    program
      .command("volume <keywords...>")
      .description("Get search volume, CPC, difficulty and trends for keywords")
  ).action(async (keywords: string[], opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const fmt = getFormat(opts);

      // Check cache per keyword
      const cached: Record<string, any> = {};
      const uncached: string[] = [];

      for (const kw of keywords) {
        const key = makeKey("volume", kw, loc, lang);
        const hit = opts.cache ? get(key) : null;
        if (hit) {
          cached[kw] = hit;
        } else {
          uncached.push(kw);
        }
      }

      // Fetch uncached keywords
      let volumeMap: Record<string, any> = {};
      let difficultyMap: Record<string, number> = {};

      if (uncached.length > 0) {
        const volResult = await request(
          "/keywords_data/google_ads/search_volume/live",
          [{ keywords: uncached, location_code: loc, language_code: lang }]
        );
        const volItems = extractItems(volResult);
        for (const item of volItems) {
          const trend = parseTrend(item.monthly_searches);
          volumeMap[item.keyword] = {
            keyword: item.keyword,
            volume: item.search_volume,
            cpc: round2(item.cpc ?? 0),
            difficulty: null,
            competition: item.competition,
            trend,
          };
        }

        // Difficulty is optional
        try {
          const diffResult = await request(
            "/dataforseo_labs/google/bulk_keyword_difficulty/live",
            [{ keywords: uncached, location_code: loc, language_code: lang }]
          );
          const diffItems = extractItems(diffResult);
          for (const item of diffItems) {
            difficultyMap[item.keyword] = item.keyword_difficulty;
          }
        } catch {
          // difficulty is optional, ignore errors
        }

        // Merge difficulty into volume results and cache individually
        for (const kw of uncached) {
          if (volumeMap[kw]) {
            volumeMap[kw].difficulty = difficultyMap[kw] ?? null;
            const key = makeKey("volume", kw, loc, lang);
            set(key, volumeMap[kw]);
          }
        }
      }

      // Combine cached + fetched
      const rows = keywords.map(
        (kw) => cached[kw] ?? volumeMap[kw] ?? { keyword: kw, volume: null, cpc: null, difficulty: null, competition: null, trend: "" }
      );

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- related ---
  commonOpts(
    program
      .command("related <seed>")
      .description("Get related keyword suggestions for a seed keyword")
  ).action(async (seed: string, opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const limit = parseInt(opts.limit);
      const fmt = getFormat(opts);

      const cacheKey = makeKey("related", `${seed}:${limit}`, loc, lang);
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/dataforseo_labs/google/keyword_suggestions/live",
          [{ keyword: seed, location_code: loc, language_code: lang, limit, include_seed_keyword: false }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          keyword: item.keyword,
          volume: item.keyword_info?.search_volume,
          cpc: round2(item.keyword_info?.cpc ?? 0),
          difficulty: item.keyword_properties?.keyword_difficulty,
          competition: item.keyword_info?.competition_level ?? item.keyword_info?.competition,
        }));

        // Cache entire result
        set(cacheKey, rows);

        // Cross-populate volume cache
        for (const row of rows) {
          const volKey = makeKey("volume", row.keyword, loc, lang);
          set(volKey, { ...row, trend: "" });
        }
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- ideas ---
  commonOpts(
    program
      .command("ideas <keywords...>")
      .description("Get keyword ideas from seed keywords")
  ).action(async (keywords: string[], opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const limit = parseInt(opts.limit);
      const fmt = getFormat(opts);

      const result = await request(
        "/dataforseo_labs/google/keyword_ideas/live",
        [{ keywords, location_code: loc, language_code: lang, limit }]
      );
      const items = extractItems(result);
      const rows = items.map((item: any) => ({
        keyword: item.keyword,
        volume: item.keyword_info?.search_volume,
        cpc: round2(item.keyword_info?.cpc ?? 0),
        difficulty: item.keyword_properties?.keyword_difficulty,
        competition: item.keyword_info?.competition_level ?? item.keyword_info?.competition,
      }));

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- intent ---
  commonOpts(
    program
      .command("intent <keywords...>")
      .description("Get search intent classification for keywords")
  ).action(async (keywords: string[], opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const fmt = getFormat(opts);

      const result = await request(
        "/dataforseo_labs/google/search_intent/live",
        [{ keywords, location_code: loc, language_code: lang }]
      );
      const items = extractItems(result);
      const rows = items.map((item: any) => ({
        keyword: item.keyword,
        intent: item.keyword_intent?.label,
        probability: item.keyword_intent?.probability,
      }));

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- difficulty ---
  commonOpts(
    program
      .command("difficulty <keywords...>")
      .description("Get bulk keyword difficulty scores")
  ).action(async (keywords: string[], opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const fmt = getFormat(opts);

      const result = await request(
        "/dataforseo_labs/google/bulk_keyword_difficulty/live",
        [{ keywords, location_code: loc, language_code: lang }]
      );
      const items = extractItems(result);
      const rows = items.map((item: any) => ({
        keyword: item.keyword,
        difficulty: item.keyword_difficulty,
      }));

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- history ---
  commonOpts(
    program
      .command("history <keywords...>")
      .description("Get historical monthly search volume for keywords")
  ).action(async (keywords: string[], opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const fmt = getFormat(opts);

      const result = await request(
        "/dataforseo_labs/google/historical_search_volume/live",
        [{ keywords, location_code: loc, language_code: lang }]
      );
      const items = extractItems(result);
      const rows = items.map((item: any) => ({
        keyword: item.keyword,
        months: parseMonths(item.monthly_searches),
      }));

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });
}
