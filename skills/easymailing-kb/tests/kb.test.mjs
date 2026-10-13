// Tests de scripts/kb.mjs con em-api simulado. Uso: node --test skills/easymailing-kb/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const KB = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "kb.mjs");

function entorno(respuesta, fallo = false) {
  const d = mkdtempSync(join(tmpdir(), "kb-"));
  const log = join(d, "calls.log");
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);
let data=null;const i=a.indexOf("--data");if(i>=0){const v=a[i+1];data=v.startsWith("@")?fs.readFileSync(v.slice(1),"utf8"):v;}
fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({args:a,data})+"\\n");
if(${fallo}){process.stderr.write("em-api: HTTP 401\\n");process.exit(1)}
process.stdout.write(${JSON.stringify(JSON.stringify(respuesta))});`);
  chmodSync(fake, 0o755);
  const run = (...args) => spawnSync("node", [KB, ...args], { env: { ...process.env, EM_API_BIN: fake }, encoding: "utf8" });
  const calls = () => existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  return { run, calls };
}
const RESP = { data: [{ score: 0.8765, attributes: { title: "Automatizaciones", type: "help_center", url: "https://x/y" }, content: [{ text: "a".repeat(400) }] }] };

test("1 buscar hace POST al vector store con max por defecto 5", () => {
  const e = entorno(RESP);
  const r = e.run("buscar", "automatizaciones");
  assert.equal(r.status, 0, r.stderr);
  const c = e.calls()[0];
  assert.deepEqual(c.args.slice(0, 3), ["openai-kb", "POST", "/vector_stores/vs_697921a6ab408191bfb8c96447b733da/search"]);
  assert.deepEqual(JSON.parse(c.data), { query: "automatizaciones", max_num_results: 5 });
  assert.match(r.stdout, /Automatizaciones\nType: help_center {2}Score: 0\.87\nURL: https:\/\/x\/y/);
  assert.match(r.stdout, /--- 1 resultado\(s\) encontrado\(s\) ---/);
  assert.ok(!r.stdout.includes("a".repeat(301)));
});

test("2 --max, --type y --full", () => {
  const e = entorno(RESP);
  const r = e.run("buscar", "precios", "--max", "3", "--type", "prices", "--full");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(e.calls()[0].data), { query: "precios", max_num_results: 3, filters: { type: "eq", key: "type", value: "prices" } });
  assert.ok(r.stdout.includes("a".repeat(400)));
});

test("3 --limit y --filtro son alias", () => {
  const e = entorno(RESP);
  e.run("buscar", "x", "--limit", "2", "--filtro", "blog");
  const b = JSON.parse(e.calls()[0].data);
  assert.equal(b.max_num_results, 2); assert.equal(b.filters.value, "blog");
});

test("4 tipo no valido, sin consulta o max no numérico: error sin llamar", () => {
  const e = entorno(RESP);
  assert.notEqual(e.run("buscar", "x", "--type", "nada").status, 0);
  assert.notEqual(e.run("buscar").status, 0);
  assert.notEqual(e.run("buscar", "x", "--max", "abc").status, 0);
  assert.equal(e.calls().length, 0);
});

test("5 fallo de em-api sale con error", () => {
  const e = entorno(RESP, true);
  const r = e.run("buscar", "x");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /kb:.*401/);
});
