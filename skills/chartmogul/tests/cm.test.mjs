// Tests de scripts/cm.mjs con em-api simulado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CM = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "cm.mjs");
function entorno(resp = {}) {
  const d = mkdtempSync(join(tmpdir(), "cm-")); const log = join(d, "c.log"); const r = join(d, "r.json");
  writeFileSync(r, JSON.stringify(resp));
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+"\\n");
const r=JSON.parse(fs.readFileSync(${JSON.stringify(r)},"utf8"));const k=a[1]+" "+a[2].split("?")[0];process.stdout.write(JSON.stringify(r[k]??{}));`);
  chmodSync(fake, 0o755);
  const run = (...args) => spawnSync("node", [CM, ...args], { encoding: "utf8", env: { ...process.env, EM_API_BIN: fake } });
  const calls = () => (existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  return { run, calls };
}

test("1 metricas mrr: fechas, intervalo y céntimos a unidades", () => {
  const e = entorno({ "GET /metrics/mrr": { entries: [{ date: "2026-09-30", mrr: 590938, "mrr-new-business": 10000 }], summary: { current: 590938, previous: 634107, "percentage-change": -6.8 } } });
  const r = e.run("metricas", "mrr", "--desde", "2026-09-01", "--hasta", "2026-09-30", "--intervalo", "month");
  assert.equal(r.status, 0, r.stderr);
  const ruta = e.calls()[0][2];
  assert.match(ruta, /^\/metrics\/mrr\?/); assert.match(ruta, /start-date=2026-09-01/); assert.match(ruta, /end-date=2026-09-30/); assert.match(ruta, /interval=month/);
  const o = JSON.parse(r.stdout);
  assert.equal(o.serie[0].mrr, 5909.38); assert.equal(o.resumen.actual, 5909.38);
});

test("2 metricas por defecto: últimos 12 meses mensual", () => {
  const e = entorno({ "GET /metrics/all": { entries: [] } });
  e.run("metricas", "todas");
  const ruta = e.calls()[0][2];
  assert.match(ruta, /^\/metrics\/all\?/); assert.match(ruta, /interval=month/); assert.match(ruta, /start-date=\d{4}-\d{2}-\d{2}/);
});

test("3 metrica desconocida da error de uso sin llamar", () => {
  const e = entorno();
  const r = e.run("metricas", "inventada");
  assert.notEqual(r.status, 0); assert.equal(e.calls().length, 0);
});

test("4 clientes buscar por email", () => {
  const e = entorno({ "GET /customers/search": { entries: [{ uuid: "cus_1", name: "ACME", email: "a@b.com", status: "Active", mrr: 4900, "customer-since": "2024-01-01" }] } });
  const r = e.run("clientes", "buscar", "a@b.com");
  assert.equal(r.status, 0, r.stderr);
  assert.match(e.calls()[0][2], /email=a%40b\.com/);
  assert.equal(JSON.parse(r.stdout).clientes[0].mrr, 49);
});

test("5 movimientos con tipo y desde, solo GET", () => {
  const e = entorno({ "GET /activities": { entries: [{ type: "churn", date: "2026-10-01T00:00:00Z", "activity-mrr-movement": -4900, "customer-name": "X", "customer-uuid": "cus_2" }], has_more: false } });
  const r = e.run("movimientos", "--tipo", "churn", "--desde", "2026-10-01");
  assert.equal(r.status, 0, r.stderr);
  const c = e.calls(); assert.ok(c.every((a) => a[1] === "GET"));
  assert.match(c[0][2], /type=churn/); assert.match(c[0][2], /start-date=2026-10-01/);
  assert.equal(JSON.parse(r.stdout).movimientos[0].mrr, -49);
});

test("6 bajas-mrr: la tasa es porcentaje (no se divide); importes de todas sí", () => {
  const e = entorno({
    "GET /metrics/mrr-churn-rate": { entries: [{ date: "2026-09-30", "mrr-churn-rate": 3.2 }], summary: { current: 3.2, previous: 2.1, "percentage-change": 52 } },
    "GET /metrics/all": { entries: [{ date: "2026-09-30", mrr: 590938, "mrr-expansion": 1500, "mrr-churn-rate": 3.2, "customer-churn-rate": 2.5, customers: 300 }] },
  });
  const b = JSON.parse(e.run("metricas", "bajas-mrr").stdout);
  assert.equal(b.serie[0]["mrr-churn-rate"], 3.2); assert.equal(b.resumen.actual, 3.2);
  const t = JSON.parse(e.run("metricas", "todas").stdout).serie[0];
  assert.equal(t.mrr, 5909.38); assert.equal(t["mrr-expansion"], 15); assert.equal(t["mrr-churn-rate"], 3.2); assert.equal(t["customer-churn-rate"], 2.5); assert.equal(t.customers, 300);
});
