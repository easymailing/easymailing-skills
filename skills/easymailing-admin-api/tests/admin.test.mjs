// Tests de scripts/admin.mjs con em-api simulado. Uso: node --test skills/easymailing-admin-api/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ADMIN = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "admin.mjs");
const SPEC = {
  paths: {
    "/api/admin/issues": { get: { summary: "Lista issues", tags: ["Issue"], parameters: [{ name: "status", in: "query", required: false, schema: { type: "string", enum: ["open", "resolved"] } }],
      responses: { 200: { content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Issue" } } } } } } } },
    "/api/admin/campaigns": { get: { summary: "Campañas", description: "Lista campaign", tags: ["Campaign"] } },
    "/api/admin/postmaster_messages/{id}": { delete: { summary: "Borra mensaje", tags: ["Postmaster"] } },
  },
  components: { schemas: { Issue: { type: "object", properties: { id: { type: "integer" }, title: { type: "string" } } } } },
};

function entorno(fallo = false) {
  const d = mkdtempSync(join(tmpdir(), "adm-"));
  const log = join(d, "calls.log");
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+"\\n");
if(${fallo}){process.stderr.write("em-api: HTTP 403\\n");process.exit(1)}
process.stdout.write(a[2]==="/docs.json"?${JSON.stringify(JSON.stringify(SPEC))}:'{"ok":true}');`);
  chmodSync(fake, 0o755);
  const cache = join(d, "cache.json");
  const run = (...args) => spawnSync("node", [ADMIN, ...args], { env: { ...process.env, EM_API_BIN: fake, ADMIN_API_CACHE: cache }, encoding: "utf8" });
  const calls = () => existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  return { run, calls, cache };
}

test("1 list muestra método, ruta y resumen", () => {
  const e = entorno();
  const r = e.run("list");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /GET\s+\/api\/admin\/issues\s+Lista issues/);
  assert.match(r.stdout, /DELETE\s+\/api\/admin\/postmaster_messages\/\{id\}/);
  assert.deepEqual(e.calls()[0], ["admin-api", "GET", "/docs.json"]);
});

test("2 search por ruta, resumen, descripción y tag", () => {
  const e = entorno();
  assert.match(e.run("search", "CAMPAIGN").stdout, /campaigns/);
  const r = e.run("search", "postmaster");
  assert.match(r.stdout, /DELETE/); assert.ok(!r.stdout.includes("issues"));
});

test("3 info resuelve $ref y parámetros", () => {
  const e = entorno();
  const r = e.run("info", "/api/admin/issues");
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.method, "GET");
  assert.deepEqual(j.parameters[0].enum, ["open", "resolved"]);
  assert.deepEqual(j.response_fields, [{ name: "id", type: "integer" }, { name: "title", type: "string" }]);
});

test("4 la spec se cachea: segunda llamada no vuelve a pedirla", () => {
  const e = entorno();
  e.run("list"); e.run("list");
  assert.equal(e.calls().length, 1);
});

test("5 caché caducada (>1 h) se renueva", () => {
  const e = entorno();
  e.run("list");
  const viejo = new Date(Date.now() - 2 * 3600 * 1000);
  utimesSync(e.cache, viejo, viejo);
  e.run("list");
  assert.equal(e.calls().length, 2);
});

test("6 get hace solo GET con query", () => {
  const e = entorno();
  const r = e.run("get", "/support_customers", "--query", "email=a@b.com");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(e.calls()[0], ["admin-api", "GET", "/support_customers", "--query", "email=a@b.com"]);
  assert.match(r.stdout, /"ok": true/);
});

test("7 errores: sin argumentos, fallo de em-api, endpoint inexistente", () => {
  assert.notEqual(entorno().run("info").status, 0);
  const f = entorno(true).run("list");
  assert.equal(f.status, 1); assert.match(f.stderr, /admin:.*403/);
  assert.notEqual(entorno().run("info", "/api/admin/nada").status, 0);
});
