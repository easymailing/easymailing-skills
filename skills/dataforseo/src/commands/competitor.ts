import type { Command } from "commander";
import { request, extractItems } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output, round2 } from "../format.js";

const DEFAULT_LOCATION = "2724";
const DEFAULT_LANGUAGE = "es";

export function registerCompetitorCommands(program: Command): void {
  program
    .command("competitor <domain>")
    .description("Get ranked keywords for a domain")
    .option("-l, --location <code>", "location code", DEFAULT_LOCATION)
    .option("--language <code>", "language code", DEFAULT_LANGUAGE)
    .option("-n, --limit <n>", "max results", "50")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--human", "output as human-readable table")
    .option("--no-cache", "skip cache")
    .action(async (domain: string, opts: any) => {
      try {
        const location = Number(opts.location);
        const language: string = opts.language;
        const limit = Number(opts.limit);
        const format = getFormat(opts);

        const cacheKey = makeKey("competitor", `${domain}:${limit}`, location, language);

        if (opts.cache !== false) {
          const cached = get(cacheKey);
          if (cached) {
            console.log(output(cached, format));
            return;
          }
        }

        const result = await request("/dataforseo_labs/google/ranked_keywords/live", [
          { target: domain, location_code: location, language_code: language, limit },
        ]);

        const items = extractItems(result);

        const mapped = items.map((item: any) => ({
          keyword: item.keyword_data?.keyword,
          position: item.ranked_serp_element?.serp_item?.rank_group,
          volume: item.keyword_data?.keyword_info?.search_volume,
          cpc: item.keyword_data?.keyword_info?.cpc != null
            ? round2(item.keyword_data.keyword_info.cpc)
            : undefined,
          difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty,
          url: item.ranked_serp_element?.serp_item?.url,
        }));

        // Cross-populate volume cache for each keyword
        for (const row of mapped) {
          if (row.keyword && row.volume != null) {
            const volKey = makeKey("volume", row.keyword, location, language);
            set(volKey, [{ keyword: row.keyword, volume: row.volume, cpc: row.cpc }]);
          }
        }

        set(cacheKey, mapped);
        console.log(output(mapped, format));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  program
    .command("competitors <keywords...>")
    .description("Find SERP competitors for a set of keywords")
    .option("-l, --location <code>", "location code", DEFAULT_LOCATION)
    .option("--language <code>", "language code", DEFAULT_LANGUAGE)
    .option("-n, --limit <n>", "max results", "50")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--human", "output as human-readable table")
    .option("--no-cache", "skip cache")
    .action(async (keywords: string[], opts: any) => {
      try {
        const location = Number(opts.location);
        const language: string = opts.language;
        const format = getFormat(opts);

        const cacheKey = makeKey("competitors", keywords.join(","), location, language);

        if (opts.cache !== false) {
          const cached = get(cacheKey);
          if (cached) {
            console.log(output(cached, format));
            return;
          }
        }

        const result = await request("/dataforseo_labs/google/serp_competitors/live", [
          { keywords, location_code: location, language_code: language },
        ]);

        const items = extractItems(result);

        const mapped = items.map((item: any) => ({
          domain: item.domain,
          avg_position: item.avg_position != null ? round2(item.avg_position) : undefined,
          keywords_count: item.se_keywords,
          visibility: item.visibility != null ? round2(item.visibility) : undefined,
          etv: item.etv != null ? round2(item.etv) : undefined,
        }));

        set(cacheKey, mapped);
        console.log(output(mapped, format));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  program
    .command("domain-rank <domain>")
    .description("Get domain rank overview")
    .option("-l, --location <code>", "location code", DEFAULT_LOCATION)
    .option("--language <code>", "language code", DEFAULT_LANGUAGE)
    .option("-n, --limit <n>", "max results", "50")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--human", "output as human-readable table")
    .option("--no-cache", "skip cache")
    .action(async (domain: string, opts: any) => {
      try {
        const location = Number(opts.location);
        const language: string = opts.language;
        const format = getFormat(opts);

        const cacheKey = makeKey("domain-rank", domain, location, language);

        if (opts.cache !== false) {
          const cached = get(cacheKey);
          if (cached) {
            console.log(output(cached, format));
            return;
          }
        }

        const result = await request("/dataforseo_labs/google/domain_rank_overview/live", [
          { target: domain, location_code: location, language_code: language },
        ]);

        // Result is array directly (no items nesting)
        const mapped = (result as any[]).map((item: any) => ({
          domain: item.target,
          organic_traffic: item.metrics?.organic?.etv != null
            ? round2(item.metrics.organic.etv)
            : undefined,
          organic_keywords: item.metrics?.organic?.count,
          paid_traffic: item.metrics?.paid?.etv != null
            ? round2(item.metrics.paid.etv)
            : undefined,
          paid_keywords: item.metrics?.paid?.count,
        }));

        set(cacheKey, mapped);
        console.log(output(mapped, format));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  program
    .command("domain-intersection <domains...>")
    .description("Find keyword intersection between exactly 2 domains")
    .option("-l, --location <code>", "location code", DEFAULT_LOCATION)
    .option("--language <code>", "language code", DEFAULT_LANGUAGE)
    .option("-n, --limit <n>", "max results", "50")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--human", "output as human-readable table")
    .option("--no-cache", "skip cache")
    .action(async (domains: string[], opts: any) => {
      try {
        if (domains.length !== 2) {
          console.error("Error: domain-intersection requires exactly 2 domains");
          process.exit(1);
        }

        const location = Number(opts.location);
        const language: string = opts.language;
        const limit = Number(opts.limit);
        const format = getFormat(opts);

        const cacheKey = makeKey("domain-intersection", `${domains.join(",")}:${limit}`, location, language);

        if (opts.cache !== false) {
          const cached = get(cacheKey);
          if (cached) {
            console.log(output(cached, format));
            return;
          }
        }

        const body: Record<string, any> = {
          location_code: location,
          language_code: language,
          limit,
        };
        domains.forEach((d, i) => { body[`target${i + 1}`] = d; });

        const result = await request("/dataforseo_labs/google/domain_intersection/live", [
          body,
        ]);

        const items = extractItems(result);

        const mapped = items.map((item: any) => {
          const kd = item.keyword_data ?? item;
          return {
            keyword: kd.keyword,
            volume: kd.keyword_info?.search_volume,
            cpc: kd.keyword_info?.cpc != null ? round2(kd.keyword_info.cpc) : undefined,
            competition: kd.keyword_info?.competition != null
              ? round2(kd.keyword_info.competition)
              : undefined,
          };
        });

        set(cacheKey, mapped);
        console.log(output(mapped, format));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });
}
