// Tests de scripts/sb.mjs con em-api simulado. Uso: node --test skills/storyblok-content/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SB = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "sb.mjs");

function entorno(respuestas = {}) {
  const d = mkdtempSync(join(tmpdir(), "sb-"));
  const log = join(d, "calls.log");
  const resp = join(d, "resp.json");
  writeFileSync(resp, JSON.stringify(respuestas));
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);
let data=null;const i=a.indexOf("--data");if(i>=0){const v=a[i+1];data=v.startsWith("@")?fs.readFileSync(v.slice(1),"utf8"):v;}
fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({args:a.slice(0,3),data})+"\\n");
const r=JSON.parse(fs.readFileSync(${JSON.stringify(resp)},"utf8"));const k=a[1]+" "+a[2].split("?")[0];
if(r[k]===undefined){process.stdout.write("{}");process.exit(0)}if(r[k]==="FAIL"){process.exit(1)}process.stdout.write(JSON.stringify(r[k]));`);
  chmodSync(fake, 0o755);
  const md2rt = join(d, "md2rt");
  writeFileSync(md2rt, `#!/bin/sh\necho '{"success":true,"data":{"type":"doc","content":[]}}'\n`);
  chmodSync(md2rt, 0o755);
  const backups = join(d, "backups");
  const run = (...args) => spawnSync("node", [SB, ...args], {
    env: { ...process.env, EM_API_BIN: fake, MD2RT_BIN: md2rt, STORYBLOK_BACKUP_DIR: backups }, encoding: "utf8",
  });
  const calls = () => existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  return { d, run, calls, backups };
}

test("1 historia por id", () => {
  const e = entorno({ "GET /stories/42": { story: { id: 42, name: "X" } } });
  const r = e.run("historia", "42");
  assert.equal(r.status, 0);
  assert.deepEqual(e.calls()[0].args, ["storyblok", "GET", "/stories/42"]);
  assert.match(r.stdout, /"id": 42/);
});

test("2 actualizar guarda copia previa antes del PUT", () => {
  const e = entorno({ "GET /stories/42": { story: { id: 42, content: { a: 1 } } } });
  const f = join(e.d, "s.json"); writeFileSync(f, JSON.stringify({ story: { content: { a: 2 } } }));
  const r = e.run("actualizar", "42", f);
  assert.equal(r.status, 0, r.stderr);
  const c = e.calls().map((x) => x.args.slice(1).join(" "));
  assert.deepEqual(c, ["GET /stories/42", "PUT /stories/42"]);
  const b = readdirSync(e.backups);
  assert.equal(b.length, 1); assert.match(b[0], /^42-.*\.json$/);
  assert.equal(JSON.parse(readFileSync(join(e.backups, b[0]), "utf8")).story.content.a, 1);
});

test("3 sin copia previa no escribe", () => {
  const e = entorno({ "GET /stories/42": { story: { id: 42 } } });
  writeFileSync(e.backups, "no soy un directorio");
  const f = join(e.d, "s.json"); writeFileSync(f, JSON.stringify({ story: {} }));
  const r = e.run("actualizar", "42", f);
  assert.notEqual(r.status, 0);
  assert.ok(!e.calls().some((x) => x.args[1] === "PUT"));
});

test("4 crear desde markdown en borrador", () => {
  const e = entorno({ "POST /stories": { story: { id: 7 } } });
  const f = join(e.d, "a.md"); writeFileSync(f, "# Hola");
  const r = e.run("crear", f, "--componente", "content-blog-article", "--campo", "content", "--nombre", "Hola", "--slug", "hola", "--padre", "100");
  assert.equal(r.status, 0, r.stderr);
  const post = e.calls().find((x) => x.args[1] === "POST");
  const body = JSON.parse(post.data);
  assert.equal(body.story.content.component, "content-blog-article");
  assert.equal(body.story.parent_id, 100);
  assert.ok(!body.publish);
});

test("5 publicar hace copia previa y luego publish", () => {
  const e = entorno({ "GET /stories/42": { story: { id: 42 } } });
  const r = e.run("publicar", "42");
  assert.equal(r.status, 0, r.stderr);
  const c = e.calls().map((x) => x.args.slice(1).join(" "));
  assert.deepEqual(c, ["GET /stories/42", "GET /stories/42/publish"]);
  assert.equal(readdirSync(e.backups).length, 1);
});

test("6 preview firmada sin token de gestión", () => {
  const ts = Math.floor(Date.now() / 1000);
  const e = entorno({ "GET /stories/42": { story: { id: 42, full_slug: "blog/hola", preview_token: { token: "a".repeat(40), timestamp: String(ts) } } } });
  const r = e.run("preview", "42");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout.trim(), /^https:\/\/easymailing\.com\/blog\/hola\?_storyblok=42&_storyblok_tk%5Bspace_id%5D=310467&_storyblok_tk%5Btimestamp%5D=\d+&_storyblok_tk%5Btoken%5D=a{40}$/);
});

test("7 publicada usa la CDN con version published", () => {
  const e = entorno({ "GET /stories/blog/hola": { story: { id: 42, full_slug: "blog/hola" } } });
  const r = e.run("publicada", "blog/hola");
  assert.equal(r.status, 0, r.stderr);
  const c = e.calls()[0];
  assert.equal(c.args[0], "storyblok-cdn");
  assert.equal(c.args[2], "/stories/blog/hola?version=published");
});

test("8 sin EM_API_BIN arranca (usa bin/em-api del repo)", () => {
  const env = { ...process.env }; delete env.EM_API_BIN;
  const r = spawnSync("node", [SB], { env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /uso: sb/);
});
