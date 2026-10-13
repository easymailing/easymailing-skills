import type { Command } from "commander";
import { request, extractItems } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output, round2 } from "../format.js";

export function registerContentCommands(program: Command): void {
  // --- mentions ---
  program
    .command("mentions <keyword>")
    .description("Search for online mentions of a keyword via Content Analysis")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("-n, --limit <n>", "max results", "50")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (keyword: string, opts) => {
      try {
        const limit = parseInt(opts.limit);
        const fmt = getFormat(opts);
        const loc = parseInt(opts.location);
        const lang = opts.language as string;

        const cacheKey = makeKey("mentions", `${keyword}:${limit}`, loc, lang);
        const hit = opts.cache ? get(cacheKey) : null;

        let rows: any[];
        if (hit) {
          rows = hit;
        } else {
          const result = await request(
            "/content_analysis/search/live",
            [{ keyword, location_name: "Spain", language_name: "Spanish", limit }]
          );
          const items = extractItems(result);
          rows = items.map((item: any) => ({
            title: item.title,
            url: item.url,
            domain: item.domain,
            sentiment: item.sentiment,
            date: item.date_published,
          }));

          set(cacheKey, rows);
        }

        console.log(output(rows, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // --- sentiment ---
  program
    .command("sentiment <keyword>")
    .description("Get sentiment analysis for a keyword via Content Analysis")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("-n, --limit <n>", "max results", "50")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (keyword: string, opts) => {
      try {
        const limit = parseInt(opts.limit);
        const fmt = getFormat(opts);
        const loc = parseInt(opts.location);
        const lang = opts.language as string;

        const cacheKey = makeKey("sentiment", `${keyword}:${limit}`, loc, lang);
        const hit = opts.cache ? get(cacheKey) : null;

        let rows: any[];
        if (hit) {
          rows = hit;
        } else {
          const result = await request(
            "/content_analysis/sentiment_analysis/live",
            [{ keyword, location_name: "Spain", language_name: "Spanish", limit }]
          );
          const items = extractItems(result);
          rows = items.map((item: any) => ({
            sentiment: item.sentiment_connotation,
            score: round2(item.sentiment_score ?? 0),
            mentions: item.mention_count,
          }));

          set(cacheKey, rows);
        }

        console.log(output(rows, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });
}
