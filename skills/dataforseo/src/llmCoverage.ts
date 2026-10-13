import { DataForSeoError } from "./client.js";

export type CoverageStatus = "success" | "partial" | "failed";
export type CalendarLogStatus = "success" | "partial" | "error";
export type LlmFailureCategory =
  | "transient_retryable"
  | "deterministic_engine_configuration"
  | "fatal_input_auth"
  | "unknown_fatal";

export interface LlmAskResult {
  engine: string;
  model: string;
  money_spent: number;
  input_tokens: number;
  output_tokens: number;
  answer: string;
  annotations: { title: string; url: string; domain: string }[];
  fan_out_queries: string[];
  web_search: boolean;
}

export interface LlmAskInvocation {
  engine: string;
  model: string;
  prompt: string;
  country: string;
  maxTokens: number;
  location: number;
  language: string;
  useCache: boolean;
}

export type LlmAskTransport = (invocation: LlmAskInvocation) => Promise<LlmAskResult>;

export interface LlmCoverageOptions {
  prompts: string[];
  brands: string[];
  engines: string[];
  location: number;
  language: string;
  country: string;
  maxTokens: number;
  maxRetries?: number;
  useCache?: boolean;
  concurrency?: number;
}

export interface LlmCoverageDependencies {
  ask: LlmAskTransport;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface CoverageFailure {
  category: LlmFailureCategory;
  phase: "probe" | "cell";
  prompt_index: number;
  attempts: number;
  message: string;
  http_status: number | null;
  dataforseo_status_code: number | null;
  dataforseo_status_message: string | null;
  field: string | null;
  engine: string;
  model: string;
}

export interface CoverageMachineSummary {
  schema_version: 1;
  source: "dataforseo.llm-coverage";
  status: CalendarLogStatus;
}

export interface CoverageMetadata {
  generated_at: string;
  location: number;
  language: string;
  engines: string[];
  brands: string[];
  status: CoverageStatus;
  requested_prompt_counts: Record<string, number>;
  observed_prompt_counts: Record<string, number>;
  failure_count: number;
  failures: CoverageFailure[];
  money_spent_total: number;
  machine_summary: CoverageMachineSummary;
}

export interface BrandCoverageValue {
  mentions: number;
  observed: number;
  coverage: string;
}

export interface BrandCoverageRow {
  brand: string;
  total: BrandCoverageValue;
  engines: Record<string, BrandCoverageValue>;
}

export interface PromptCoverageRow {
  prompt: string;
  cells: Record<string, "observed" | "N/D">;
  brands: Record<string, string[]>;
}

export interface LlmCoverageReport {
  status: CoverageStatus;
  metadata: CoverageMetadata;
  coverage_per_brand: BrandCoverageRow[];
  coverage_per_prompt: PromptCoverageRow[];
  money_spent_total: number;
  machine_summary: CoverageMachineSummary;
}

export const ENGINE_DEFAULT_MODELS: Record<string, string> = {
  chatgpt: "gpt-4o-mini",
  claude: "claude-sonnet-4-0",
  gemini: "gemini-2.5-flash",
  perplexity: "sonar",
};

const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 429]);
const FATAL_INPUT_AUTH_HTTP_STATUSES = new Set([400, 401, 402, 403, 404, 409, 422]);
const TRANSIENT_CAUSE_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
]);
const TRANSIENT_DATAFORSEO_STATUS_CODES = new Set([
  40103,
  40209,
  50000,
  50001,
  50301,
  50302,
  50303,
  50304,
  50401,
  50402,
]);
const FATAL_INPUT_AUTH_DATAFORSEO_STATUS_CODES = new Set([
  40100,
  40104,
  40207,
  40210,
  40402,
  40503,
  40506,
  50100,
]);

function isEngineConfigurationField(engine: string | undefined, field: string | undefined): boolean {
  if (!engine || !field) return false;
  const normalizedEngine = engine.trim().toLowerCase();
  const normalizedField = field.trim().toLowerCase();
  if (!(normalizedEngine in ENGINE_DEFAULT_MODELS)) return false;
  if (normalizedField === "model_name") return true;
  return normalizedEngine === "claude"
    && (normalizedField === "force_web_search" || normalizedField === "use_reasoning");
}

export function classifyLlmFailure(error: unknown): LlmFailureCategory {
  if (error instanceof DataForSeoError) {
    const statusMessage = error.statusMessage?.toLowerCase() ?? "";
    if (error.httpStatus !== undefined && FATAL_INPUT_AUTH_HTTP_STATUSES.has(error.httpStatus)) {
      return "fatal_input_auth";
    }
    if (
      (error.httpStatus !== undefined && (TRANSIENT_HTTP_STATUSES.has(error.httpStatus) || error.httpStatus >= 500))
      || (error.causeCode !== undefined && TRANSIENT_CAUSE_CODES.has(error.causeCode))
      || (error.statusCode !== undefined && TRANSIENT_DATAFORSEO_STATUS_CODES.has(error.statusCode))
      || error.message === "fetch failed"
      || /(?:temporarily unavailable|timed? out|rate limit)/i.test(statusMessage)
    ) {
      return "transient_retryable";
    }
    if (
      error.statusCode !== undefined && FATAL_INPUT_AUTH_DATAFORSEO_STATUS_CODES.has(error.statusCode)
    ) {
      return "fatal_input_auth";
    }
    if (error.statusCode === 40501) {
      return isEngineConfigurationField(error.engine, error.field)
        ? "deterministic_engine_configuration"
        : "fatal_input_auth";
    }
    if (/(?:authenticat|unauthoriz|forbidden|credential|invalid (?:field|parameter|request|input))/i.test(statusMessage)) {
      return "fatal_input_auth";
    }
  }
  return "unknown_fatal";
}

export function mapCoverageStatusToCalendarLog(status: CoverageStatus): CalendarLogStatus {
  switch (status) {
    case "success": return "success";
    case "partial": return "partial";
    case "failed": return "error";
  }
}

export function exitCodeForCoverageStatus(status: CoverageStatus): 0 | 1 {
  return status === "failed" ? 1 : 0;
}

export function machineSummaryLine(summary: CoverageMachineSummary): string {
  return `DATAFORSEO_LLM_COVERAGE_SUMMARY=${JSON.stringify(summary)}`;
}

export function normalizeCoverageEngines(rawEngines: string[]): string[] {
  const engines = rawEngines.map((engine) => engine.trim().toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  for (const engine of engines) {
    if (seen.has(engine)) throw new Error(`Duplicate engine: ${engine}`);
    seen.add(engine);
  }
  return engines;
}

interface AttemptResult {
  result?: LlmAskResult;
  error?: unknown;
  category?: LlmFailureCategory;
  attempts: number;
}

async function attemptWithRetry(
  invocation: LlmAskInvocation,
  dependencies: LlmCoverageDependencies,
  maxRetries: number,
): Promise<AttemptResult> {
  const sleep = dependencies.sleep ?? ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return { result: await dependencies.ask(invocation), attempts: attempt + 1 };
    } catch (error) {
      const category = classifyLlmFailure(error);
      if (category !== "transient_retryable" || attempt === maxRetries) {
        return { error, category, attempts: attempt + 1 };
      }
      await sleep(500 * (2 ** attempt));
    }
  }
  return { error: new Error("unreachable retry state"), category: "unknown_fatal", attempts: maxRetries + 1 };
}

function failureDetail(
  attempt: AttemptResult,
  phase: CoverageFailure["phase"],
  promptIndex: number,
  engine: string,
  model: string,
): CoverageFailure {
  const error = attempt.error;
  const typed = error instanceof DataForSeoError ? error : undefined;
  return {
    category: attempt.category ?? "unknown_fatal",
    phase,
    prompt_index: promptIndex,
    attempts: attempt.attempts,
    message: error instanceof Error ? error.message : String(error ?? "unknown failure"),
    http_status: typed?.httpStatus ?? null,
    dataforseo_status_code: typed?.statusCode ?? null,
    dataforseo_status_message: typed?.statusMessage ?? null,
    field: typed?.field ?? null,
    engine: typed?.engine ?? engine,
    model: typed?.model ?? model,
  };
}

function isFatal(category: LlmFailureCategory | undefined): boolean {
  return category === "fatal_input_auth" || category === "unknown_fatal";
}

function mentionsBrand(result: LlmAskResult, brand: string): boolean {
  const normalizedBrand = brand.toLowerCase();
  return result.answer.toLowerCase().includes(normalizedBrand)
    || result.annotations.some((annotation) => annotation.domain.toLowerCase().includes(normalizedBrand));
}

function coverageValue(mentions: number, observed: number): BrandCoverageValue {
  return { mentions, observed, coverage: observed === 0 ? "N/D" : `${mentions} / ${observed}` };
}

export async function runLlmCoverage(
  options: LlmCoverageOptions,
  dependencies: LlmCoverageDependencies,
): Promise<LlmCoverageReport> {
  const prompts = options.prompts.slice();
  const brands = options.brands.map((brand) => brand.trim().toLowerCase()).filter(Boolean);
  const engines = normalizeCoverageEngines(options.engines);
  const maxRetries = Math.max(0, options.maxRetries ?? 2);
  const results: Array<Record<string, LlmAskResult | undefined>> = prompts.map(() => ({}));
  const failures: CoverageFailure[] = [];
  const healthyEngines: Array<{
    engine: string;
    model: string;
    invocation: Omit<LlmAskInvocation, "prompt" | "useCache">;
  }> = [];
  let fatal = false;

  for (const engine of engines) {
    if (fatal) break;
    const model = ENGINE_DEFAULT_MODELS[engine] ?? "";
    const baseInvocation = {
      engine,
      model,
      country: options.country,
      maxTokens: options.maxTokens,
      location: options.location,
      language: options.language,
    };

    if (prompts.length === 0) continue;
    const probe = await attemptWithRetry({
      ...baseInvocation,
      prompt: prompts[0],
      useCache: false,
    }, dependencies, maxRetries);

    if (!probe.result) {
      const typed = probe.error instanceof DataForSeoError ? probe.error : undefined;
      const fieldSpecificForEngine = probe.category === "deterministic_engine_configuration"
        && Boolean(typed?.field)
        && typed?.engine === engine;
      const detail = failureDetail(probe, "probe", 0, engine, model);
      if (probe.category === "deterministic_engine_configuration" && !fieldSpecificForEngine) {
        detail.category = "unknown_fatal";
        fatal = true;
      } else if (isFatal(probe.category)) {
        fatal = true;
      } else if (probe.category === "transient_retryable") {
        healthyEngines.push({ engine, model, invocation: baseInvocation });
      }
      failures.push(detail);
      continue;
    }

    results[0][engine] = probe.result;
    healthyEngines.push({ engine, model, invocation: baseInvocation });
  }

  const pendingCells: Array<{
    promptIndex: number;
    engine: string;
    model: string;
    invocation: Omit<LlmAskInvocation, "prompt" | "useCache">;
  }> = [];
  if (!fatal) {
    for (const healthy of healthyEngines) {
      for (let promptIndex = 1; promptIndex < prompts.length; promptIndex++) {
        pendingCells.push({ promptIndex, ...healthy });
      }
    }
  }

  let cursor = 0;
  const requestedConcurrency = Math.floor(options.concurrency ?? 8);
  const concurrency = Number.isFinite(requestedConcurrency) && requestedConcurrency > 0
    ? requestedConcurrency
    : 1;
  const workers = Array.from({ length: Math.min(concurrency, pendingCells.length) }, async () => {
    while (!fatal) {
      const cellSpec = pendingCells[cursor++];
      if (!cellSpec) return;
      const cell = await attemptWithRetry({
        ...cellSpec.invocation,
        prompt: prompts[cellSpec.promptIndex],
        useCache: options.useCache ?? true,
      }, dependencies, maxRetries);
      if (cell.result) {
        results[cellSpec.promptIndex][cellSpec.engine] = cell.result;
        continue;
      }
      failures.push(failureDetail(
        cell,
        "cell",
        cellSpec.promptIndex,
        cellSpec.engine,
        cellSpec.model,
      ));
      if (isFatal(cell.category)) fatal = true;
    }
  });
  await Promise.all(workers);

  const requestedPromptCounts = Object.fromEntries(engines.map((engine) => [engine, prompts.length]));
  const observedPromptCounts = Object.fromEntries(engines.map((engine) => [
    engine,
    results.reduce((count, promptResults) => count + (promptResults[engine] ? 1 : 0), 0),
  ]));
  const requestedCells = prompts.length * engines.length;
  const observedCells = Object.values(observedPromptCounts).reduce((sum, count) => sum + count, 0);
  const moneySpent = results.reduce((sum, promptResults) => sum + Object.values(promptResults)
    .reduce((promptSum, result) => promptSum + (result?.money_spent ?? 0), 0), 0);
  const moneySpentTotal = Math.round(moneySpent * 10000) / 10000;
  const status: CoverageStatus = fatal || observedCells === 0
    ? "failed"
    : observedCells === requestedCells
      ? "success"
      : "partial";
  const machineSummary: CoverageMachineSummary = {
    schema_version: 1,
    source: "dataforseo.llm-coverage",
    status: mapCoverageStatusToCalendarLog(status),
  };
  const metadata: CoverageMetadata = {
    generated_at: new Date().toISOString(),
    location: options.location,
    language: options.language,
    engines: engines.slice(),
    brands: brands.slice(),
    status,
    requested_prompt_counts: requestedPromptCounts,
    observed_prompt_counts: observedPromptCounts,
    failure_count: failures.length,
    failures,
    money_spent_total: moneySpentTotal,
    machine_summary: machineSummary,
  };

  const coveragePerBrand = brands.map((brand): BrandCoverageRow => {
    const engineCoverage: Record<string, BrandCoverageValue> = {};
    let totalMentions = 0;
    let totalObserved = 0;
    for (const engine of engines) {
      let mentions = 0;
      let observed = 0;
      for (const promptResults of results) {
        const result = promptResults[engine];
        if (!result) continue;
        observed++;
        if (mentionsBrand(result, brand)) mentions++;
      }
      engineCoverage[engine] = coverageValue(mentions, observed);
      totalMentions += mentions;
      totalObserved += observed;
    }
    return {
      brand,
      total: coverageValue(totalMentions, totalObserved),
      engines: engineCoverage,
    };
  });

  const coveragePerPrompt = prompts.map((prompt, promptIndex): PromptCoverageRow => ({
    prompt,
    cells: Object.fromEntries(engines.map((engine) => [engine, results[promptIndex][engine] ? "observed" : "N/D"])),
    brands: Object.fromEntries(brands.map((brand) => [
      brand,
      engines.filter((engine) => {
        const result = results[promptIndex][engine];
        return result ? mentionsBrand(result, brand) : false;
      }),
    ])),
  }));
  return {
    status,
    metadata,
    coverage_per_brand: coveragePerBrand,
    coverage_per_prompt: coveragePerPrompt,
    money_spent_total: moneySpentTotal,
    machine_summary: machineSummary,
  };
}

export function renderCoverageJson(report: LlmCoverageReport): string {
  return JSON.stringify(report, null, 2);
}

function escapeCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/[\t\r\n]+/g, " ");
}

function flattenedBrandRows(report: LlmCoverageReport): Array<Record<string, string>> {
  const engines = Object.keys(report.metadata.requested_prompt_counts);
  return report.coverage_per_brand.map((row) => ({
    brand: row.brand,
    total: row.total.coverage,
    ...Object.fromEntries(engines.map((engine) => [engine, row.engines[engine].coverage])),
  }));
}

function flattenedPromptRows(report: LlmCoverageReport): Array<Record<string, string>> {
  const engines = Object.keys(report.metadata.requested_prompt_counts);
  const brands = report.coverage_per_brand.map((row) => row.brand);
  return report.coverage_per_prompt.map((row) => ({
    prompt: row.prompt,
    ...Object.fromEntries(engines.map((engine) => [`${engine}_cell`, row.cells[engine]])),
    ...Object.fromEntries(brands.map((brand) => [`${brand}_engines`, row.brands[brand].join(",")])),
  }));
}

function rowsToTsv(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeTsvCell = (value: unknown) => String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
  return [
    headers.map(escapeTsvCell).join("\t"),
    ...rows.map((row) => headers.map((header) => escapeTsvCell(row[header])).join("\t")),
  ].join("\n");
}

export function renderCoverageTsv(report: LlmCoverageReport): string {
  return [
    `metadata_json\t${JSON.stringify(report.metadata)}`,
    "# Coverage per brand",
    rowsToTsv(flattenedBrandRows(report)),
    "",
    "# Coverage per prompt",
    rowsToTsv(flattenedPromptRows(report)),
  ].join("\n");
}

function rowsToTable(rows: Array<Record<string, string>>): string {
  if (rows.length === 0) return "No results.";
  const headers = Object.keys(rows[0]);
  const widths = headers.map((header) => Math.max(
    header.length,
    ...rows.map((row) => String(row[header] ?? "").length),
  ));
  return [
    headers.map((header, index) => header.padEnd(widths[index])).join("  "),
    widths.map((width) => "-".repeat(width)).join("  "),
    ...rows.map((row) => headers.map((header, index) => String(row[header] ?? "").padEnd(widths[index])).join("  ")),
  ].join("\n");
}

export function renderCoverageTable(report: LlmCoverageReport): string {
  return [
    `metadata_json\t${JSON.stringify(report.metadata)}`,
    "# Coverage per brand",
    rowsToTable(flattenedBrandRows(report)),
    "",
    "# Coverage per prompt",
    rowsToTable(flattenedPromptRows(report)),
  ].join("\n");
}

function rowsToMarkdown(rows: Array<Record<string, string>>): string[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `|${headers.map(() => "---").join("|")}|`,
    ...rows.map((row) => `| ${headers.map((header) => escapeCell(row[header])).join(" | ")} |`),
  ];
}

function jsonForHtmlComment(value: unknown): string {
  return JSON.stringify(value).replace(/--/g, "\\u002d\\u002d");
}

export function renderCoverageMarkdown(report: LlmCoverageReport): string {
  const metadataJson = jsonForHtmlComment(report.metadata);
  return [
    "---",
    "type: llm-coverage",
    `generated_at: ${JSON.stringify(report.metadata.generated_at)}`,
    `location: ${report.metadata.location}`,
    `language: ${JSON.stringify(report.metadata.language)}`,
    `engines: ${JSON.stringify(report.metadata.engines)}`,
    `brands: ${JSON.stringify(report.metadata.brands)}`,
    `status: ${report.status}`,
    `requested_prompt_counts: ${JSON.stringify(report.metadata.requested_prompt_counts)}`,
    `observed_prompt_counts: ${JSON.stringify(report.metadata.observed_prompt_counts)}`,
    `failure_count: ${report.metadata.failure_count}`,
    `failures: ${JSON.stringify(report.metadata.failures)}`,
    `money_spent_total: ${report.money_spent_total}`,
    "---",
    `<!-- metadata_json ${metadataJson} -->`,
    `<!-- machine_summary ${jsonForHtmlComment(report.machine_summary)} -->`,
    "",
    "## Coverage per brand",
    "",
    ...rowsToMarkdown(flattenedBrandRows(report)),
    "",
    "## Coverage per prompt",
    "",
    ...rowsToMarkdown(flattenedPromptRows(report)),
    "",
  ].join("\n");
}
