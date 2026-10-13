import type { Command } from "commander";
import { request } from "../client.js";
import { getFormat, output } from "../format.js";

export function registerBusinessCommands(program: Command): void {
  // --- reviews ---
  program
    .command("reviews <keyword>")
    .description("Create an async task to fetch Google Reviews for a keyword")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .action(async (keyword: string, opts) => {
      try {
        const fmt = getFormat(opts);

        const result = await request(
          "/business_data/google/reviews/task_post",
          [{ keyword, location_name: "Spain", language_name: "Spanish" }]
        );

        const task = result?.[0] ?? result;
        const rows = [{
          task_id: task?.id ?? task?.task_id,
          status: task?.status_message ?? "Task created",
        }];

        console.log(output(rows, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });

  // --- shopping ---
  program
    .command("shopping <keyword>")
    .description("Create an async task to fetch Google Shopping products for a keyword")
    .option("-l, --location <code>", "location code", "2724")
    .option("--language <code>", "language code", "es")
    .option("--json", "output as JSON")
    .option("--table", "output as table")
    .action(async (keyword: string, opts) => {
      try {
        const fmt = getFormat(opts);

        const result = await request(
          "/merchant/google/products/task_post",
          [{ keyword, location_name: "Spain", language_name: "Spanish" }]
        );

        const task = result?.[0] ?? result;
        const rows = [{
          task_id: task?.id ?? task?.task_id,
          status: task?.status_message ?? "Task created",
        }];

        console.log(output(rows, fmt));
      } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
      }
    });
}
