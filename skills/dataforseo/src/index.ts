#!/usr/bin/env node
import { Command } from "commander";
import { registerKeywordCommands } from "./commands/keywords.js";
import { registerCompetitorCommands } from "./commands/competitor.js";
import { registerSerpCommands } from "./commands/serp.js";
import { registerBacklinkCommands } from "./commands/backlinks.js";
import { registerOnpageCommands } from "./commands/onpage.js";
import { registerTrendsCommands } from "./commands/trends.js";
import { registerContentCommands } from "./commands/content.js";
import { registerDomainCommands } from "./commands/domain.js";
import { registerAiCommands } from "./commands/ai.js";
import { registerBusinessCommands } from "./commands/business.js";
import { printCache } from "./cache.js";
import { request } from "./client.js";
import { getFormat, output } from "./format.js";

const program = new Command();
program
  .name("dataforseo")
  .description("SEO research CLI — DataForSEO API")
  .version("1.0.0");

// Handle --print-cache before commander parses
if (process.argv.includes("--print-cache")) {
  printCache();
  process.exit(0);
}

// Register all command modules
registerKeywordCommands(program);
registerCompetitorCommands(program);
registerSerpCommands(program);
registerBacklinkCommands(program);
registerOnpageCommands(program);
registerTrendsCommands(program);
registerContentCommands(program);
registerDomainCommands(program);
registerAiCommands(program);
registerBusinessCommands(program);

// --- status ---
program
  .command("status")
  .description("Check API credentials and account balance")
  .action(async () => {
    try {
      const result = await request("/appendix/user_data", undefined, { fullResponse: true });
      const item = Array.isArray(result) ? result[0] : result;
      const rows = [{
        login: item?.login,
        money_balance: item?.money?.balance,
        money_limit: item?.money?.limits_total,
        rate_minute: item?.rates?.limits?.minute?.current,
        rate_day: item?.rates?.limits?.day?.current,
      }];
      console.log(output(rows, "table"));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

// --- locations ---
program
  .command("locations [search]")
  .description("Search location codes (e.g. 'Spain', 'Madrid')")
  .action(async (search?: string) => {
    try {
      const result = await request("/appendix/locations", undefined, { fullResponse: true });
      const items = Array.isArray(result) ? result : [];
      let filtered = items;
      if (search) {
        const q = search.toLowerCase();
        filtered = items.filter((item: any) =>
          item.location_name?.toLowerCase().includes(q) ||
          String(item.location_code)?.includes(q)
        );
      }
      const rows = filtered.slice(0, 20).map((item: any) => ({
        code: item.location_code,
        name: item.location_name,
        type: item.location_type,
        country: item.country_iso_code,
      }));
      console.log(output(rows, "table"));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

// --- languages ---
program
  .command("languages [search]")
  .description("Search language codes (e.g. 'Spanish', 'English')")
  .action(async (search?: string) => {
    try {
      const result = await request("/appendix/languages", undefined, { fullResponse: true });
      const items = Array.isArray(result) ? result : [];
      let filtered = items;
      if (search) {
        const q = search.toLowerCase();
        filtered = items.filter((item: any) =>
          item.language_name?.toLowerCase().includes(q) ||
          item.language_code?.toLowerCase().includes(q)
        );
      }
      const rows = filtered.slice(0, 20).map((item: any) => ({
        code: item.language_code,
        name: item.language_name,
      }));
      console.log(output(rows, "table"));
    } catch (e: any) {
      console.error("Error:", e.message);
      process.exit(1);
    }
  });

program.parse();
