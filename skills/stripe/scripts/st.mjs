#!/usr/bin/env node
// st — Stripe en SOLO LECTURA sobre `em-api stripe` (cobros, facturas, suscripciones, clientes, disputas).
// Importes convertidos de céntimos a unidades. Ningún comando escribe.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = join(import.meta.dirname, "..", "..", "..", "bin");
const bin = (n, env) => process.env[env] || (existsSync(join(RAIZ, n)) ? join(RAIZ, n) : n);
const EM_API = bin("em-api", "EM_API_BIN");
const EM_SECRET = bin("em-secret", "EM_SECRET_BIN");

const fallo = (m) => { process.stderr.write(`st: ${m}\n`); process.exit(1); };
function get(ruta, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
  const r = spawnSync(EM_API, ["stripe", "GET", `${ruta}${[...q].length ? `?${q}` : ""}`], { encoding: "utf8" });
  if (r.status !== 0) fallo(`GET ${ruta} falló${r.stderr ? `: ${r.stderr.trim()}` : ""}`);
  return r.stdout.trim() ? JSON.parse(r.stdout) : {};
}
const opciones = (argv) => { const o = {}; const pos = []; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) { o[argv[i].slice(2)] = argv[i + 1]; i++; } else pos.push(argv[i]); } return { o, pos }; };
const imprimir = (x) => process.stdout.write(JSON.stringify(x, null, 2) + "\n");
const unidades = (c) => (typeof c === "number" ? c / 100 : c);
const fecha = (t) => (t ? new Date(t * 1000).toISOString() : null);
const desde = (o) => (o.desde ? { "created[gte]": Math.floor(new Date(o.desde).getTime() / 1000) } : {});

const [cmd, ...resto] = process.argv.slice(2);
const { o, pos } = opciones(resto);
const limit = o.max || 25;

switch (cmd) {
  case "check": {
    let tipo = "desconocido (sentinel de OpenClaw)";
    if (!(process.env.STRIPE_API_KEY || "").startsWith("oc-sent-")) {
      const r = spawnSync(EM_SECRET, ["stripe-api-key", "credential"], { encoding: "utf8" });
      const k = r.stdout || "";
      tipo = k.startsWith("rk_") ? "restringida" : "NO restringida";
    }
    get("/balance");
    if (tipo === "NO restringida") { process.stdout.write("AVISO: la clave de Stripe no es restringida (rk_…). Sustitúyela por una clave restringida de solo lectura.\n"); process.exit(1); }
    process.stdout.write(`OK: Stripe responde; clave ${tipo}\n`);
    break;
  }
  case "cobros": {
    const r = get("/charges", { limit, ...desde(o), ...(o.cliente ? { customer: o.cliente } : {}) });
    let d = r.data || []; if (o.estado) d = d.filter((c) => c.status === o.estado);
    imprimir({ cobros: d.map((c) => ({ id: c.id, importe: unidades(c.amount), moneda: c.currency, estado: c.status, reembolsado: c.refunded, fecha: fecha(c.created), cliente: c.customer, descripcion: c.description, fallo: c.failure_message })) });
    break;
  }
  case "facturas": {
    const r = get("/invoices", { limit, ...desde(o), ...(o.cliente ? { customer: o.cliente } : {}), ...(o.estado ? { status: o.estado } : {}) });
    imprimir({ facturas: (r.data || []).map((f) => ({ id: f.id, numero: f.number, total: unidades(f.total), pagado: unidades(f.amount_paid), moneda: f.currency, estado: f.status, fecha: fecha(f.created), cliente: f.customer, email: f.customer_email })) });
    break;
  }
  case "suscripciones": {
    const r = get("/subscriptions", { limit, status: o.estado || "all", ...(o.cliente ? { customer: o.cliente } : {}) });
    imprimir({ suscripciones: (r.data || []).map((s) => ({ id: s.id, estado: s.status, cliente: s.customer, inicio: fecha(s.start_date), fin_periodo: fecha(s.current_period_end ?? s.items?.data?.[0]?.current_period_end), cancelada: fecha(s.canceled_at), cancela_al_final: s.cancel_at_period_end, precios: (s.items?.data || []).map((i) => ({ precio: i.price?.id, importe: unidades(i.price?.unit_amount), moneda: i.price?.currency, intervalo: i.price?.recurring?.interval })) })) });
    break;
  }
  case "cliente": {
    const ref = pos[0] || fallo("uso: st cliente <email|cus_…>");
    const c = ref.startsWith("cus_") ? [get(`/customers/${ref}`)] : (get("/customers/search", { query: `email:'${ref}'` }).data || []);
    imprimir({ clientes: c.map((x) => ({ id: x.id, email: x.email, nombre: x.name, alta: fecha(x.created), saldo: unidades(x.balance), moneda: x.currency, delincuente: x.delinquent })) });
    break;
  }
  case "disputas": {
    const r = get("/disputes", { limit, ...desde(o) });
    imprimir({ disputas: (r.data || []).map((d) => ({ id: d.id, importe: unidades(d.amount), moneda: d.currency, estado: d.status, motivo: d.reason, cobro: d.charge, fecha: fecha(d.created), evidencias_hasta: fecha(d.evidence_details?.due_by) })) });
    break;
  }
  default:
    process.stderr.write("uso: st <check | cobros [--desde AAAA-MM-DD --estado succeeded|failed --cliente cus_… --max N] | facturas [--estado paid|open|uncollectible --cliente --desde] | suscripciones [--estado active|canceled|past_due|all] | cliente <email|cus_…> | disputas [--desde]>\n");
    process.exit(cmd ? 2 : 0);
}
