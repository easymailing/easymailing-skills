#!/usr/bin/env node
// mq — CLI de solo lectura de la API de MailerQ sobre `em-api mailerq`. Sin dependencias.
// Las acciones de escritura (pausas, errores forzados, supresiones) NO existen aquí:
// se hacen con `em-api mailerq POST|DELETE …` y solo con el sí explícito de Sergio.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const EM_API = process.env.EM_API_BIN || (() => { const r = join(import.meta.dirname, "..", "..", "..", "bin", "em-api"); return existsSync(r) ? r : "em-api"; })();
const PUENTE_CAIDO = "El puente de MailerQ en el Mac Mini no responde (bridge-agents.easymailing.com). Comprueba el túnel SSH y ngrok del Mac Mini.";

function uso(msg) { process.stderr.write(`mq: ${msg}\n${AYUDA}`); process.exit(2); }

const AYUDA = `uso: mq <comando> [opciones]
  check                                   salud del puente y del API (summary 1 h)
  stats [resumen|dominio|ip|tag|diagnostico|ip-dominio|ip-dominio-codigo|cliente-proveedor|campana]
        [--horas N] [--dominio D] [--ip IP] [--tag T] [--app-id ID]
  clientes [--horas N]                    clientes que envían y su tasa de éxito
  etiquetas [--horas N]                   tipo + cliente + campaña
  logs [--destinatario X] [--dominio D] [--ip IP] [--resultado accepted|error|timeout] [--codigo N] [--tag T] [--limite N] [--offset N]
  recientes [--minutos N]                 últimos eventos (máx. 200)
  mensajes [--horas N] [--tag T] [--ip IP] [--dominio D] [--resultado R] [--app-id ID] [--campana-id ID] [--limite N]
  intentos <envelope>                     traza de intentos de un mensaje
  alertas bloqueadas|throttled|salud|regresiones [--horas N]
  pausas | errores | supresiones           listas del proxy MailerQ (solo lectura)
  docs [operationId]                      autodescubrimiento del API
  get </ruta?query>                       GET genérico
`;

function parseOpts(args, permitidas) {
  const o = {}, pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      if (!permitidas.includes(k)) uso(`opción desconocida --${k}`);
      if (i + 1 >= args.length) uso(`--${k} necesita un valor`);
      o[k] = args[++i];
    } else pos.push(a);
  }
  return { o, pos };
}

function qs(pares) {
  const p = new URLSearchParams();
  for (const [k, v] of pares) if (v !== undefined && v !== "") p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

function get(ruta) {
  const r = spawnSync(EM_API, ["mailerq", "GET", ruta], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) { process.stderr.write(`mq: no se pudo ejecutar em-api: ${r.error.message}\n`); process.exit(1); }
  if (r.status !== 0) {
    const err = (r.stderr || "").trim();
    const m = err.match(/HTTP (\d{3})/);
    if (m && ["000", "502", "503", "504"].includes(m[1])) { process.stderr.write(`mq: ${PUENTE_CAIDO}\n`); process.exit(1); }
    process.stderr.write(`mq: GET ${ruta} falló${err ? `: ${err}` : ""}\n`);
    process.exit(1);
  }
  const t = r.stdout.trim();
  try { process.stdout.write(JSON.stringify(JSON.parse(t), null, 2) + "\n"); } catch { process.stdout.write(t + "\n"); }
}

const STATS = {
  resumen: "summary", dominio: "by-domain", ip: "by-ip", tag: "by-tag", diagnostico: "diagnostics",
  "ip-dominio": "by-ip-domain", "ip-dominio-codigo": "by-ip-domain-code", "cliente-proveedor": "by-client-provider", campana: "by-campaign",
};
const ALERTAS = { bloqueadas: ["blocked-ips", 6], throttled: ["throttled", 6], salud: ["provider-health", 24], regresiones: ["ip-regressions", 6] };

const [cmd, ...resto] = process.argv.slice(2);
switch (cmd) {
  case "check": get("/stats/summary?hours=1"); break;
  case "stats": {
    const { o, pos } = parseOpts(resto, ["horas", "dominio", "ip", "tag", "app-id"]);
    const sub = pos[0] || "resumen";
    if (!STATS[sub]) uso(`estadística desconocida '${sub}'`);
    get(`/stats/${STATS[sub]}` + qs([["hours", o.horas || "24"], ["domain", o.dominio], ["ip", o.ip], ["tag", o.tag], ["app_id", o["app-id"]]]));
    break;
  }
  case "clientes": { const { o } = parseOpts(resto, ["horas"]); get(`/tags/clients?hours=${encodeURIComponent(o.horas || "24")}`); break; }
  case "etiquetas": { const { o } = parseOpts(resto, ["horas"]); get(`/tags?hours=${encodeURIComponent(o.horas || "24")}`); break; }
  case "logs": {
    const { o } = parseOpts(resto, ["destinatario", "dominio", "ip", "resultado", "codigo", "tag", "limite", "offset"]);
    get("/logs" + qs([["recipient", o.destinatario], ["domain", o.dominio], ["source_ip", o.ip], ["result", o.resultado], ["code", o.codigo], ["tag", o.tag], ["limit", o.limite], ["offset", o.offset]]));
    break;
  }
  case "recientes": { const { o } = parseOpts(resto, ["minutos"]); get(`/logs/recent?minutes=${encodeURIComponent(o.minutos || "30")}`); break; }
  case "mensajes": {
    const { o } = parseOpts(resto, ["horas", "tag", "ip", "dominio", "resultado", "app-id", "campana-id", "limite"]);
    get("/messages" + qs([["hours", o.horas || "24"], ["tag", o.tag], ["ip", o.ip], ["domain", o.dominio], ["result", o.resultado], ["app_id", o["app-id"]], ["campaign_id", o["campana-id"]], ["limit", o.limite]]));
    break;
  }
  case "intentos": {
    if (!resto[0]) uso("falta el envelope");
    get(`/messages/${encodeURIComponent(resto[0])}/attempts`);
    break;
  }
  case "alertas": {
    const { o, pos } = parseOpts(resto, ["horas"]);
    const a = ALERTAS[pos[0]];
    if (!a) uso("alertas: bloqueadas|throttled|salud|regresiones");
    get(`/alerts/${a[0]}?hours=${encodeURIComponent(o.horas || a[1])}`);
    break;
  }
  case "pausas": get("/mailerq/pauses"); break;
  case "errores": get("/mailerq/errors"); break;
  case "supresiones": get("/mailerq/suppressions"); break;
  case "docs": get(resto[0] ? `/api-docs/${encodeURIComponent(resto[0])}` : "/api-docs"); break;
  case "get": {
    if (!resto[0] || !resto[0].startsWith("/")) uso("get necesita una ruta relativa que empiece por /");
    get(resto[0]);
    break;
  }
  default: uso(cmd ? `comando desconocido '${cmd}'` : "falta el comando");
}
