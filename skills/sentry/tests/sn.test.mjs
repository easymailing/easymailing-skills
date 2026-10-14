// Tests de scripts/sn.mjs con em-api simulado.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SN = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "sn.mjs");
function entorno(resp = {}, env = {}) {
  const d = mkdtempSync(join(tmpdir(), "sn-")); const log = join(d, "c.log"); const r = join(d, "r.json");
  writeFileSync(r, JSON.stringify(resp));
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+"\\n");
const r=JSON.parse(fs.readFileSync(${JSON.stringify(r)},"utf8"));const k=a[1]+" "+a[2].split("?")[0];
if(!(k in r)){process.stderr.write("em-api: HTTP 404");process.exit(1)}process.stdout.write(JSON.stringify(r[k]));`);
  chmodSync(fake, 0o755);
  const run = (...args) => spawnSync("node", [SN, ...args], { encoding: "utf8", env: { ...process.env, EM_API_BIN: fake, ...env } });
  const calls = () => (existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l)) : []);
  return { run, calls };
}
const ISSUE = { id: "42", shortId: "CUSTOMER-APP-1A", title: "TypeError: x is undefined", culprit: "app/pages/contacts.vue", level: "error", status: "unresolved", count: "120", userCount: 7, firstSeen: "2026-10-01T10:00:00Z", lastSeen: "2026-10-13T09:00:00Z", permalink: "https://easymailing.sentry.io/issues/42/", project: { slug: "customer-app" } };

test("1 issues: por defecto los tres proyectos, sin resolver, solo GET", () => {
  const e = entorno({ "GET /projects/easymailing/easymailing/issues/": [ISSUE], "GET /projects/easymailing/customer-app/issues/": [ISSUE], "GET /projects/easymailing/website-nuxt-5w/issues/": [] });
  const r = e.run("issues");
  assert.equal(r.status, 0, r.stderr);
  const c = e.calls();
  assert.deepEqual(c.map((x) => x[2].split("?")[0]), ["/projects/easymailing/easymailing/issues/", "/projects/easymailing/customer-app/issues/", "/projects/easymailing/website-nuxt-5w/issues/"]);
  assert.ok(c.every((x) => x[0] === "sentry" && x[1] === "GET"));
  assert.match(decodeURIComponent(c[0][2]), /query=is:unresolved/);
  const o = JSON.parse(r.stdout);
  assert.equal(o.incidencias.length, 2);
  assert.deepEqual(Object.keys(o.incidencias[0]).sort(), ["culprit", "enlace", "eventos", "id", "nivel", "primera_vez", "proyecto", "titulo", "ultima_vez", "usuarios"].sort());
  assert.equal(o.incidencias[0].eventos, 120);
});

test("2 issues --proyecto, --query, --orden y --max", () => {
  const e = entorno({ "GET /projects/easymailing/customer-app/issues/": [ISSUE] });
  const r = e.run("issues", "--proyecto", "customer-app", "--query", "level:error", "--orden", "freq", "--max", "5");
  assert.equal(r.status, 0, r.stderr);
  const q = decodeURIComponent(e.calls()[0][2]);
  assert.match(q, /query=level:error/); assert.match(q, /sort=freq/); assert.match(q, /limit=5/);
});

test("3 issue <SHORT-ID>: resuelve el short id y no expone request (cookies, cabeceras)", () => {
  const ev = { eventID: "e1", dateCreated: "2026-10-13T09:00:00Z", tags: [{ key: "release", value: "v1.30" }, { key: "url", value: "https://x/contactos" }],
    entries: [
      { type: "exception", data: { values: [{ type: "TypeError", value: "x is undefined", stacktrace: { frames: [{ filename: "a.js", function: "f", lineNo: 1, inApp: false }, { filename: "app/pages/contacts.vue", function: "load", lineNo: 88, inApp: true }] } }] } },
      { type: "request", data: { url: "https://x/contactos", method: "GET", cookies: [["PHPSESSID", "secreto"]], headers: [["Authorization", "Bearer abc"]] } },
    ] };
  const e = entorno({ "GET /organizations/easymailing/shortids/CUSTOMER-APP-1A/": { groupId: "42" }, "GET /organizations/easymailing/issues/42/": ISSUE, "GET /organizations/easymailing/issues/42/events/latest/": ev });
  const r = e.run("issue", "CUSTOMER-APP-1A");
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /PHPSESSID|secreto|Bearer abc|cookies|headers/);
  const o = JSON.parse(r.stdout);
  assert.equal(o.incidencia.id, "CUSTOMER-APP-1A");
  assert.equal(o.ultimo_evento.excepcion.tipo, "TypeError");
  assert.deepEqual(o.ultimo_evento.excepcion.marcos_app, [{ fichero: "app/pages/contacts.vue", funcion: "load", linea: 88 }]);
  assert.equal(o.ultimo_evento.peticion.url, "https://x/contactos");
  assert.equal(o.ultimo_evento.release, "v1.30");
});

test("4 issue con id numérico no llama a shortids", () => {
  const e = entorno({ "GET /organizations/easymailing/issues/42/": ISSUE, "GET /organizations/easymailing/issues/42/events/latest/": { entries: [] } });
  const r = e.run("issue", "42");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!e.calls().some((c) => c[2].includes("shortids")));
});

test("5 eventos <id> lista eventos sin datos de petición", () => {
  const e = entorno({ "GET /organizations/easymailing/issues/42/events/": [{ eventID: "e1", dateCreated: "2026-10-13T09:00:00Z", message: "boom", user: { email: "cliente@example.com" }, tags: [{ key: "release", value: "v1" }] }] });
  const r = e.run("eventos", "42", "--max", "3");
  assert.equal(r.status, 0, r.stderr);
  assert.match(decodeURIComponent(e.calls()[0][2]), /per_page=3|limit=3/);
  assert.doesNotMatch(r.stdout, /cliente@example\.com/);
  assert.equal(JSON.parse(r.stdout).eventos[0].id, "e1");
});

test("6 resumen: nuevas y más frecuentes de las últimas 24 h por proyecto", () => {
  const e = entorno({ "GET /projects/easymailing/easymailing/issues/": [ISSUE], "GET /projects/easymailing/customer-app/issues/": [], "GET /projects/easymailing/website-nuxt-5w/issues/": [] });
  const r = e.run("resumen");
  assert.equal(r.status, 0, r.stderr);
  const qs = e.calls().map((c) => decodeURIComponent(c[2]));
  assert.ok(qs.some((q) => /firstSeen:-24h/.test(q)), "pide las nuevas");
  assert.ok(qs.some((q) => /sort=freq/.test(q) && /statsPeriod=24h/.test(q)), "pide las frecuentes");
  const o = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(o.proyectos), ["easymailing", "customer-app", "website-nuxt-5w"]);
});

test("7 proyectos lista los de la organización", () => {
  const e = entorno({ "GET /organizations/easymailing/projects/": [{ slug: "easymailing", platform: "php" }, { slug: "customer-app", platform: "javascript-nuxt" }] });
  const r = e.run("proyectos");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout).proyectos.map((p) => p.slug), ["easymailing", "customer-app"]);
});

test("8 SENTRY_PROJECTS cambia los proyectos por defecto; id inválido da error de uso", () => {
  const e = entorno({ "GET /projects/easymailing/web/issues/": [] }, { SENTRY_PROJECTS: "web" });
  assert.equal(e.run("issues").status, 0);
  assert.deepEqual(e.calls().map((c) => c[2].split("?")[0]), ["/projects/easymailing/web/issues/"]);
  const r = e.run("issue", "../../users");
  assert.equal(r.status, 2); assert.match(r.stderr, /uso|id/i);
});

test("9 resolver: sin --confirmado no escribe; con --confirmado hace PUT status=resolved", () => {
  const e = entorno({ "GET /organizations/easymailing/shortids/CUSTOMER-APP-1A/": { groupId: "42" }, "PUT /organizations/easymailing/issues/42/": { id: "42", status: "resolved" } });
  const r1 = e.run("resolver", "CUSTOMER-APP-1A");
  assert.notEqual(r1.status, 0); assert.match(r1.stderr, /--confirmado/);
  assert.ok(!e.calls().some((c) => c[1] !== "GET"), "sin confirmar no hay escrituras");
  const r2 = e.run("resolver", "CUSTOMER-APP-1A", "--confirmado");
  assert.equal(r2.status, 0, r2.stderr);
  const put = e.calls().find((c) => c[1] === "PUT");
  assert.equal(put[2], "/organizations/easymailing/issues/42/");
  assert.equal(put[3], "--data"); assert.deepEqual(JSON.parse(put[4]), { status: "resolved" });
  assert.deepEqual(JSON.parse(r2.stdout), { id: "CUSTOMER-APP-1A", estado: "resolved" });
});
