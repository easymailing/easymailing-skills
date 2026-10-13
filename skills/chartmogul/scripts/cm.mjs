#!/usr/bin/env node
// cm — ChartMogul en SOLO LECTURA sobre `em-api chartmogul`: métricas (MRR, ARR, ARPA, bajas…), clientes y movimientos.
// Importes de ChartMogul vienen en céntimos: se devuelven en unidades. La moneda es la de la cuenta (USD).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const EM_API = process.env.EM_API_BIN || (() => { const r = join(import.meta.dirname, "..", "..", "..", "bin", "em-api"); return existsSync(r) ? r : "em-api"; })();
const METRICAS = { todas: "all", mrr: "mrr", arr: "arr", arpa: "arpa", asp: "asp", clientes: "customer-count", "bajas-clientes": "customer-churn-rate", "bajas-mrr": "mrr-churn-rate", ltv: "ltv" };
const DINERO = /^(mrr|arr|arpa|asp|ltv)(-|$)|mrr-/; // campos monetarios (céntimos)

const fallo = (m, code = 1) => { process.stderr.write(`cm: ${m}\n`); process.exit(code); };
function get(ruta, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== true).map(([k, v]) => [k, String(v)]));
  const r = spawnSync(EM_API, ["chartmogul", "GET", `${ruta}${[...q].length ? `?${q}` : ""}`], { encoding: "utf8" });
  if (r.status !== 0) fallo(`GET ${ruta} falló${r.stderr ? `: ${r.stderr.trim()}` : ""}`);
  return r.stdout.trim() ? JSON.parse(r.stdout) : {};
}
const opciones = (argv) => { const o = {}; const pos = []; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) { o[argv[i].slice(2)] = argv[i + 1]; i++; } else pos.push(argv[i]); } return { o, pos }; };
const imprimir = (x) => process.stdout.write(JSON.stringify(x, null, 2) + "\n");
const hoy = () => new Date().toISOString().slice(0, 10);
const haceUnAnio = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().slice(0, 10); };
const aUnidades = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === "number" && DINERO.test(k) ? Math.round(v) / 100 : v]));

const [cmd, ...resto] = process.argv.slice(2);
const { o, pos } = opciones(resto);

switch (cmd) {
  case "metricas": {
    const m = METRICAS[pos[0]]; if (!m) fallo(`uso: cm metricas <${Object.keys(METRICAS).join("|")}> [--desde --hasta AAAA-MM-DD] [--intervalo day|week|month|quarter]`, 2);
    const r = get(`/metrics/${m}`, { "start-date": o.desde || haceUnAnio(), "end-date": o.hasta || hoy(), interval: o.intervalo || "month" });
    const s = r.summary || {};
    const resumen = r.summary ? { actual: m.includes("rate") || m === "customer-count" ? s.current : s.current / 100, anterior: m.includes("rate") || m === "customer-count" ? s.previous : s.previous / 100, variacion_pct: s["percentage-change"] } : undefined;
    imprimir({ metrica: pos[0], moneda: "USD (moneda de la cuenta ChartMogul)", resumen, serie: (r.entries || []).map(aUnidades) });
    break;
  }
  case "clientes": {
    if (pos[0] !== "buscar" || !pos[1]) fallo("uso: cm clientes buscar <email>", 2);
    const r = get("/customers/search", { email: pos[1] });
    imprimir({ clientes: (r.entries || []).map((c) => ({ uuid: c.uuid, nombre: c.name, email: c.email, estado: c.status, mrr: typeof c.mrr === "number" ? c.mrr / 100 : c.mrr, arr: typeof c.arr === "number" ? c.arr / 100 : c.arr, cliente_desde: c["customer-since"], pais: c.country })) });
    break;
  }
  case "cliente": {
    const uuid = pos[0] || fallo("uso: cm cliente <uuid>", 2);
    imprimir(aUnidades(get(`/customers/${uuid}`)));
    break;
  }
  case "movimientos": {
    const r = get("/activities", { "start-date": o.desde, "end-date": o.hasta, type: o.tipo, "per-page": o.max || 50 });
    imprimir({ hay_mas: r.has_more, movimientos: (r.entries || []).map((a) => ({ fecha: a.date, tipo: a.type, mrr: typeof a["activity-mrr-movement"] === "number" ? a["activity-mrr-movement"] / 100 : null, cliente: a["customer-name"], cliente_uuid: a["customer-uuid"], descripcion: a.description })) });
    break;
  }
  default:
    process.stderr.write("uso: cm <metricas <todas|mrr|arr|arpa|asp|clientes|bajas-clientes|bajas-mrr|ltv> [--desde --hasta --intervalo] | clientes buscar <email> | cliente <uuid> | movimientos [--tipo new_biz|expansion|contraction|churn|reactivation] [--desde --hasta] [--max 50]>\n");
    process.exit(cmd ? 2 : 0);
}
