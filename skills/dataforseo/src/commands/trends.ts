import type { Command } from "commander";
import { request, extractItems } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output, round2 } from "../format.js";

export function registerTrendsCommands(program: Command): void {
  // --- trends ---
  program
    .command("trends <keywords...>")
    .description("Get Google Trends data for up to 5 keywords")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--time-range <range>", "time range", "past_12_months")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (keywords: string[], opts) => {
      try {
        if (keywords.length > 5) {
          console.error("Error: maximum 5 keywords allowed");
          process.exit(1);
        }

        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const timeRange = opts.timeRange as string;
        const fmt = getFormat(opts);

        const cacheKey = makeKey("trends", keywords.join(","), loc, lang);
        const hit = opts.cache ? get(cacheKey) : null;

        let rows: any[];
        if (hit) {
          rows = hit;
        } else {
          const result = await request(
            "/keywords_data/google_trends/explore/live",
            [{ keywords, location_code: loc, language_code: lang, time_range: timeRange }]
          );
          const items = extractItems(result);
          rows = items.map((item: any) => ({
            keyword: item.keyword ?? item.query,
            avg_index: item.avg_index ?? item.average_index ?? round2(
              ((item.values ?? item.data ?? []) as any[])
                .reduce((sum: number, v: any) => sum + (v.value ?? v.index ?? 0), 0) /
                Math.max(((item.values ?? item.data ?? []) as any[]).length, 1)
            ),
          }));

          if (rows.length === 0 && result?.[0]) {
            // Fallback: try to extract from top-level result structure
            rows = keywords.map((kw) => ({
              keyword: kw,
              avg_index: null,
            }));
          }

          set(cacheKey, rows);
        }

        console.log(output(rows, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // --- trending ---
  program
    .command("trending")
    .description("Get currently trending topics from Google Trends")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .action(async (opts) => {
      try {
        const loc = parseInt(opts.location);
        const lang = opts.language as string;
        const fmt = getFormat(opts);

        const result = await request(
          "/keywords_data/google_trends/explore/live",
          [{ keywords: [""], type: "trending", location_code: loc, language_code: lang }]
        );
        const items = extractItems(result);

        if (items.length === 0) {
          console.log("Use DataForSEO dashboard for trending topics");
          return;
        }

        const rows = items.map((item: any) => ({
          keyword: item.keyword ?? item.query ?? item.title,
          traffic: item.traffic ?? item.search_volume ?? null,
        }));

        console.log(output(rows, fmt));
      } catch {
        console.log("Use DataForSEO dashboard for trending topics");
      }
    });
}
