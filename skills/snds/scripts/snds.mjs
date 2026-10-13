#!/usr/bin/env node
// snds — Microsoft SNDS (Automated Data Access) sobre `em-api snds`. Solo lectura, sin dependencias.
// La clave la añade em-api (auth por query); este script nunca la ve.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const EM_API = process.env.EM_API_BIN || (() => { const r = join(import.meta.dirname, "..", "..", "..", "bin", "em-api"); return existsSync(r) ? r : "em-api"; })();
const CADUCADA = "clave caducada: renovar en el portal SNDS, cuenta marcos@, cada 30 días (https://substrate.office.com/ip-domain-management-snds/, sección «Automated Data Access»: desactivar y reactivar). Mientras tanto sigue sin datos SNDS y no menciones este fallo a Microsoft.";
const AYUDA = `uso: snds estado | snds datos [--fecha MMDDYY] [--ip IP]\n`;

function uso(msg) { process.stderr.write(`snds: ${msg}\n${AYUDA}`); process.exit(2); }
function fallo(msg) { process.stderr.write(`snds: ${msg}\n`); process.exit(1); }

// -> { http: 200|404|..., cuerpo }
function get(ruta) {
  const r = spawnSync(EM_API, ["snds", "GET", ruta], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) fallo(`no se pudo ejecutar em-api: ${r.error.message}`);
  if (r.status === 0) return { http: 200, cuerpo: r.stdout.trim() };
  const m = (r.stderr || "").match(/HTTP (\d{3})/);
  if (!m) fallo(`GET ${ruta.split("?")[0]} falló: ${(r.stderr || "").trim()}`);
  return { http: Number(m[1]), cuerpo: "" };
}

function errorHttp(ruta, http) {
  const extra = http === 400 ? " (clave inválida o petición mal formada; la fecha debe ser MMDDYY)" : "";
  fallo(`GET ${ruta.split("?")[0]} devolvió HTTP ${http}${extra}`);
}

// 404 sin más contexto: ¿clave caducada o simplemente sin datos? Se desambigua con DataKey sin filtros.
function clavePorSonda() { return get("/DataKey").http === 200; }

const FILTRO = { GREEN: 0, YELLOW: 1, RED: 2 };
const QUEJAS = ["< 0.1%", "0.1% - 1%", "> 1%"];
const num = (x) => (x === "" || x === undefined ? 0 : Number(x));

function parseFilas(csv) {
  return csv.split(/\r?\n/).filter((l) => l.trim()).map((l) => {
    const c = l.split(",");
    return {
      ip: c[0], inicio: c[1], fin: c[2], rcpt: num(c[3]), data: num(c[4]), destinatarios: num(c[5]),
      filtro: c[6], quejas: c[7], trap_inicio: c[8] || null, trap_fin: c[9] || null, trap_hits: num(c[10]),
      helo: c[11] || null, mail_from: c[12] || null,
    };
  });
}

function resumen(filas) {
  const por = new Map();
  for (const f of filas) {
    const r = por.get(f.ip) || { ip: f.ip, rcpt: 0, data: 0, destinatarios: 0, peor_filtro: "GREEN", quejas_max: QUEJAS[0], trap_hits: 0 };
    r.rcpt += f.rcpt; r.data += f.data; r.destinatarios += f.destinatarios; r.trap_hits += f.trap_hits;
    if ((FILTRO[f.filtro] ?? 0) > FILTRO[r.peor_filtro]) r.peor_filtro = f.filtro;
    if (QUEJAS.indexOf(f.quejas) > QUEJAS.indexOf(r.quejas_max)) r.quejas_max = f.quejas;
    por.set(f.ip, r);
  }
  return [...por.values()];
}

const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");

const [cmd, ...resto] = process.argv.slice(2);
if (cmd === "estado") {
  const r = get("/IpStatusKey");
  if (r.http === 200) {
    const filas = r.cuerpo.split(/\r?\n/).filter((l) => l.trim()).map((l) => ({ columnas: l.split(",") }));
    out({ estado: filas.length ? "IPs LISTADAS en SNDS (columnas sin confirmar, ver references/csv-format.md)" : "sin listing: ninguna IP listada en SNDS", listadas: filas });
  } else if (r.http === 404) {
    if (!clavePorSonda()) fallo(CADUCADA);
    out({ estado: "sin listing hoy (404 en IpStatusKey con la clave válida)", listadas: [] });
  } else errorHttp("/IpStatusKey", r.http);
} else if (cmd === "datos") {
  const o = {};
  for (let i = 0; i < resto.length; i++) {
    const a = resto[i];
    if (a !== "--fecha" && a !== "--ip") uso(`argumento desconocido '${a}'`);
    if (i + 1 >= resto.length) uso(`${a} necesita un valor`);
    o[a.slice(2)] = resto[++i];
  }
  if (o.fecha !== undefined && !/^\d{6}$/.test(o.fecha)) uso("--fecha debe ser MMDDYY (hora del Pacífico), p. ej. 071426");
  if (o.ip !== undefined && !/^[0-9.]+$/.test(o.ip)) uso("--ip no es una IPv4 válida");
  const p = new URLSearchParams();
  if (o.fecha) p.set("Date", o.fecha);
  if (o.ip) p.set("ip", o.ip);
  const ruta = "/DataKey" + (p.toString() ? `?${p}` : "");
  const r = get(ruta);
  if (r.http === 200) {
    const filas = parseFilas(r.cuerpo);
    out({ filas, resumen_por_ip: resumen(filas) });
  } else if (r.http === 404) {
    if (ruta === "/DataKey" || !clavePorSonda()) fallo(CADUCADA);
    fallo("sin datos para esa fecha/IP (la clave es válida). Los datos llevan 1-2 días de retraso y solo salen IPs con ~100+ mensajes ese día: prueba otra fecha.");
  } else errorHttp(ruta, r.http);
} else uso(cmd ? `comando desconocido '${cmd}'` : "falta el comando");
