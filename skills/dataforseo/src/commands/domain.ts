import type { Command } from "commander";
import { request, extractItems } from "../client.js";
import { makeKey, get, set } from "../cache.js";
import { getFormat, output } from "../format.js";

export function registerDomainCommands(program: Command): void {
  // --- technologies ---
  program
    .command("technologies <domain>")
    .description("Detect technologies used by a domain")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (domain: string, opts) => {
      try {
        const fmt = getFormat(opts);

        const cacheKey = makeKey("technologies", domain, 0, "");
        const hit = opts.cache ? get(cacheKey) : null;

        let rows: any[];
        if (hit) {
          rows = hit;
        } else {
          const result = await request(
            "/domain_analytics/technologies/domain_technologies/live",
            [{ target: domain }]
          );
          const items = extractItems(result);
          rows = items.map((item: any) => ({
            name: item.name,
            category: item.category,
            version: item.version,
          }));

          set(cacheKey, rows);
        }

        console.log(output(rows, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // --- whois ---
  program
    .command("whois <domain>")
    .description("Get WHOIS information for a domain")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .option("--no-cache", "skip cache")
    .action(async (domain: string, opts) => {
      try {
        const fmt = getFormat(opts);

        const cacheKey = makeKey("whois", domain, 0, "");
        const hit = opts.cache ? get(cacheKey) : null;

        let rows: any[];
        if (hit) {
          rows = hit;
        } else {
          const result = await request(
            "/domain_analytics/whois/overview/live",
            [{ target: domain }]
          );
          const items = extractItems(result);
          rows = items.map((item: any) => ({
            domain: item.domain,
            created: item.creation_date,
            expires: item.expiration_date,
            registrar: item.registrar,
            nameservers: item.name_servers?.join(", "),
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
