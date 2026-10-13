import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DATAFORSEO_BASE = "https://api.dataforseo.com/v3";

// em-api: EM_API_BIN o, por defecto, bin/em-api del repo (este fichero vive en
// skills/dataforseo/{src|dist}/). La credencial la resuelve em-api; aquí no se toca.
export function emApiBin(): string {
  if (process.env.EM_API_BIN) return process.env.EM_API_BIN;
  const here = dirname(fileURLToPath(import.meta.url));
  const repoBin = resolve(here, "..", "..", "..", "bin", "em-api");
  return existsSync(repoBin) ? repoBin : "em-api";
}

// Transport por defecto: cada petición la hace `em-api dataforseo <MÉTODO> <ruta> [--data @fichero]`.
export async function emApiTransport(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input instanceof Request ? input.url : input);
  const path = url.startsWith(DATAFORSEO_BASE) ? url.slice(DATAFORSEO_BASE.length) : url;
  const method = init?.method ?? "GET";
  const args = ["dataforseo", method, path];
  let dir: string | undefined;
  try {
    if (typeof init?.body === "string") {
      dir = mkdtempSync(join(tmpdir(), "dfs-"));
      const file = join(dir, "body.json");
      writeFileSync(file, init.body, { mode: 0o600 });
      args.push("--data", `@${file}`);
    }
    const r = spawnSync(emApiBin(), args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    if (r.error) throw r.error;
    const headers = { "content-type": "application/json" };
    if (r.status === 0) return new Response(r.stdout, { status: 200, headers });
    // Fallo HTTP: stderr = "em-api: HTTP <code>\n<cuerpo>"
    const m = /^em-api: HTTP (\d{3})\n?([\s\S]*)$/.exec(r.stderr ?? "");
    if (m) return new Response(m[2], { status: Number(m[1]), headers });
    throw new Error(`em-api falló (exit ${r.status}): ${(r.stderr ?? "").trim()}`);
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}
