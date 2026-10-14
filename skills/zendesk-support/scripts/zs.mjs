#!/usr/bin/env node
// zs — tickets de soporte de Zendesk (lectura) sobre `em-api zendesk`, en el subdominio principal.
// Responder es la única escritura y exige --confirmado (solo cuando Sergio lo ha dicho).
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// em-api del propio repo (bin/em-api) salvo que se indique otro: funciona sin tocar el PATH.
const EM_API = process.env.EM_API_BIN || (() => { const r = join(import.meta.dirname, "..", "..", "..", "bin", "em-api"); return existsSync(r) ? r : "em-api"; })();
const SUBDOMINIO = process.env.ZENDESK_SUPPORT_SUBDOMAIN || "easymailing"; // tickets: cuenta principal
const ESTADOS = { nuevos: "new", abiertos: "open", pendientes: "pending", espera: "hold", resueltos: "solved", cerrados: "closed" };

const fallo = (m) => { process.stderr.write(`zs: ${m}\n`); process.exit(1); };
function api(metodo, ruta, data) {
  const args = ["zendesk", metodo, ruta];
  if (data !== undefined) { const f = join(mkdtempSync(join(tmpdir(), "zs-")), "b.json"); writeFileSync(f, JSON.stringify(data)); args.push("--data", `@${f}`); }
  const r = spawnSync(EM_API, args, { encoding: "utf8", env: { ...process.env, ZENDESK_SUBDOMAIN: SUBDOMINIO } });
  if (r.status !== 0) fallo(`${metodo} ${ruta} falló${r.stderr ? `: ${r.stderr.trim()}` : ""}`);
  return r.stdout.trim() ? JSON.parse(r.stdout) : {};
}
const opciones = (argv) => { const o = {}; const pos = []; for (let i = 0; i < argv.length; i++) { if (argv[i].startsWith("--")) { const k = argv[i].slice(2); if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) o[k] = true; else { o[k] = argv[i + 1]; i++; } } else pos.push(argv[i]); } return { o, pos }; };
const imprimir = (x) => process.stdout.write(JSON.stringify(x, null, 2) + "\n");
const resumen = (t) => ({ id: t.id, asunto: t.subject, estado: t.status, prioridad: t.priority, creado: t.created_at, actualizado: t.updated_at, solicitante_id: t.requester_id, asignado_id: t.assignee_id, etiquetas: t.tags });
const q = (s) => `/search.json?query=${encodeURIComponent(s)}&sort_by=updated_at&sort_order=desc&per_page=`;

const [cmd, ...resto] = process.argv.slice(2);
const { o, pos } = opciones(resto);

switch (cmd) {
  case "tickets": {
    const estado = o.estado ? (ESTADOS[o.estado] || o.estado) : "open";
    let query = `type:ticket status:${estado}`;
    if (o.desde) query += ` created>=${o.desde}`;
    const r = api("GET", q(query) + (o.max || 25));
    imprimir({ total: r.count, tickets: (r.results || []).map(resumen) });
    break;
  }
  case "ticket": {
    const id = pos[0] || fallo("uso: zs ticket <id>");
    const t = api("GET", `/tickets/${id}.json`).ticket;
    const c = api("GET", `/tickets/${id}/comments.json`).comments || [];
    imprimir({ ticket: resumen(t), descripcion: t.description, comentarios: c.map((x) => ({ id: x.id, publico: x.public, autor_id: x.author_id, fecha: x.created_at, texto: x.body })) });
    break;
  }
  case "buscar": {
    const texto = pos[0] || fallo('uso: zs buscar "<texto>"');
    const r = api("GET", q(`type:ticket ${texto}`) + (o.max || 25));
    imprimir({ total: r.count, tickets: (r.results || []).map(resumen) });
    break;
  }
  case "metricas": {
    const por_estado = {};
    for (const e of ["new", "open", "pending", "hold"]) por_estado[e] = api("GET", `/search/count.json?query=${encodeURIComponent(`type:ticket status:${e}`)}`).count;
    const hace7 = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const abiertos_mas_7_dias = api("GET", `/search/count.json?query=${encodeURIComponent(`type:ticket status<solved created<${hace7}`)}`).count;
    imprimir({ fecha: new Date().toISOString(), por_estado, abiertos_mas_7_dias });
    break;
  }
  case "responder": {
    const id = pos[0]; if (!id || !o.texto || (!o.interno && !o.publico)) fallo('uso: zs responder <id> --interno|--publico --texto "..." --confirmado');
    if (!o.confirmado) fallo("responder escribe en Zendesk: añade --confirmado solo si Sergio lo ha aprobado explícitamente");
    api("PUT", `/tickets/${id}.json`, { ticket: { comment: { body: o.texto, public: !!o.publico } } });
    imprimir({ id: Number(id), comentario: o.publico ? "público" : "interno" });
    break;
  }
  case "borrador": {
    // La API de Zendesk no expone borradores de respuesta: se deja una nota interna, nunca
    // pública, marcada como borrador para revisarla y enviarla a mano desde Zendesk.
    const id = pos[0]; if (!id || !o.texto || o.publico) fallo('uso: zs borrador <id> --texto "..." --confirmado (siempre interno)');
    if (!o.confirmado) fallo("borrador escribe una nota interna en Zendesk: añade --confirmado solo si Sergio lo ha pedido");
    const cuerpo = `BORRADOR DE RESPUESTA — no enviado al cliente.\nRevisar y enviar como respuesta pública desde Zendesk.\n\n---\n\n${o.texto}`;
    api("PUT", `/tickets/${id}.json`, { ticket: { comment: { body: cuerpo, public: false } } });
    imprimir({ id: Number(id), comentario: "interno", borrador: true });
    break;
  }
  default:
    process.stderr.write('uso: zs <tickets [--estado abiertos|pendientes|nuevos|espera|resueltos] [--desde AAAA-MM-DD] [--max N] | ticket <id> | buscar "<texto>" | metricas | responder <id> --interno|--publico --texto "..." --confirmado | borrador <id> --texto "..." --confirmado>\n');
    process.exit(cmd ? 2 : 0);
}
