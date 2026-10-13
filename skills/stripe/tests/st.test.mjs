// Tests de scripts/st.mjs con em-api y em-secret simulados.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ST = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "st.mjs");
function entorno(resp = {}, clave = "rk_live_abc") {
  const d = mkdtempSync(join(tmpdir(), "st-")); const log = join(d, "c.log"); const r = join(d, "r.json");
  writeFileSync(r, JSON.stringify(resp));
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+"\\n");
const r=JSON.parse(fs.readFileSync(${JSON.stringify(r)},"utf8"));const k=a[1]+" "+a[2].split("?")[0];process.stdout.write(JSON.stringify(r[k]??{data:[]}));`);
  const sec = join(d, "em-secret"); writeFileSync(sec, `#!/bin/sh\nprintf '%s' '${clave}'\n`);
  chmodSync(fake, 0o755); chmodSync(sec, 0o755);
  const run = (...args) => spawnSync("node", [ST, ...args], { encoding: "utf8", env: { ...process.env, EM_API_BIN: fake, EM_SECRET_BIN: sec, STRIPE_API_KEY: "" } });
  const calls = () => (existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  return { run, calls };
}

test("1 cobros: GET /charges con limit y fecha; importes en unidades", () => {
  const e = entorno({ "GET /charges": { data: [{ id: "ch_1", amount: 1999, currency: "eur", status: "succeeded", created: 1791900000, customer: "cus_1", description: "x" }] } });
  const r = e.run("cobros", "--desde", "2026-10-01", "--max", "5");
  assert.equal(r.status, 0, r.stderr);
  const ruta = e.calls()[0][2];
  assert.match(ruta, /^\/charges\?/); assert.match(ruta, /limit=5/); assert.match(ruta, /created%5Bgte%5D=\d+/);
  assert.equal(JSON.parse(r.stdout).cobros[0].importe, 19.99);
});

test("2 solo GET: ningún comando escribe", () => {
  const e = entorno();
  for (const c of [["cobros"], ["facturas"], ["suscripciones"], ["disputas"], ["cliente", "a@b.com"]]) e.run(...c);
  assert.ok(e.calls().every((a) => a[1] === "GET"));
});

test("3 check avisa si la clave no es restringida, sin imprimirla", () => {
  const e = entorno({ "GET /balance": { object: "balance" } }, "sk_live_SECRETA");
  const r = e.run("check");
  assert.match(r.stdout + r.stderr, /no es restringida/i);
  assert.doesNotMatch(r.stdout + r.stderr, /SECRETA/);
});

test("4 check OK con clave restringida", () => {
  const e = entorno({ "GET /balance": { object: "balance" } }, "rk_live_x");
  const r = e.run("check");
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /restringida/);
});

test("5 cliente por email usa la búsqueda", () => {
  const e = entorno({ "GET /customers/search": { data: [{ id: "cus_1", email: "a@b.com", name: "A", created: 1 }] } });
  const r = e.run("cliente", "a@b.com");
  assert.equal(r.status, 0, r.stderr);
  assert.match(decodeURIComponent(e.calls()[0][2]), /email:'a@b.com'/);
});
