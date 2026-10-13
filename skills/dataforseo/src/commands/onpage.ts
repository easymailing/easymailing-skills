import type { Command } from "commander";
import { request, extractItems } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output, round2 } from "../format.js";

function commonOpts(cmd: Command): Command {
  return cmd
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--human", "output as human-readable table")
    .option("--no-cache", "skip cache");
}

export function registerOnpageCommands(program: Command): void {
  // --- lighthouse ---
  commonOpts(
    program
      .command("lighthouse <url>")
      .description("Run Lighthouse audit and get performance, accessibility, best practices, and SEO scores")
  ).action(async (url: string, opts) => {
    try {
      const fmt = getFormat(opts);

      const cacheKey = makeKey("lighthouse", url, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/on_page/lighthouse/live/json",
          [{ url }],
          { fullResponse: true }
        );

        let row: Record<string, any> = { url };

        try {
          const categories = result?.[0]?.categories ?? {};
          row.performance = round2(categories.performance?.score ?? 0);
          row.accessibility = round2(categories.accessibility?.score ?? 0);
          row.best_practices = round2(categories["best-practices"]?.score ?? 0);
          row.seo = round2(categories.seo?.score ?? 0);
        } catch {
          // If categories structure differs, try to extract whatever is available
          row.raw = JSON.stringify(result).substring(0, 200);
        }

        rows = [row];
        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- page-audit ---
  commonOpts(
    program
      .command("page-audit <url>")
      .description("Get instant on-page audit for a URL (status, title, h1, links, word count)")
  ).action(async (url: string, opts) => {
    try {
      const fmt = getFormat(opts);

      const cacheKey = makeKey("page-audit", url, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/on_page/instant_pages",
          [{ url }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          url: item.url,
          status_code: item.meta?.status_code,
          title: item.meta?.title,
          description: item.meta?.description?.substring(0, 80),
          h1: item.meta?.htags?.h1?.[0],
          word_count: item.meta?.content?.plain_text_word_count,
          internal_links: item.meta?.internal_links_count,
          external_links: item.meta?.external_links_count,
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
