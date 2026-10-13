#!/usr/bin/env node
// sb — CLI de Storyblok sobre `em-api storyblok` (Management API). Sin dependencias.
// Escrituras siempre en borrador; publicar/despublicar/borrar son comandos explícitos.
// Antes de actualizar, publicar, despublicar o borrar guarda una copia del JSON actual;
// si la copia falla, no escribe.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, statSync, mkdtempSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir, tmpdir } from "node:os";

const EM_API = process.env.EM_API_BIN || "em-api";
const MD2RT = process.env.MD2RT_BIN || null;
const SPACE_ID = process.env.STORYBLOK_SPACE_ID || "310467";
const SITE = process.env.STORYBLOK_SITE_URL || "https://easymailing.com";
const BACKUP_DIR = process.env.STORYBLOK_BACKUP_DIR || join(homedir(), ".local", "state", "storyblok-backups");

function fallo(msg) { process.stderr.write(`sb: ${msg}\n`); process.exit(1); }

function api(metodo, ruta, data, servicio = "storyblok") {
  const args = [servicio, metodo, ruta];
  let tmp;
  if (data !== undefined) {
    tmp = join(mkdtempSync(join(tmpdir(), "sb-")), "body.json");
    writeFileSync(tmp, JSON.stringify(data));
    args.push("--data", `@${tmp}`);
  }
  const r = spawnSync(EM_API, args, { encoding: "utf8" });
  if (r.status !== 0) fallo(`${metodo} ${ruta} falló${r.stderr ? `: ${r.stderr.trim()}` : ""}`);
  return r.stdout.trim() ? JSON.parse(r.stdout) : {};
}

function idDe(ref) {
  if (/^\d+$/.test(ref)) return ref;
  const slug = ref.replace(/^\/+|\/+$/g, "");
  const r = api("GET", `/stories?with_slug=${encodeURIComponent(slug)}&per_page=100`);
  const s = (r.stories || []).find((x) => x.full_slug === slug);
  if (!s) fallo(`no existe la historia '${slug}'`);
  return String(s.id);
}

function copiaPrevia(id) {
  const actual = api("GET", `/stories/${id}`);
  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
    if (!statSync(BACKUP_DIR).isDirectory()) throw new Error("no es un directorio");
    const f = join(BACKUP_DIR, `${id}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
    writeFileSync(f, JSON.stringify(actual, null, 2));
    process.stderr.write(`sb: copia previa en ${f}\n`);
    return actual;
  } catch (e) {
    fallo(`no se pudo guardar la copia previa en ${BACKUP_DIR} (${e.message}); no se escribe nada`);
  }
}

function md2rt(fichero) {
  const cmd = MD2RT ? [MD2RT, ["--file", fichero]] : ["npx", ["-y", "bun", join(import.meta.dirname, "md2rt.ts"), "--file", fichero]];
  const r = spawnSync(cmd[0], cmd[1], { encoding: "utf8" });
  const out = r.status === 0 ? JSON.parse(r.stdout) : null;
  if (!out?.success) fallo(`md2rt no pudo convertir ${fichero}`);
  return out.data;
}

function opciones(argv) {
  const o = {}; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) { o[argv[i].slice(2)] = argv[i + 1]; i++; } else pos.push(argv[i]);
  }
  return { o, pos };
}

const imprimir = (x) => process.stdout.write(JSON.stringify(x, null, 2) + "\n");
const [cmd, ...resto] = process.argv.slice(2);
const { o, pos } = opciones(resto);

switch (cmd) {
  case "buscar": {
    const q = new URLSearchParams({ per_page: o.limite || "25" });
    if (pos[0]) q.set("search_term", pos[0]);
    if (o.componente) q.set("contain_component", o.componente);
    const r = api("GET", `/stories?${q}`);
    imprimir((r.stories || []).map((s) => ({ id: s.id, name: s.name, full_slug: s.full_slug, published: s.published, updated_at: s.updated_at })));
    break;
  }
  case "historia": imprimir(api("GET", `/stories/${idDe(pos[0])}`)); break;
  case "publicada": {
    const slug = (pos[0] || "").replace(/^\/+|\/+$/g, ""); if (!slug) fallo("uso: sb publicada <full_slug>");
    imprimir(api("GET", `/stories/${slug}?version=published`, undefined, "storyblok-cdn"));
    break;
  }
  case "componentes": imprimir((api("GET", "/components").components || []).map((c) => ({ name: c.name, schema: Object.keys(c.schema || {}) }))); break;
  case "crear": {
    const f = pos[0]; if (!f) fallo("uso: sb crear <fichero.json|md> [--componente C --campo F --nombre N --slug S --padre ID]");
    let body;
    if (f.endsWith(".md")) {
      if (!o.componente || !o.campo || !o.nombre || !o.slug) fallo("para .md hacen falta --componente --campo --nombre --slug");
      body = { story: { name: o.nombre, slug: o.slug, content: { component: o.componente, [o.campo]: md2rt(f) } } };
      if (o.titulo) body.story.content.title = o.titulo;
    } else body = JSON.parse(readFileSync(f, "utf8"));
    if (o.padre) body.story.parent_id = Number(o.padre);
    delete body.publish;
    const r = api("POST", "/stories", body);
    imprimir({ id: r.story?.id, full_slug: r.story?.full_slug, estado: "borrador" });
    break;
  }
  case "actualizar": {
    const id = idDe(pos[0]); const f = pos[1]; if (!f) fallo("uso: sb actualizar <id|slug> <fichero.json>");
    const nuevo = JSON.parse(readFileSync(f, "utf8"));
    copiaPrevia(id);
    const body = { story: nuevo.story || nuevo, force_update: 1 };
    delete body.publish;
    const r = api("PUT", `/stories/${id}`, body);
    imprimir({ id: r.story?.id ?? Number(id), estado: "borrador actualizado" });
    break;
  }
  case "preview": {
    const s = api("GET", `/stories/${idDe(pos[0])}`).story;
    const p = s?.preview_token || {};
    if (!p.token || !p.timestamp) fallo("Storyblok no devolvió firma de vista previa");
    const q = new URLSearchParams({ _storyblok: String(s.id), "_storyblok_tk[space_id]": SPACE_ID, "_storyblok_tk[timestamp]": String(p.timestamp), "_storyblok_tk[token]": p.token });
    process.stdout.write(`${SITE}/${s.full_slug}?${q}\n`);
    break;
  }
  case "publicar":
  case "despublicar": {
    const id = idDe(pos[0]); copiaPrevia(id);
    api("GET", `/stories/${id}/${cmd === "publicar" ? "publish" : "unpublish"}`);
    imprimir({ id: Number(id), estado: cmd === "publicar" ? "publicado" : "despublicado" });
    break;
  }
  case "borrar": {
    const id = idDe(pos[0]); copiaPrevia(id);
    api("DELETE", `/stories/${id}`);
    imprimir({ id: Number(id), estado: "borrado" });
    break;
  }
  case "assets": {
    if (pos[0] !== "subir" || !pos[1]) fallo("uso: sb assets subir <fichero> [--alt texto]");
    const f = pos[1]; const tam = statSync(f).size;
    const firmado = api("POST", "/assets", { filename: basename(f), size: tam });
    const host = new URL(firmado.post_url).host;
    if (!/(^|\.)amazonaws\.com$/.test(host)) fallo(`destino de subida inesperado: ${host}`);
    const campos = Object.entries(firmado.fields || {}).flatMap(([k, v]) => ["-F", `${k}=${v}`]);
    const up = spawnSync("curl", ["-sS", "-f", ...campos, "-F", `file=@${f}`, firmado.post_url], { encoding: "utf8" });
    if (up.status !== 0) fallo("la subida a Storyblok falló");
    api("GET", `/assets/${firmado.id}/finish_upload`);
    if (o.alt) api("PUT", `/assets/${firmado.id}`, { asset: { alt: o.alt } });
    imprimir({ id: firmado.id, filename: firmado.pretty_url || firmado.public_url });
    break;
  }
  default:
    process.stderr.write("uso: sb <buscar|historia|publicada|componentes|crear|actualizar|preview|publicar|despublicar|borrar|assets subir> ...\n");
    process.exit(cmd ? 2 : 0);
}
