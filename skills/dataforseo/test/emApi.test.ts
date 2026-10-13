import assert from "node:assert/strict";
import test from "node:test";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { DataForSeoError, request } from "../src/client.js";

function fakeEmApi(resp: { stdout?: string; stderr?: string; exit?: number }) {
  const d = mkdtempSync(join(tmpdir(), "dfs-test-"));
  const log = join(d, "calls.log");
  const bin = join(d, "em-api");
  writeFileSync(bin, `#!/usr/bin/env node
const fs=require("fs");const a=process.argv.slice(2);
const i=a.indexOf("--data");const data=i>=0?fs.readFileSync(a[i+1].slice(1),"utf8"):null;
fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({args:a,data,env:process.env.DATAFORSEO_API_TOKEN||null})+"\\n");
process.stdout.write(${JSON.stringify(resp.stdout ?? "")});process.stderr.write(${JSON.stringify(resp.stderr ?? "")});process.exit(${resp.exit ?? 0});`);
  chmodSync(bin, 0o755);
  process.env.EM_API_BIN = bin;
  return () => readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
}

test("el transport por defecto llama a `em-api dataforseo POST <ruta> --data @fichero`", async () => {
  const calls = fakeEmApi({ stdout: JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ x: 1 }] }] }) });
  const out = await request("/keywords_data/google_ads/search_volume/live", [{ keywords: ["a"] }], { fullResponse: true });
  assert.deepEqual(out, [{ x: 1 }]);
  const [c] = calls();
  assert.deepEqual(c.args.slice(0, 3), ["dataforseo", "POST", "/keywords_data/google_ads/search_volume/live"]);
  assert.equal(c.args[3], "--data");
  assert.deepEqual(JSON.parse(c.data), [{ keywords: ["a"] }]);
});

test("sin cuerpo hace GET sin --data y añade .ai solo si no es fullResponse", async () => {
  const calls = fakeEmApi({ stdout: JSON.stringify({ status_code: 20000, items: [1] }) });
  assert.deepEqual(await request("/foo"), [1]);
  assert.deepEqual(calls()[0].args, ["dataforseo", "GET", "/foo.ai"]);
});

test("un fallo HTTP de em-api se convierte en DataForSeoError con el status y el cuerpo", async () => {
  fakeEmApi({ stderr: 'em-api: HTTP 402\n{"status_code":40200,"status_message":"Payment Required."}\n', exit: 1 });
  await assert.rejects(request("/x", [{}], { fullResponse: true }), (e: unknown) => {
    assert.ok(e instanceof DataForSeoError);
    assert.equal(e.httpStatus, 402);
    assert.equal(e.statusCode, 40200);
    return true;
  });
});

test("un fallo de em-api sin HTTP (host/credencial) es un DataForSeoError de transporte", async () => {
  fakeEmApi({ stderr: "em-api: servicio desconocido 'dataforseo'\n", exit: 2 });
  await assert.rejects(request("/x", [{}], { fullResponse: true }), /em-api falló \(exit 2\)/);
});

test("la CLI no toca la credencial: ni la lee ni envía Authorization", async () => {
  process.env.DATAFORSEO_API_TOKEN = "dGVzdDp0ZXN0";
  const calls = fakeEmApi({ stdout: JSON.stringify({ status_code: 20000, items: [] }) });
  await request("/y", [{}]);
  const [c] = calls();
  assert.ok(!JSON.stringify(c.args).includes("Authorization"));
  assert.ok(!JSON.stringify(c.args).includes("dGVzdDp0ZXN0"));
  delete process.env.DATAFORSEO_API_TOKEN;
});

test("integración con bin/em-api real: la cabecera es `Authorization: Basic <token>` sin recodificar", () => {
  const repo = resolve(import.meta.dirname, "..", "..", "..");
  const d = mkdtempSync(join(tmpdir(), "dfs-curl-"));
  const conf = join(d, "serv.json");
  writeFileSync(conf, JSON.stringify({ dataforseo: {
    base_url: "https://api.dataforseo.com/v3", hosts: ["api.dataforseo.com"],
    auth: { tipo: "header", nombre: "Authorization", formato: "Basic {token}" },
    secreto: { item: "dataforseo", campo: "credential", env: "DATAFORSEO_API_TOKEN" }, check: "/appendix/user_data" } }));
  const log = join(d, "curl.log");
  writeFileSync(join(d, "curl"), `#!/bin/sh\nprintf '%s\\n' "$@" > ${log}\nprintf '{"ok":1}\\n200'`);
  chmodSync(join(d, "curl"), 0o755);
  const r = spawnSync(join(repo, "bin", "em-api"), ["dataforseo", "GET", "/appendix/user_data"], {
    encoding: "utf8",
    env: { ...process.env, EM_SERVICIOS: conf, PATH: `${d}:${process.env.PATH}`, DATAFORSEO_API_TOKEN: "oc-sent-FIXTURE" },
  });
  assert.equal(r.status, 0, r.stderr);
  const args = readFileSync(log, "utf8");
  assert.ok(args.includes("Authorization: Basic oc-sent-FIXTURE"));
  assert.ok(!args.includes("T2Mtc2VudC"), "no debe recodificarse en base64");
});
