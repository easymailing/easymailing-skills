// Tests de scripts/zs.mjs con em-api simulado. Uso: node --test skills/zendesk-support/tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ZS = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "zs.mjs");
function entorno(resp = {}) {
  const d = mkdtempSync(join(tmpdir(), "zs-")); const log = join(d, "c.log"); const r = join(d, "r.json");
  writeFileSync(r, JSON.stringify(resp));
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);let data=null;const i=a.indexOf("--data");if(i>=0){const v=a[i+1];data=v.startsWith("@")?fs.readFileSync(v.slice(1),"utf8"):v;}
fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({args:a.slice(0,3),data,sub:process.env.ZENDESK_SUBDOMAIN||null})+"\\n");
const r=JSON.parse(fs.readFileSync(${JSON.stringify(r)},"utf8"));const k=a[1]+" "+a[2].split("?")[0];process.stdout.write(JSON.stringify(r[k]??{}));`);
  chmodSync(fake, 0o755);
  const run = (...args) => spawnSync("node", [ZS, ...args], { encoding: "utf8", env: { ...process.env, EM_API_BIN: fake, ZENDESK_SUBDOMAIN: "easymailingv2" } });
  const calls = () => (existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  return { run, calls };
}

test("1 tickets abiertos usa la búsqueda y el subdominio principal", () => {
  const e = entorno({ "GET /search.json": { results: [{ id: 1, subject: "Hola", status: "open", created_at: "2026-10-10T00:00:00Z", updated_at: "2026-10-11T00:00:00Z", priority: null }], count: 1 } });
  const r = e.run("tickets", "--estado", "abiertos");
  assert.equal(r.status, 0, r.stderr);
  const c = e.calls()[0];
  assert.equal(c.sub, "easymailing");
  assert.match(decodeURIComponent(c.args[2]), /type:ticket status:open/);
  assert.match(r.stdout, /"asunto": "Hola"/);
});

test("2 ticket con comentarios", () => {
  const e = entorno({ "GET /tickets/7.json": { ticket: { id: 7, subject: "S", status: "pending" } }, "GET /tickets/7/comments.json": { comments: [{ id: 1, public: true, body: "texto", created_at: "x", author_id: 3 }] } });
  const r = e.run("ticket", "7");
  assert.equal(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout);
  assert.equal(o.ticket.id, 7); assert.equal(o.comentarios.length, 1);
});

test("3 metricas cuenta por estado", () => {
  const e = entorno({ "GET /search/count.json": { count: 4 } });
  const r = e.run("metricas");
  assert.equal(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout);
  assert.equal(o.por_estado.open, 4);
  assert.ok(e.calls().length >= 5);
});

test("4 responder exige --confirmado y no escribe sin él", () => {
  const e = entorno({});
  const r = e.run("responder", "7", "--interno", "--texto", "nota");
  assert.notEqual(r.status, 0);
  assert.equal(e.calls().filter((c) => c.args[1] === "PUT").length, 0);
});

test("5 responder interno con --confirmado hace PUT con public false", () => {
  const e = entorno({ "PUT /tickets/7.json": { ticket: { id: 7 } } });
  const r = e.run("responder", "7", "--interno", "--texto", "nota", "--confirmado");
  assert.equal(r.status, 0, r.stderr);
  const put = e.calls().find((c) => c.args[1] === "PUT");
  assert.equal(JSON.parse(put.data).ticket.comment.public, false);
});
