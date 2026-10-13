#!/usr/bin/env node
// kb — búsqueda semántica en la Knowledge Base pública de Easymailing (OpenAI Vector Store)
// sobre `em-api openai-kb`. Solo lectura. Sin dependencias.
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const EM_API = process.env.EM_API_BIN || (() => { const r = join(import.meta.dirname, "..", "..", "..", "bin", "em-api"); return existsSync(r) ? r : "em-api"; })();
const VECTOR_STORE_ID = process.env.EASYMAILING_KB_VECTOR_STORE_ID || "vs_697921a6ab408191bfb8c96447b733da";
const TIPOS = ["blog", "guides", "help_center", "api_docs", "integrations", "legal", "prices"];

function fallo(msg) { process.stderr.write(`kb: ${msg}\n`); process.exit(1); }
const AYUDA = `Uso: kb buscar "<consulta>" [--max N] [--type TIPO] [--full]
  --max N | --limit N      resultados (por defecto 5)
  --type TIPO | --filtro TIPO   ${TIPOS.join(", ")}
  --full | --completo      contenido completo de cada resultado`;

const [cmd, ...resto] = process.argv.slice(2);
if (cmd !== "buscar") { process.stdout.write(AYUDA + "\n"); process.exit(cmd === undefined || cmd === "--help" || cmd === "-h" ? 0 : 1); }

let consulta = "", tipo = "", max = 5, completo = false;
for (let i = 0; i < resto.length; i++) {
  const a = resto[i];
  if (a === "--max" || a === "--limit") max = resto[++i];
  else if (a === "--type" || a === "--filtro") tipo = resto[++i] ?? "";
  else if (a === "--full" || a === "--completo") completo = true;
  else if (a === "--help" || a === "-h") { process.stdout.write(AYUDA + "\n"); process.exit(0); }
  else consulta = a;
}
if (!consulta) fallo(`consulta requerida.\n${AYUDA}`);
if (!/^\d+$/.test(String(max)) || Number(max) < 1) fallo("--max debe ser un entero positivo");
if (tipo && !TIPOS.includes(tipo)) fallo(`tipo '${tipo}' no válido. Tipos: ${TIPOS.join(" ")}`);

const body = { query: consulta, max_num_results: Number(max) };
if (tipo) body.filters = { type: "eq", key: "type", value: tipo };
const f = join(mkdtempSync(join(tmpdir(), "kb-")), "body.json");
writeFileSync(f, JSON.stringify(body));
const r = spawnSync(EM_API, ["openai-kb", "POST", `/vector_stores/${VECTOR_STORE_ID}/search`, "--data", `@${f}`], { encoding: "utf8" });
if (r.status !== 0) fallo(`la búsqueda falló${r.stderr ? `: ${r.stderr.trim()}` : ""}`);
let resp;
try { resp = JSON.parse(r.stdout); } catch { fallo("respuesta no válida de OpenAI"); }
const datos = resp.data || [];
for (const x of datos) {
  const a = x.attributes || {};
  const texto = x.content?.[0]?.text ?? "";
  const score = Math.floor((x.score ?? 0) * 100) / 100;
  process.stdout.write(`---\n${a.title}\nType: ${a.type}  Score: ${score}\nURL: ${a.url}\n${completo ? texto : [...texto].slice(0, 300).join("") + "..."}\n\n`);
}
process.stdout.write(`--- ${datos.length} resultado(s) encontrado(s) ---\n`);
