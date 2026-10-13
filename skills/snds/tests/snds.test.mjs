// Tests de scripts/snds.mjs con em-api simulado. Uso: node --test skills/snds/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SNDS = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "snds.mjs");

// respuestas: { "<ruta con query>": "cuerpo CSV" | {__http: 404} }; ruta ausente = 404
function entorno(respuestas = {}) {
  const d = mkdtempSync(join(tmpdir(), "snds-"));
  const log = join(d, "calls.log");
  const resp = join(d, "resp.json");
  writeFileSync(resp, JSON.stringify(respuestas));
  const fake = join(d, "em-api");
  writeFileSync(fake, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(a)+"\\n");
const r=JSON.parse(fs.readFileSync(${JSON.stringify(resp)},"utf8"));const v=r[a[2]];
if(v===undefined){process.stderr.write("em-api: HTTP 404\\n");process.exit(1)}
if(typeof v==="object"){process.stderr.write("em-api: HTTP "+v.__http+"\\n");process.exit(1)}
process.stdout.write(v+"\\n");`);
  chmodSync(fake, 0o755);
  const run = (...args) => spawnSync("node", [SNDS, ...args], { env: { ...process.env, EM_API_BIN: fake }, encoding: "utf8" });
  const calls = () => existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  return { run, calls };
}

const FILA1 = "193.3.232.11,5/10/2026 1:00 AM,5/10/2026 11:00 AM,1000,900,950,GREEN,< 0.1%,,,0,,";
const FILA2 = "193.3.232.11,5/10/2026 11:00 AM,5/10/2026 8:00 PM,500,400,450,YELLOW,0.1% - 1%,5/10/2026 7:53 PM,5/10/2026 7:53 PM,1,,";
const FILA3 = "193.3.232.28,5/10/2026 1:00 AM,5/10/2026 11:00 AM,10,10,10,GREEN,< 0.1%,,,0,helo.x.com,a@x.com";

test("1 datos sin fecha: CSV a JSON y resumen por IP", () => {
  const e = entorno({ "/DataKey": [FILA1, FILA2, FILA3].join("\n") });
  const r = e.run("datos");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(e.calls()[0], ["snds", "GET", "/DataKey"]);
  const j = JSON.parse(r.stdout);
  assert.equal(j.filas.length, 3);
  assert.equal(j.filas[0].ip, "193.3.232.11");
  assert.equal(j.filas[0].rcpt, 1000);
  assert.equal(j.filas[0].filtro, "GREEN");
  assert.equal(j.filas[0].quejas, "< 0.1%");
  assert.equal(j.filas[1].trap_hits, 1);
  assert.equal(j.filas[2].helo, "helo.x.com");
  assert.equal(j.filas[2].mail_from, "a@x.com");
  const ip = j.resumen_por_ip.find((x) => x.ip === "193.3.232.11");
  assert.equal(ip.rcpt, 1500); assert.equal(ip.data, 1300); assert.equal(ip.destinatarios, 1400);
  assert.equal(ip.peor_filtro, "YELLOW"); assert.equal(ip.quejas_max, "0.1% - 1%"); assert.equal(ip.trap_hits, 1);
});

test("2 datos con --fecha y --ip pasan Date e ip", () => {
  const e = entorno({ "/DataKey?Date=071426&ip=193.3.232.38": FILA3 });
  const r = e.run("datos", "--fecha", "071426", "--ip", "193.3.232.38");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(e.calls()[0][2], "/DataKey?Date=071426&ip=193.3.232.38");
});

test("3 fecha mal formada: uso (2) y sin llamadas", () => {
  const e = entorno();
  const r = e.run("datos", "--fecha", "2026-07-14");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /MMDDYY/);
  assert.equal(e.calls().length, 0);
});

test("4 datos 404 sin fecha: clave caducada", () => {
  const e = entorno();
  const r = e.run("datos");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /clave caducada: renovar en el portal SNDS, cuenta marcos@, cada 30 días/);
  assert.equal(e.calls().length, 1);
});

test("5 datos 404 con fecha pero clave válida: sin datos para esa fecha", () => {
  const e = entorno({ "/DataKey": FILA1 });
  const r = e.run("datos", "--fecha", "010126");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /sin datos para esa fecha/);
  assert.doesNotMatch(r.stderr, /caducada/);
  assert.deepEqual(e.calls().map((c) => c[2]), ["/DataKey?Date=010126", "/DataKey"]);
});

test("6 datos 404 con fecha y sonda 404: clave caducada", () => {
  const e = entorno();
  const r = e.run("datos", "--fecha", "010126");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /clave caducada/);
});

test("7 estado 200 vacío: sin IPs listadas", () => {
  const e = entorno({ "/IpStatusKey": "" });
  const r = e.run("estado");
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.listadas.length, 0);
  assert.match(j.estado, /sin listing/);
});

test("8 estado 200 con filas: devuelve columnas crudas", () => {
  const e = entorno({ "/IpStatusKey": "193.3.232.10,193.3.232.12,Blocked,motivo" });
  const r = e.run("estado");
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.equal(j.listadas.length, 1);
  assert.deepEqual(j.listadas[0].columnas, ["193.3.232.10", "193.3.232.12", "Blocked", "motivo"]);
  assert.match(j.estado, /LISTADAS/);
});

test("9 estado 404 con clave válida (DataKey 200): sin listing hoy, exit 0", () => {
  const e = entorno({ "/DataKey": FILA1 });
  const r = e.run("estado");
  assert.equal(r.status, 0, r.stderr);
  assert.match(JSON.parse(r.stdout).estado, /sin listing hoy/);
  assert.deepEqual(e.calls().map((c) => c[2]), ["/IpStatusKey", "/DataKey"]);
});

test("10 estado 404 y DataKey 404: clave caducada, exit 1", () => {
  const e = entorno();
  const r = e.run("estado");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /clave caducada: renovar en el portal SNDS, cuenta marcos@, cada 30 días/);
  assert.equal(r.stdout, "");
});

test("11 HTTP 400: clave inválida o petición mal formada", () => {
  const e = entorno({ "/IpStatusKey": { __http: 400 } });
  const r = e.run("estado");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /HTTP 400/);
  assert.match(r.stderr, /inválida/);
});

test("12 comando desconocido: uso (2)", () => {
  const e = entorno();
  assert.equal(e.run("borrar").status, 2);
  assert.equal(e.calls().length, 0);
});

test("13 la clave nunca aparece en la salida ni en los argumentos", () => {
  const e = entorno({ "/DataKey": FILA1 });
  const r = e.run("datos");
  assert.doesNotMatch(r.stdout + r.stderr, /Key=/i);
  assert.ok(e.calls().every((c) => !c.join(" ").match(/key=/i)));
});
