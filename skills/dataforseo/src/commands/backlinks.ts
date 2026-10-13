import type { Command } from "commander";
import { request, extractItems } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output, round2 } from "../format.js";

function commonOpts(cmd: Command): Command {
  return cmd
    .option("-n, --limit <n>", "max results", "50")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--human", "output as human-readable table")
    .option("--no-cache", "skip cache");
}

export function registerBacklinkCommands(program: Command): void {
  // --- backlinks (summary) ---
  commonOpts(
    program
      .command("backlinks <target>")
      .description("Get backlink summary for a domain or URL")
  ).action(async (target: string, opts) => {
    try {
      const fmt = getFormat(opts);
      const cacheKey = makeKey("backlinks", target, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/backlinks/summary/live",
          [{ target, include_subdomains: true }]
        );
        const item = Array.isArray(result) ? result[0] : null;
        rows = item
          ? [{
              target: item.target,
              backlinks: item.backlinks,
              referring_domains: item.referring_domains,
              referring_ips: item.referring_ips,
              rank: item.rank,
              broken_backlinks: item.broken_backlinks,
            }]
          : [];
        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- backlink-list ---
  commonOpts(
    program
      .command("backlink-list <target>")
      .description("List individual backlinks pointing to a target")
      .option("--mode <mode>", "backlink mode", "as_is")
  ).action(async (target: string, opts) => {
    try {
      const limit = parseInt(opts.limit);
      const mode = opts.mode as string;
      const fmt = getFormat(opts);
      const cacheKey = makeKey("backlink-list", `${target}:${mode}:${limit}`, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/backlinks/backlinks/live",
          [{ target, limit, mode }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          url_from: item.url_from,
          url_to: item.url_to,
          anchor: item.anchor,
          domain_from: item.domain_from,
          rank: item.rank,
          is_lost: item.is_lost,
        }));
        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- backlink-anchors ---
  commonOpts(
    program
      .command("backlink-anchors <target>")
      .description("Get anchor text distribution for backlinks")
  ).action(async (target: string, opts) => {
    try {
      const limit = parseInt(opts.limit);
      const fmt = getFormat(opts);
      const cacheKey = makeKey("backlink-anchors", `${target}:${limit}`, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/backlinks/anchors/live",
          [{ target, limit }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          anchor: item.anchor,
          backlinks: item.backlinks,
          referring_domains: item.referring_domains,
          first_seen: item.first_seen,
        }));
        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- referring-domains ---
  commonOpts(
    program
      .command("referring-domains <target>")
      .description("List domains linking to a target")
  ).action(async (target: string, opts) => {
    try {
      const limit = parseInt(opts.limit);
      const fmt = getFormat(opts);
      const cacheKey = makeKey("referring-domains", `${target}:${limit}`, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/backlinks/referring_domains/live",
          [{ target, limit }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          domain: item.domain,
          backlinks: item.backlinks,
          rank: item.rank,
          first_seen: item.first_visited,
        }));
        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- backlink-competitors ---
  commonOpts(
    program
      .command("backlink-competitors <target>")
      .description("Find competitors by shared backlink profile")
  ).action(async (target: string, opts) => {
    try {
      const limit = parseInt(opts.limit);
      const fmt = getFormat(opts);
      const cacheKey = makeKey("backlink-competitors", `${target}:${limit}`, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/backlinks/competitors/live",
          [{ target, limit }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          domain: item.domain,
          backlinks: item.backlinks,
          referring_domains: item.referring_domains,
          rank: item.rank,
        }));
        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- link-gap ---
  commonOpts(
    program
      .command("link-gap <targets...>")
      .description("Find domains linking to competitors but not to you (2+ domains)")
  ).action(async (targets: string[], opts) => {
    try {
      if (targets.length < 2) {
        console.error("Error: link-gap requires at least 2 targets");
        process.exit(1);
      }

      const limit = parseInt(opts.limit);
      const fmt = getFormat(opts);
      const sortedKey = [...targets].sort().join(",");
      const cacheKey = makeKey("link-gap", `${sortedKey}:${limit}`, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const targetsObj: Record<string, string> = {};
        targets.forEach((t, i) => {
          targetsObj[String(i + 1)] = t;
        });

        const result = await request(
          "/backlinks/domain_intersection/live",
          [{ targets: targetsObj, limit }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          url_from: item.url_from,
          domain_from: item.domain_from,
          anchor: item.anchor,
          rank: item.page_from_rank,
        }));
        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- backlink-history ---
  commonOpts(
    program
      .command("backlink-history <target>")
      .description("Get historical backlink counts over time")
  ).action(async (target: string, opts) => {
    try {
      const fmt = getFormat(opts);
      const cacheKey = makeKey("backlink-history", target, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/backlinks/history/live",
          [{ target }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          date: item.date,
          backlinks: item.backlinks,
          referring_domains: item.referring_domains,
          rank: item.rank,
        }));
        set(cacheKey, rows);
      }

      console.log(output(rows, fmt));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

  // --- bulk-ranks ---
  commonOpts(
    program
      .command("bulk-ranks <targets...>")
      .description("Get bulk rank and backlink stats for multiple targets")
  ).action(async (targets: string[], opts) => {
    try {
      const fmt = getFormat(opts);
      const sortedKey = [...targets].sort().join(",");
      const cacheKey = makeKey("bulk-ranks", sortedKey, 0, "xx");
      const hit = opts.cache ? get(cacheKey) : null;

      let rows: any[];
      if (hit) {
        rows = hit;
      } else {
        const result = await request(
          "/backlinks/bulk_ranks/live",
          [{ targets }]
        );
        const items = extractItems(result);
        rows = items.map((item: any) => ({
          target: item.target,
          rank: item.rank,
          backlinks: item.backlinks,
          referring_domains: item.referring_domains,
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
