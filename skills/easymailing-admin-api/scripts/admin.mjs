#!/usr/bin/env node
// admin — documentación OpenAPI en vivo y lecturas GET de la Admin API de Easymailing,
// sobre `em-api admin-api`. Solo lectura; PATCH/DELETE se hacen a mano con em-api (ver SKILL.md).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const EM_API = process.env.EM_API_BIN || (() => { const r = join(import.meta.dirname, "..", "..", "..", "bin", "em-api"); return existsSync(r) ? r : "em-api"; })();
const CACHE = process.env.ADMIN_API_CACHE || join(tmpdir(), "admin-api-docs-cache.json");
const TTL_MS = 3600 * 1000;

function fallo(msg) { process.stderr.write(`admin: ${msg}\n`); process.exit(1); }
function emapi(args) {
  const r = spawnSync(EM_API, ["admin-api", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) fallo(`${args.slice(0, 2).join(" ")} falló${r.stderr ? `: ${r.stderr.trim()}` : ""}`);
  return r.stdout;
}

function spec() {
  if (existsSync(CACHE) && Date.now() - statSync(CACHE).mtimeMs < TTL_MS) {
    try { return JSON.parse(readFileSync(CACHE, "utf8")); } catch { /* caché corrupta: se renueva */ }
  }
  const txt = emapi(["GET", "/docs.json"]);
  let s;
  try { s = JSON.parse(txt); } catch { fallo("docs.json no es JSON válido"); }
  try { writeFileSync(CACHE, txt, { mode: 0o600 }); } catch { /* sin caché */ }
  return s;
}

const filas = (s) => Object.entries(s.paths || {}).flatMap(([p, ops]) => Object.entries(ops).filter(([, o]) => o && typeof o === "object" && !Array.isArray(o)).map(([m, o]) => ({ m, p, o })));
const tabla = (fs) => { const w = Math.max(0, ...fs.map((f) => f.p.length)); return fs.map((f) => `${f.m.toUpperCase().padEnd(7)} ${f.p.padEnd(w)}  ${f.o.summary || "-"}`).join("\n"); };

function resolver(root, n, prof = 0) {
  if (prof > 12 || !n || typeof n !== "object") return n;
  if (n.$ref) { const d = n.$ref.replace(/^#\//, "").split("/").reduce((a, k) => a?.[k], root); return resolver(root, d, prof + 1); }
  const alt = n.anyOf || n.oneOf;
  if (alt) return resolver(root, alt.find((x) => x.$ref) || alt[0], prof + 1);
  return n;
}

function info(s, path) {
  const ops = s.paths?.[path];
  if (!ops) fallo(`no existe el endpoint '${path}' (usa: list | search <palabra>)`);
  return Object.entries(ops).filter(([, o]) => o && typeof o === "object" && !Array.isArray(o)).map(([m, o]) => {
    const c = o.responses?.["200"]?.content;
    let sch = (c?.["application/json"] || c?.["application/ld+json"])?.schema;
    if (sch) {
      sch = resolver(s, sch);
      if (sch.type === "array") sch = sch.items; else if (sch.properties?.["hydra:member"]) sch = sch.properties["hydra:member"].items;
      sch = resolver(s, sch);
    }
    const tipo = (p) => { const r = resolver(s, p); const t = Array.isArray(r?.type) ? r.type.find((x) => x !== "null") ?? "string" : r?.type; return t || "object"; };
    return {
      method: m.toUpperCase(), path, summary: o.summary || "-", description: o.description || "-", deprecated: o.deprecated || false,
      parameters: (o.parameters || []).map((p) => ({ name: p.name, in: p.in, required: p.required || false, type: p.schema?.type || "string", default: p.schema?.default ?? null, enum: p.schema?.enum ?? null, description: p.description ?? null })),
      response_fields: sch?.properties ? Object.entries(sch.properties).map(([name, v]) => ({ name, type: tipo(v) })) : [],
    };
  });
}

const [cmd, ...r] = process.argv.slice(2);
const AYUDA = `Uso: admin list | search <palabra> | info </api/admin/ruta> | get </ruta> [--query k=v ...]
  list     endpoints de la Admin API (método, ruta, resumen)
  search   busca por ruta, resumen, descripción o tag
  info     parámetros y campos de respuesta de un endpoint
  get      GET de solo lectura (ruta relativa a /api/admin, p. ej. /dashboard_stats)`;
switch (cmd) {
  case "list": console.log(tabla(filas(spec()))); break;
  case "search": {
    if (!r[0]) fallo("falta la palabra a buscar");
    const k = r[0].toLowerCase();
    console.log(tabla(filas(spec()).filter(({ p, o }) => p.toLowerCase().includes(k) || (o.summary || "").toLowerCase().includes(k) || (o.description || "").toLowerCase().includes(k) || (o.tags || []).some((t) => t.toLowerCase().includes(k)))));
    break;
  }
  case "info": {
    if (!r[0]) fallo('falta el endpoint, p. ej. info "/api/admin/issues"');
    const out = info(spec(), r[0]);
    console.log(JSON.stringify(out.length === 1 ? out[0] : out, null, 2));
    break;
  }
  case "get": {
    if (!r[0]) fallo("falta la ruta, p. ej. get /dashboard_stats");
    const args = ["GET", r[0].replace(/^\/api\/admin(?=\/)/, "")];
    for (let i = 1; i < r.length; i++) { if (r[i] === "--query" && r[i + 1]) { args.push("--query", r[++i]); } else fallo(`opción no admitida '${r[i]}'`); }
    const txt = emapi(args);
    try { console.log(JSON.stringify(JSON.parse(txt), null, 2)); } catch { process.stdout.write(txt); }
    break;
  }
  default: console.log(AYUDA); process.exit(!cmd || cmd === "--help" || cmd === "-h" ? 0 : 1);
}
