#!/usr/bin/env node
// hc — sincroniza el repo help-center (Markdown) con la marca NUEVA del Help Center de Zendesk.
// Todas las llamadas van por `em-api zendesk` con ZENDESK_SUBDOMAIN = subdominio de la marca nueva
// (la API del Help Center es por marca). Nunca escribe en un artículo cuya sección no sea nuestra.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdtempSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";

const REPO = resolve(process.env.HELP_CENTER_DIR || process.cwd());
const EM_API = process.env.EM_API_BIN || "em-api";
const cfgPath = join(REPO, "zendesk.json");
const estPath = join(REPO, ".sync-estado.json");

const fallo = (m, code = 1) => { process.stderr.write(`hc: ${m}\n`); process.exit(code); };
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const leerJSON = (p, def) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : def);
const cfg = leerJSON(cfgPath, null) || fallo(`no hay zendesk.json en ${REPO}`);
const estado = leerJSON(estPath, {});

// ---------- frontmatter ----------
function parse(file) {
  const t = readFileSync(file, "utf8");
  const m = t.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: t, raw: t };
  const fm = {};
  for (const l of m[1].split("\n")) {
    const k = l.match(/^([\w-]+):\s*(.*)$/); if (!k) continue;
    let v = k[2].trim();
    if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean);
    else if (v === "") v = null;
    fm[k[1]] = v;
  }
  return { fm, body: m[2], raw: t };
}
function setFm(file, clave, valor) {
  const t = readFileSync(file, "utf8");
  const m = t.match(/^---\n([\s\S]*?)\n---/);
  const lineas = m[1].split("\n"); const i = lineas.findIndex((l) => l.startsWith(`${clave}:`));
  if (i >= 0) lineas[i] = `${clave}: ${valor}`; else lineas.push(`${clave}: ${valor}`);
  writeFileSync(file, t.replace(m[0], `---\n${lineas.join("\n")}\n---`));
}

// ---------- ficheros ----------
function articulos(locale) {
  const base = join(REPO, "articulos", locale); const out = [];
  const walk = (d) => { if (!existsSync(d)) return; for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".md")) out.push(p); } };
  walk(base); return out.sort();
}
const relDe = (file, locale) => relative(join(REPO, "articulos", locale), file).split(sep).join("/");
const parDe = (file, de, a) => join(REPO, "articulos", a, relDe(file, de));
const seccionesValidas = () => cfg.categorias.flatMap((c) => c.secciones.map((s) => `${c.clave}/${s.clave}`));
const imagenesDe = (file, body) => [...body.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => ({ ref: m[1], path: resolve(dirname(file), m[1]) }));

// ---------- API ----------
function api(metodo, ruta, data, form) {
  const args = ["zendesk", metodo, ruta];
  if (data !== undefined) { const f = join(mkdtempSync(join(tmpdir(), "hc-")), "b.json"); writeFileSync(f, JSON.stringify(data)); args.push("--data", `@${f}`); }
  if (form) args.push("--form", form);
  const r = spawnSync(EM_API, args, { encoding: "utf8", env: { ...process.env, ZENDESK_SUBDOMAIN: cfg.subdominio } });
  return { ok: r.status === 0, json: r.status === 0 && r.stdout.trim() ? JSON.parse(r.stdout) : null, err: r.stderr };
}
const apiOk = (...a) => { const r = api(...a); if (!r.ok) fallo(`${a[0]} ${a[1]} falló: ${r.err.trim()}`); return r.json; };

// ---------- render ----------
let md;
async function render(file, body, locale, adjuntos) {
  if (!md) {
    try { md = (await import("markdown-it")).default({ html: false, linkify: true }); }
    catch { fallo(`falta markdown-it: ejecuta 'npm install' en ${dirname(dirname(new URL(import.meta.url).pathname))}`); }
  }
  let html = md.render(body.replace(/^#\s+.*\n+/, ""));
  for (const img of imagenesDe(file, body)) {
    const url = adjuntos[img.path];
    html = html.split(`src="${img.ref}"`).join(url ? `src="${url}"` : `src="" data-pendiente="${img.ref}"`);
  }
  html = html.replace(/<blockquote>\s*<p>\[!(INFO|AVISO)\]\s*([\s\S]*?)<\/p>\s*<\/blockquote>/g,
    (_, t, txt) => `<div class="alert alert-${t === "INFO" ? "info" : "warning"}">${txt.trim()}</div>`);
  html = html.replace(/href="([^"#]+\.md)(#[^"]*)?"/g, (m, ref, ancla = "") => {
    const destino = resolve(dirname(file), ref);
    if (!existsSync(destino)) return m;
    const id = parse(destino).fm.zendesk_id;
    return id ? `href="https://${cfg.subdominio}.zendesk.com/hc/${locale}/articles/${id}${ancla}"` : m;
  });
  return html;
}

// ---------- comandos ----------
const [cmd, ...args] = process.argv.slice(2);
const dry = args.includes("--dry-run");

async function sync() {
  if (!cfg.subdominio) fallo("marca no configurada: falta 'subdominio' en zendesk.json");
  const origen = cfg.locale_origen || "es";
  const plan = [];
  for (const file of articulos(origen)) {
    const { fm, body } = parse(file);
    const rel = relDe(file, origen);
    const secId = cfg.ids.secciones[fm.seccion];
    if (!secId) fallo(`${rel}: la sección '${fm.seccion}' no tiene id (ejecuta 'hc estructura')`);
    const imgs = imagenesDe(file, body);
    const firma = (b, f) => sha(JSON.stringify([f.titulo, f.estado, b, imgs.map((i) => existsSync(i.path) ? sha(readFileSync(i.path)) : "x")]));
    const loc = { [origen]: { file, fm, body, hash: firma(body, fm) } };
    for (const l of cfg.locales.filter((x) => x !== origen)) {
      const p = parDe(file, origen, l);
      if (existsSync(p)) { const t = parse(p); loc[l] = { file: p, fm: t.fm, body: t.body, hash: firma(t.body, t.fm) }; }
    }
    const prev = estado[rel] || {};
    const id = fm.zendesk_id ? Number(fm.zendesk_id) : null;
    const cambios = Object.entries(loc).filter(([l, v]) => prev[l] !== v.hash).map(([l]) => l);
    if (!id) plan.push({ accion: "crear", rel, secId, loc, imgs });
    else if (cambios.length) plan.push({ accion: "actualizar", rel, id, secId, loc, imgs, cambios });
  }
  const n = (a) => plan.filter((p) => p.accion === a).length;
  process.stdout.write(`Plan: crear ${n("crear")}, actualizar ${n("actualizar")}${plan.length ? "\n" + plan.map((p) => `  ${p.accion} ${p.rel}${p.cambios ? ` [${p.cambios.join(",")}]` : ""}`).join("\n") : ""}\n`);
  if (dry || !plan.length) return;

  // 1) Verificar pertenencia ANTES de escribir nada
  const nuestras = new Set(Object.values(cfg.ids.secciones).map(Number));
  for (const p of plan.filter((x) => x.accion === "actualizar")) {
    const r = api("GET", `/help_center/articles/${p.id}.json`);
    if (!r.ok || !nuestras.has(Number(r.json.article.section_id))) fallo(`${p.rel}: el artículo ${p.id} no pertenece a la marca nueva (otra marca o sección ajena); no se escribe nada`);
  }
  // 2) Aplicar
  for (const p of plan) {
    const adjuntos = (estado._adjuntos ||= {});
    const draft = (f) => f.estado !== "publicado";
    let id = p.id;
    if (p.accion === "crear") {
      const es = p.loc[cfg.locale_origen || "es"];
      const html = await render(es.file, es.body, "es", adjuntos);
      const r = apiOk("POST", `/help_center/sections/${p.secId}/articles.json`, { article: {
        title: es.fm.titulo, body: html, locale: cfg.locale_origen || "es", draft: draft(es.fm),
        permission_group_id: cfg.permission_group_id, user_segment_id: cfg.user_segment_id,
        label_names: es.fm.etiquetas || [] } });
      id = r.article.id; setFm(es.file, "zendesk_id", id);
    }
    // imágenes pendientes → adjuntos del artículo
    let subidas = false;
    for (const img of p.imgs) {
      if (adjuntos[img.path] || !existsSync(img.path)) continue;
      const r = apiOk("POST", `/help_center/articles/${id}/attachments.json`, undefined, `file=@${img.path}`);
      adjuntos[img.path] = r.article_attachment.content_url; subidas = true;
    }
    const existentes = new Set((apiOk("GET", `/help_center/articles/${id}/translations.json`).translations || []).map((t) => t.locale));
    for (const [l, v] of Object.entries(p.loc)) {
      const nuevo = p.accion === "crear" && l === (cfg.locale_origen || "es") && !subidas;
      if (nuevo) continue;
      if (p.accion === "actualizar" && !p.cambios.includes(l) && !subidas) continue;
      const translation = { title: v.fm.titulo, body: await render(v.file, v.body, l, adjuntos), draft: draft(v.fm) };
      if (existentes.has(l)) apiOk("PUT", `/help_center/articles/${id}/translations/${l}.json`, { translation });
      else apiOk("POST", `/help_center/articles/${id}/translations.json`, { translation: { locale: l, ...translation } });
    }
    estado[p.rel] = Object.fromEntries(Object.entries(p.loc).map(([l, v]) => [l, v.hash]));
    writeFileSync(estPath, JSON.stringify(estado, null, 2) + "\n");
    process.stdout.write(`  ok ${p.accion} ${p.rel} (id ${id})\n`);
  }
}

function estructura() {
  if (!cfg.subdominio) fallo("marca no configurada: falta 'subdominio' en zendesk.json");
  const pend = [];
  for (const c of cfg.categorias) {
    if (!cfg.ids.categorias[c.clave]) pend.push(`categoría ${c.clave}`);
    for (const s of c.secciones) if (!cfg.ids.secciones[`${c.clave}/${s.clave}`]) pend.push(`sección ${c.clave}/${s.clave}`);
  }
  process.stdout.write(`Estructura: crear ${pend.length}${pend.length ? "\n  " + pend.join("\n  ") : ""}\n`);
  if (dry || !pend.length) return;
  for (const c of cfg.categorias) {
    if (!cfg.ids.categorias[c.clave]) {
      const id = apiOk("POST", "/help_center/categories.json", { category: { name: c.nombre.es, locale: "es" } }).category.id;
      cfg.ids.categorias[c.clave] = id;
      if (c.nombre.en) apiOk("POST", `/help_center/categories/${id}/translations.json`, { translation: { locale: "en", title: c.nombre.en } });
    }
    for (const s of c.secciones) {
      const k = `${c.clave}/${s.clave}`;
      if (cfg.ids.secciones[k]) continue;
      const id = apiOk("POST", `/help_center/categories/${cfg.ids.categorias[c.clave]}/sections.json`, { section: { name: s.nombre.es, locale: "es" } }).section.id;
      cfg.ids.secciones[k] = id;
      if (s.nombre.en) apiOk("POST", `/help_center/sections/${id}/translations.json`, { translation: { locale: "en", title: s.nombre.en } });
      writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
    }
  }
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
}

function check() {
  const errores = []; const secs = new Set(seccionesValidas());
  for (const l of cfg.locales) for (const file of articulos(l)) {
    const { fm, body } = parse(file); const rel = `${l}/${relDe(file, l)}`;
    for (const k of ["titulo", "seccion", "estado"]) if (!fm[k]) errores.push(`${rel}: falta '${k}'`);
    if (fm.seccion && !secs.has(fm.seccion)) errores.push(`${rel}: sección '${fm.seccion}' no existe en zendesk.json`);
    if (fm.estado && !["borrador", "publicado"].includes(fm.estado)) errores.push(`${rel}: estado '${fm.estado}' inválido`);
    if (l !== cfg.locale_origen && !fm.traduccion_de) errores.push(`${rel}: falta 'traduccion_de'`);
    for (const img of imagenesDe(file, body)) if (!existsSync(img.path)) errores.push(`${rel}: falta la imagen ${img.ref}`);
  }
  if (errores.length) { process.stdout.write(errores.join("\n") + "\n"); process.exit(1); }
  process.stdout.write("check: OK\n");
}

switch (cmd) {
  case "sync": await sync(); break;
  case "estructura": estructura(); break;
  case "check": check(); break;
  case "afectados": {
    const ruta = args[0] || fallo("uso: hc afectados <ruta-app>");
    for (const f of articulos(cfg.locale_origen || "es")) { const p = parse(f).fm.pantallas || []; if ([].concat(p).some((x) => ruta === x || ruta.startsWith(x + "/"))) process.stdout.write(relDe(f, cfg.locale_origen || "es") + "\n"); }
    break;
  }
  case "hash": process.stdout.write(sha(readFileSync(resolve(args[0] || fallo("uso: hc hash <fichero>")), "utf8")) + "\n"); break;
  case "traducciones": {
    const origen = cfg.locale_origen || "es";
    for (const f of articulos(origen)) {
      const h = sha(readFileSync(f, "utf8"));
      for (const l of cfg.locales.filter((x) => x !== origen)) {
        const p = parDe(f, origen, l);
        if (!existsSync(p)) process.stdout.write(`sin ${l}: ${relDe(f, origen)}\n`);
        else if (parse(p).fm.traduccion_de !== h) process.stdout.write(`desfasada ${l}: ${relDe(f, origen)}\n`);
      }
    }
    break;
  }
  default:
    process.stderr.write("uso: hc <check|estructura [--dry-run]|sync [--dry-run]|afectados <ruta>|traducciones|hash <fichero>>\n");
    process.exit(cmd ? 2 : 0);
}
