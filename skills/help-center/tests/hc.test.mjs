// Tests de scripts/hc.mjs con Zendesk simulado. Uso: node --test skills/help-center/tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const HC = join(AQUI, "..", "scripts", "hc.mjs");
const FAKE = join(AQUI, "fake-zendesk.mjs");

function repo({ subdominio = "easymailing-app", conIds = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), "hc-"));
  const cfg = { subdominio, locale_origen: "es", locales: ["es", "en"], permission_group_id: 5, user_segment_id: 6,
    categorias: [{ clave: "contactos", nombre: { es: "Contactos", en: "Contacts" }, secciones: [{ clave: "segmentos", nombre: { es: "Segmentos", en: "Segments" } }] }],
    ids: conIds ? { categorias: { contactos: 100 }, secciones: { "contactos/segmentos": 200 } } : { categorias: {}, secciones: {} } };
  writeFileSync(join(d, "zendesk.json"), JSON.stringify(cfg, null, 2));
  writeFileSync(join(d, ".sync-estado.json"), "{}");
  const zd = join(d, "zd.json"); writeFileSync(zd, JSON.stringify({ seq: 1000, articles: {}, calls: [] }));
  const fake = join(d, "em-api"); writeFileSync(fake, `#!/bin/sh\nexec node ${JSON.stringify(FAKE)} "$@"\n`); chmodSync(fake, 0o755);
  const art = (loc, slug, fm, cuerpo) => {
    const p = join(d, "articulos", loc, "contactos", "segmentos"); mkdirSync(p, { recursive: true });
    const f = join(p, `${slug}.md`);
    writeFileSync(f, `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(", ")}]` : v}`).join("\n")}\n---\n${cuerpo}\n`);
    return f;
  };
  const run = (...args) => spawnSync("node", [HC, ...args], { cwd: d, encoding: "utf8", env: { ...process.env, EM_API_BIN: fake, FAKE_ZD: zd } });
  const zdState = () => JSON.parse(readFileSync(zd, "utf8"));
  const escrituras = () => zdState().calls.filter((c) => c.metodo !== "GET");
  return { d, art, run, zdState, escrituras };
}
const fmBase = { titulo: "Crear un segmento", seccion: "contactos/segmentos", pantallas: ["/crm/segments"], estado: "borrador" };

test("1 dry-run no escribe y muestra el plan", () => {
  const r = repo(); r.art("es", "crear-segmento", fmBase, "# Hola"); r.art("es", "editar-segmento", { ...fmBase, titulo: "Editar" }, "Texto");
  const out = r.run("sync", "--dry-run");
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /crear.*2|2.*crear/i);
  assert.equal(r.escrituras().length, 0);
});

test("2 sync crea en la sección y escribe zendesk_id; usa el subdominio de la marca", () => {
  const r = repo(); const f = r.art("es", "crear-segmento", fmBase, "# Hola");
  const out = r.run("sync"); assert.equal(out.status, 0, out.stderr);
  const post = r.escrituras().find((c) => c.ruta === "/help_center/sections/200/articles.json");
  assert.ok(post); assert.equal(post.sub, "easymailing-app");
  assert.equal(post.data.article.draft, true); assert.equal(post.data.article.permission_group_id, 5); assert.equal(post.data.article.user_segment_id, 6);
  assert.match(readFileSync(f, "utf8"), /zendesk_id: \d+/);
});

test("3 segundo sync sin cambios no escribe", () => {
  const r = repo(); r.art("es", "crear-segmento", fmBase, "# Hola");
  r.run("sync"); const n = r.escrituras().length;
  const out = r.run("sync"); assert.equal(out.status, 0, out.stderr);
  assert.equal(r.escrituras().length, n);
});

test("4 artículo de otra marca o sección: se niega sin escribir", () => {
  const r = repo(); r.art("es", "ajeno", { ...fmBase, zendesk_id: 999999 }, "x");
  const out = r.run("sync"); assert.notEqual(out.status, 0);
  assert.match(out.stderr, /otra marca|no pertenece/i);
  assert.equal(r.escrituras().length, 0);
});

test("5 imagen se sube como adjunto y el HTML usa su URL", () => {
  const r = repo(); mkdirSync(join(r.d, "imagenes", "crear-segmento"), { recursive: true });
  writeFileSync(join(r.d, "imagenes", "crear-segmento", "paso1.png"), "PNG");
  r.art("es", "crear-segmento", fmBase, "![Paso 1](../../../../imagenes/crear-segmento/paso1.png)");
  const out = r.run("sync"); assert.equal(out.status, 0, out.stderr);
  const up = r.escrituras().find((c) => /attachments/.test(c.ruta)); assert.ok(up);
  const art = Object.values(r.zdState().articles)[0];
  assert.match(art.translations.es.body, /hc\/article_attachments\/\d+/);
});

test("6 estado borrador → draft true; publicado → draft false", () => {
  const r = repo(); const f = r.art("es", "crear-segmento", fmBase, "# Hola");
  r.run("sync");
  writeFileSync(f, readFileSync(f, "utf8").replace("estado: borrador", "estado: publicado"));
  const out = r.run("sync"); assert.equal(out.status, 0, out.stderr);
  const art = Object.values(r.zdState().articles)[0];
  assert.equal(art.translations.es.draft, false);
});

test("7 sin marca configurada se niega", () => {
  const r = repo({ subdominio: null }); r.art("es", "crear-segmento", fmBase, "# Hola");
  const out = r.run("sync"); assert.notEqual(out.status, 0); assert.match(out.stderr, /marca no configurada/i);
  assert.equal(r.zdState().calls.length, 0);
});

test("8 afectados lista artículos por pantalla", () => {
  const r = repo(); r.art("es", "crear-segmento", fmBase, "x"); r.art("es", "otro", { ...fmBase, pantallas: ["/crm/companies"] }, "y");
  const out = r.run("afectados", "/crm/segments");
  assert.equal(out.status, 0); assert.match(out.stdout, /crear-segmento/); assert.doesNotMatch(out.stdout, /otro/);
});

test("9 traducciones detecta EN desfasada", () => {
  const r = repo(); r.art("es", "crear-segmento", fmBase, "# Hola v2");
  r.art("en", "crear-segmento", { titulo: "Create a segment", seccion: "contactos/segmentos", estado: "borrador", traduccion_de: "hashviejo" }, "# Hello");
  const out = r.run("traducciones"); assert.equal(out.status, 0);
  assert.match(out.stdout, /crear-segmento/);
});

test("10 check detecta sección inexistente e imagen que falta", () => {
  const r = repo(); r.art("es", "malo", { ...fmBase, seccion: "nada/nada" }, "![x](../../../../imagenes/malo/no.png)");
  const out = r.run("check"); assert.notEqual(out.status, 0);
  assert.match(out.stdout + out.stderr, /sección/i); assert.match(out.stdout + out.stderr, /imagen/i);
});

test("11 locales_zendesk: la carpeta en se publica como en-us", () => {
  const r = repo();
  const cfg = JSON.parse(readFileSync(join(r.d, "zendesk.json"), "utf8")); cfg.locales_zendesk = { en: "en-us" };
  writeFileSync(join(r.d, "zendesk.json"), JSON.stringify(cfg));
  r.art("es", "crear-segmento", fmBase, "# Hola");
  r.art("en", "crear-segmento", { titulo: "Create a segment", seccion: "contactos/segmentos", estado: "borrador", traduccion_de: "x" }, "# Hello");
  const out = r.run("sync"); assert.equal(out.status, 0, out.stderr);
  const tr = r.escrituras().find((c) => /translations\.json$/.test(c.ruta) && c.metodo === "POST");
  assert.equal(tr.data.translation.locale, "en-us");
});

test("12 si cambia el contenido de una imagen se vuelve a subir", () => {
  const r = repo(); mkdirSync(join(r.d, "imagenes", "s"), { recursive: true });
  const img = join(r.d, "imagenes", "s", "p.png"); writeFileSync(img, "V1");
  r.art("es", "crear-segmento", fmBase, "![P](../../../../imagenes/s/p.png)");
  r.run("sync"); writeFileSync(img, "V2");
  const out = r.run("sync"); assert.equal(out.status, 0, out.stderr);
  assert.equal(r.escrituras().filter((c) => /attachments/.test(c.ruta)).length, 2);
});

test("13 tras sync (que añade zendesk_id) la traducción no aparece desfasada", () => {
  const r = repo(); const es = r.art("es", "crear-segmento", fmBase, "# Hola");
  const h = r.run("hash", es).stdout.trim();
  r.art("en", "crear-segmento", { titulo: "Create", seccion: "contactos/segmentos", estado: "borrador", traduccion_de: h }, "# Hi");
  r.run("sync");
  const out = r.run("traducciones"); assert.equal(out.status, 0);
  assert.doesNotMatch(out.stdout, /desfasada/);
});
