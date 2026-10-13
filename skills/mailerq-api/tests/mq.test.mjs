// Tests de scripts/mq.mjs con em-api simulado. Uso: node --test skills/mailerq-api/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MQ = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "mq.mjs");

// respuestas: { "<ruta sin query>": cuerpo | {__fallo: "HTTP 503\ncuerpo"} }
function entorno(respuestas = {}) {
  const d = mkdtempSync(join(tmpdir(), "mq-"));
  const log = join(d, "calls.log");
  const resp = join(d, "resp.json");
  writeFileSync(resp, JSON.stringify(respuestas));
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+"\\n");
const r=JSON.parse(fs.readFileSync(${JSON.stringify(resp)},"utf8"));const k=a[2].split("?")[0];
const v=r[k];
if(v&&v.__fallo){process.stderr.write("em-api: "+v.__fallo+"\\n");process.exit(1)}
process.stdout.write(v===undefined?"{}":JSON.stringify(v)+"\\n");`);
  chmodSync(fake, 0o755);
  const run = (...args) => spawnSync("node", [MQ, ...args], { env: { ...process.env, EM_API_BIN: fake }, encoding: "utf8" });
  const calls = () => existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { run, calls };
}

test("1 stats resumen usa 24 h por defecto", () => {
  const e = entorno({ "/stats/summary": { total: 10, success_rate: 99 } });
  const r = e.run("stats");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(e.calls()[0], ["mailerq", "GET", "/stats/summary?hours=24"]);
  assert.match(r.stdout, /"total": 10/);
});

test("2 stats por dominio con horas y filtro", () => {
  const e = entorno();
  const r = e.run("stats", "dominio", "--horas", "6", "--dominio", "gmail.com");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(e.calls()[0], ["mailerq", "GET", "/stats/by-domain?hours=6&domain=gmail.com"]);
});

test("3 logs combina filtros y codifica valores", () => {
  const e = entorno();
  const r = e.run("logs", "--dominio", "gmail.com", "--resultado", "error", "--codigo", "421", "--tag", "a b.easymailing.com", "--limite", "30");
  assert.equal(r.status, 0, r.stderr);
  const ruta = e.calls()[0][2];
  assert.ok(ruta.startsWith("/logs?"));
  const q = new URL("http://x" + ruta).searchParams;
  assert.equal(q.get("domain"), "gmail.com");
  assert.equal(q.get("result"), "error");
  assert.equal(q.get("code"), "421");
  assert.equal(q.get("tag"), "a b.easymailing.com");
  assert.equal(q.get("limit"), "30");
});

test("4 recientes, clientes y alertas apuntan al endpoint correcto", () => {
  const e = entorno();
  e.run("recientes", "--minutos", "10");
  e.run("clientes", "--horas", "12");
  e.run("alertas", "bloqueadas");
  e.run("alertas", "regresiones", "--horas", "3");
  e.run("alertas", "salud");
  assert.deepEqual(e.calls().map((c) => c[2]), [
    "/logs/recent?minutes=10", "/tags/clients?hours=12", "/alerts/blocked-ips?hours=6",
    "/alerts/ip-regressions?hours=3", "/alerts/provider-health?hours=24",
  ]);
});

test("5 intentos de un mensaje codifica el envelope", () => {
  const e = entorno();
  e.run("intentos", "bounce-c-1@em1.x.com");
  assert.equal(e.calls()[0][2], "/messages/bounce-c-1%40em1.x.com/attempts");
});

test("6 docs sin y con operationId", () => {
  const e = entorno();
  e.run("docs");
  e.run("docs", "getStatsSummary");
  assert.deepEqual(e.calls().map((c) => c[2]), ["/api-docs", "/api-docs/getStatsSummary"]);
});

test("7 listas del proxy son solo lectura (GET)", () => {
  const e = entorno();
  e.run("pausas"); e.run("errores"); e.run("supresiones");
  assert.deepEqual(e.calls().map((c) => c.slice(0, 3).join(" ")), [
    "mailerq GET /mailerq/pauses", "mailerq GET /mailerq/errors", "mailerq GET /mailerq/suppressions",
  ]);
});

test("8 comando de escritura no existe: uso (2) y sin llamadas", () => {
  const e = entorno();
  for (const c of ["pausar", "despausar", "post", "delete"]) {
    const r = e.run(c, "x");
    assert.equal(r.status, 2, c);
  }
  assert.equal(e.calls().length, 0);
});

test("9 check usa el endpoint barato (summary 1 h)", () => {
  const e = entorno({ "/stats/summary": { total: 1 } });
  const r = e.run("check");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(e.calls()[0][2], "/stats/summary?hours=1");
});

for (const code of ["502", "503", "504", "000"]) {
  test(`10 puente caído (HTTP ${code}) da mensaje claro y exit 1`, () => {
    const e = entorno({ "/stats/summary": { __fallo: `HTTP ${code}\nBad gateway` } });
    const r = e.run("stats");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /El puente de MailerQ en el Mac Mini no responde \(bridge-agents\.easymailing\.com\)/);
    assert.equal(r.stdout, "");
  });
}

test("11 otro error HTTP no se confunde con el puente", () => {
  const e = entorno({ "/stats/summary": { __fallo: "HTTP 401\nunauthorized" } });
  const r = e.run("stats");
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stderr, /puente de MailerQ/);
  assert.match(r.stderr, /HTTP 401/);
});

test("12 get genérico solo acepta rutas relativas", () => {
  const e = entorno();
  const r = e.run("get", "https://otro.host/x");
  assert.equal(r.status, 2);
  assert.equal(e.calls().length, 0);
  const ok = e.run("get", "/stats/by-ip?hours=1");
  assert.equal(ok.status, 0);
  assert.equal(e.calls()[0][2], "/stats/by-ip?hours=1");
});
