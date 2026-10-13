import type { Command } from "commander";
import { request, extractItems } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output } from "../format.js";

function commonOpts(cmd: Command): Command {
  return cmd
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--device <type>", "device type", "desktop")
    .option("--depth <n>", "number of results", "100")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--human", "output as human-readable table")
    .option("--no-cache", "skip cache");
}

export function registerSerpCommands(program: Command): void {
  // --- serp (Google organic) ---
  commonOpts(
    program
      .command("serp <keyword>")
      .description("Get Google organic SERP results for a keyword")
  ).action(async (keyword: string, opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const device = opts.device as string;
      const depth = parseInt(opts.depth);
      const fmt = getFormat(opts);

      const cacheKey = makeKey("serp", keyword, loc, lang);
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/serp/google/organic/live/advanced",
          [{ keyword, location_code: loc, language_code: lang, device, depth }]
        );
        const items = extractItems(result);
        rows = items
          .filter((item: any) => item.type === "organic")
          .map((item: any) => ({
            position: item.rank_group,
            url: item.url,
            title: item.title,
            domain: item.domain,
            description: item.description?.substring(0, 100),
          }));

        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- serp-youtube ---
  commonOpts(
    program
      .command("serp-youtube <keyword>")
      .description("Get YouTube SERP results for a keyword")
  ).action(async (keyword: string, opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const device = opts.device as string;
      const depth = parseInt(opts.depth);
      const fmt = getFormat(opts);

      const cacheKey = makeKey("serp-youtube", keyword, loc, lang);
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/serp/youtube/organic/live/advanced",
          [{ keyword, location_code: loc, language_code: lang, device, depth }]
        );
        const items = extractItems(result);
        rows = items
          .filter((item: any) => item.type === "organic")
          .map((item: any) => ({
            position: item.rank_group,
            title: item.title,
            url: item.url,
            channel: item.channel_name,
            views: item.views_count,
          }));

        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- serp-maps ---
  commonOpts(
    program
      .command("serp-maps <keyword>")
      .description("Get Google Maps SERP results for a keyword")
  ).action(async (keyword: string, opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const fmt = getFormat(opts);

      const cacheKey = makeKey("serp-maps", keyword, loc, lang);
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/serp/google/maps/live/advanced",
          [{ keyword, location_code: loc, language_code: lang }]
        );
        const items = extractItems(result);
        rows = items
          .filter((item: any) => item.type === "maps_search")
          .map((item: any) => ({
            position: item.rank_group,
            title: item.title,
            rating: item.rating?.value,
            reviews: item.rating?.votes_count,
            address: item.address,
          }));

        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- serp-news ---
  commonOpts(
    program
      .command("serp-news <keyword>")
      .description("Get Google News SERP results for a keyword")
  ).action(async (keyword: string, opts) => {
    try {
      const loc = parseInt(opts.location);
      const lang = opts.language as string;
      const depth = parseInt(opts.depth);
      const fmt = getFormat(opts);

      const cacheKey = makeKey("serp-news", keyword, loc, lang);
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/serp/google/news/live/advanced",
          [{ keyword, location_code: loc, language_code: lang, depth }]
        );
        const items = extractItems(result);
        rows = items
          .filter((item: any) => item.type === "news_search")
          .map((item: any) => ({
            position: item.rank_group,
            title: item.title,
            url: item.url,
            source: item.source,
            date: item.date,
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
