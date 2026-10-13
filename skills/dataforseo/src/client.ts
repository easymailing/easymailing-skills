import { DATAFORSEO_BASE as BASE, emApiTransport } from "./emApi.js";

export type HttpTransport = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface DataForSeoRequestContext {
  engine?: string;
  model?: string;
}

export interface DataForSeoErrorInit extends DataForSeoRequestContext {
  httpStatus?: number;
  statusCode?: number;
  statusMessage?: string;
  field?: string;
  cause?: unknown;
}

export class DataForSeoError extends Error {
  readonly httpStatus?: number;
  readonly statusCode?: number;
  readonly statusMessage?: string;
  readonly field?: string;
  readonly engine?: string;
  readonly model?: string;
  readonly causeCode?: string;

  constructor(message: string, init: DataForSeoErrorInit = {}) {
    super(message, { cause: init.cause });
    this.name = "DataForSeoError";
    this.httpStatus = init.httpStatus;
    this.statusCode = init.statusCode;
    this.statusMessage = init.statusMessage;
    this.field = init.field;
    this.engine = init.engine;
    this.model = init.model;
    this.causeCode = causeCodeOf(init.cause);
  }
}

export interface RequestOptions {
  fullResponse?: boolean;
  transport?: HttpTransport;
  context?: DataForSeoRequestContext;
}

function causeCodeOf(cause: unknown): string | undefined {
  if (!cause || typeof cause !== "object") return undefined;
  const code = "code" in cause ? (cause as { code?: unknown }).code : undefined;
  if (typeof code === "string") return code;
  const nestedCause = "cause" in cause ? (cause as { cause?: unknown }).cause : undefined;
  return nestedCause === cause ? undefined : causeCodeOf(nestedCause);
}

function parseField(statusMessage: string | undefined, explicitField?: unknown): string | undefined {
  if (typeof explicitField === "string" && explicitField.trim()) return explicitField.trim();
  if (!statusMessage) return undefined;
  const quoted = statusMessage.match(/(?:field|parameter)\s*:?\s*["'`](?<field>[A-Za-z0-9_.-]+)["'`]/i);
  if (quoted?.groups?.field) return quoted.groups.field;
  const unquoted = statusMessage.match(/(?:field|parameter)\s*:\s*(?<field>[A-Za-z_][A-Za-z0-9_.-]*)/i);
  return unquoted?.groups?.field;
}

function statusCodeOf(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asObject(value: unknown): Record<string, any> | undefined {
  return value !== null && typeof value === "object" ? value as Record<string, any> : undefined;
}

function makeResponseError(
  response: Response,
  data: unknown,
  context: DataForSeoRequestContext | undefined,
): DataForSeoError {
  const envelope = asObject(data);
  const task = asObject(Array.isArray(envelope?.tasks) ? envelope.tasks[0] : undefined);
  const statusCode = statusCodeOf(task?.status_code) ?? statusCodeOf(envelope?.status_code);
  const statusMessage = typeof task?.status_message === "string"
    ? task.status_message
    : typeof envelope?.status_message === "string"
      ? envelope.status_message
      : response.statusText || undefined;
  const field = parseField(statusMessage, task?.field ?? envelope?.field);
  const prefix = response.ok ? "DataForSEO error" : `HTTP ${response.status}`;
  const detail = statusCode !== undefined
    ? `${statusCode}${statusMessage ? `: ${statusMessage}` : ""}`
    : statusMessage;

  return new DataForSeoError(detail ? `${prefix} ${detail}` : prefix, {
    httpStatus: response.status,
    statusCode,
    statusMessage,
    field,
    engine: context?.engine,
    model: context?.model,
  });
}

// .ai endpoints return: { id, status_code, items: [...] }
// Regular endpoints return: { status_code, tasks: [{ status_code, result: [{ items: [...] }] }] }

export async function request(path: string, body?: unknown, opts?: RequestOptions): Promise<any> {
  const useAi = !opts?.fullResponse;
  const url = `${BASE}${path}${useAi ? ".ai" : ""}`;
  const transport = opts?.transport ?? emApiTransport;
  let res: Response;
  try {
    res = await transport(url, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof DataForSeoError) throw error;
    throw new DataForSeoError(error instanceof Error ? error.message : "DataForSEO transport failed", {
      engine: opts?.context?.engine,
      model: opts?.context?.model,
      cause: error,
    });
  }

  let data: any;
  try {
    data = await res.json();
  } catch (error) {
    if (!res.ok) throw makeResponseError(res, undefined, opts?.context);
    throw new DataForSeoError("Invalid JSON response from DataForSEO", {
      httpStatus: res.status,
      engine: opts?.context?.engine,
      model: opts?.context?.model,
      cause: error,
    });
  }

  if (!res.ok) throw makeResponseError(res, data, opts?.context);

  if (data.status_code !== 20000) {
    throw makeResponseError(res, data, opts?.context);
  }

  // .ai response: flat { items: [...] }
  if (useAi) {
    return data.items ?? [];
  }

  // Regular response: nested { tasks: [{ result: [...] }] }
  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw makeResponseError(res, data, opts?.context);
  }

  return task.result;
}

// For .ai responses, items are already flat — no nesting
// For regular responses, items may be nested in result[0].items
export function extractItems(result: any[]): any[] {
  if (!result || result.length === 0) return [];
  const first = result[0];
  if (first && Array.isArray(first.items)) return first.items;
  return result;
}
