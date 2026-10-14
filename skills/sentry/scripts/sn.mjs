#!/usr/bin/env node
// sn — Sentry de Easymailing sobre `em-api sentry`: incidencias, detalle con el último evento, eventos y resumen diario.
// Única escritura: `resolver`, que exige --confirmado (solo cuando Sergio lo pide).
// Nunca devuelve datos de la petición más allá de URL y método (cookies, cabeceras y cuerpo pueden llevar sesiones de clientes),
// ni datos de usuario de los eventos.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const EM_API = process.env.EM_API_BIN || (() => { const r = join(import.meta.dirname, "..", "..", "..", "bin", "em-api"); return existsSync(r) ? r : "em-api"; })();
const ORG = process.env.SENTRY_ORG || "easymailing";
const PROYECTOS = (process.env.SENTRY_PROJECTS || "easymailing,customer-app,website-nuxt-5w").split(",").map((s) => s.trim()).filter(Boolean);
const SLUG = /^[a-z0-9][a-z0-9_-]*$/;
const ID = /^([0-9]+|[A-Z0-9][A-Z0-9-]*-[A-Z0-9]+)$/;

const fallo = (m, code = 1) => { process.stderr.write(`sn: ${m}\n`); process.exit(code); };
function get(ruta, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== true).map(([k, v]) => [k, String(v)]));
  const r = spawnSync(EM_API, ["sentry", "GET", `${ruta}${[...q].length ? `?${q}` : ""}`], { encoding: "utf8" });
  if (r.status !== 0) fallo(`GET ${ruta} falló${r.stderr ? `: ${r.stderr.trim()}` : ""}`);
  return r.stdout.trim() ? JSON.parse(r.stdout) : {};
}
function put(ruta, data) {
  const r = spawnSync(EM_API, ["sentry", "PUT", ruta, "--data", JSON.stringify(data)], { encoding: "utf8" });
  if (r.status !== 0) fallo(`PUT ${ruta} falló${r.stderr ? `: ${r.stderr.trim()}` : ""}`);
  return r.stdout.trim() ? JSON.parse(r.stdout) : {};
}
const opciones = (argv) => { const o = {}; const pos = []; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) { const k = argv[i].slice(2); if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) o[k] = true; else { o[k] = argv[i + 1]; i++; } } else pos.push(argv[i]); } return { o, pos }; };
const imprimir = (x) => process.stdout.write(JSON.stringify(x, null, 2) + "\n");
const proyectos = (o) => { const ps = o.proyecto ? [o.proyecto] : PROYECTOS; for (const p of ps) if (!SLUG.test(p)) fallo(`proyecto no válido: ${p}`, 2); return ps; };
const incidencia = (i) => ({ id: i.shortId, titulo: i.title, culprit: i.culprit, nivel: i.level, proyecto: i.project?.slug, eventos: Number(i.count), usuarios: i.userCount, primera_vez: i.firstSeen, ultima_vez: i.lastSeen, enlace: i.permalink });
const issues = (p, params) => get(`/projects/${ORG}/${p}/issues/`, params);
const idGrupo = (ref) => {
  if (!ID.test(ref || "")) fallo("uso: sn issue <ID corto (CUSTOMER-APP-1A) o numérico>", 2);
  return /^[0-9]+$/.test(ref) ? ref : String(get(`/organizations/${ORG}/shortids/${ref}/`).groupId);
};
function evento(ev) {
  const entradas = ev.entries || [];
  const exc = entradas.find((e) => e.type === "exception")?.data?.values?.at(-1);
  const req = entradas.find((e) => e.type === "request")?.data;
  const tag = (k) => (ev.tags || []).find((t) => t.key === k)?.value;
  return {
    id: ev.eventID, fecha: ev.dateCreated, release: tag("release"), entorno: tag("environment"),
    excepcion: exc ? { tipo: exc.type, mensaje: exc.value, marcos_app: (exc.stacktrace?.frames || []).filter((f) => f.inApp).slice(-8).map((f) => ({ fichero: f.filename, funcion: f.function, linea: f.lineNo })) } : undefined,
    peticion: req ? { url: req.url, metodo: req.method } : undefined,
  };
}

const [cmd, ...resto] = process.argv.slice(2);
const { o, pos } = opciones(resto);

switch (cmd) {
  case "issues": {
    const params = { query: o.query || "is:unresolved", sort: o.orden || "date", limit: o.max || 25, statsPeriod: o.periodo };
    imprimir({ incidencias: proyectos(o).flatMap((p) => issues(p, params).map(incidencia)) });
    break;
  }
  case "issue": {
    const g = idGrupo(pos[0]);
    imprimir({ incidencia: incidencia(get(`/organizations/${ORG}/issues/${g}/`)), ultimo_evento: evento(get(`/organizations/${ORG}/issues/${g}/events/latest/`)) });
    break;
  }
  case "eventos": {
    const g = idGrupo(pos[0]);
    const r = get(`/organizations/${ORG}/issues/${g}/events/`, { per_page: o.max || 10 });
    imprimir({ eventos: r.map((e) => ({ id: e.eventID, fecha: e.dateCreated, mensaje: e.message || e.title, release: (e.tags || []).find((t) => t.key === "release")?.value })) });
    break;
  }
  case "resumen": {
    const out = {};
    for (const p of proyectos(o)) {
      out[p] = {
        nuevas_24h: issues(p, { query: "is:unresolved firstSeen:-24h", sort: "date", limit: 10 }).map(incidencia),
        mas_frecuentes_24h: issues(p, { query: "is:unresolved", sort: "freq", statsPeriod: "24h", limit: 5 }).map(incidencia),
      };
    }
    imprimir({ fecha: new Date().toISOString(), proyectos: out });
    break;
  }
  case "resolver": {
    const ref = pos[0];
    if (!o.confirmado) fallo("resolver escribe en Sentry: añade --confirmado solo si Sergio lo ha pedido explícitamente");
    const g = idGrupo(ref);
    const r = put(`/organizations/${ORG}/issues/${g}/`, { status: "resolved" });
    imprimir({ id: ref, estado: r.status || "resolved" });
    break;
  }
  case "proyectos":
    imprimir({ proyectos: get(`/organizations/${ORG}/projects/`).map((p) => ({ slug: p.slug, plataforma: p.platform })) });
    break;
  default:
    process.stderr.write("uso: sn <issues [--proyecto P] [--query \"is:unresolved\"] [--orden date|freq|new] [--periodo 24h] [--max N] | issue <ID> | eventos <ID> [--max N] | resumen [--proyecto P] | proyectos | resolver <ID> --confirmado>\n");
    process.exit(cmd ? 2 : 0);
}
