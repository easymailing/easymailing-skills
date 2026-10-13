#!/usr/bin/env node
// em-api simulado para Zendesk Help Center con estado en $FAKE_ZD (JSON). Registra llamadas.
import fs from "node:fs";
const st = JSON.parse(fs.readFileSync(process.env.FAKE_ZD, "utf8"));
const a = process.argv.slice(2);
const [svc, metodo, rutaQ] = a; const ruta = rutaQ.split("?")[0];
let data = null; const i = a.indexOf("--data"); if (i >= 0) { const v = a[i + 1]; data = JSON.parse(v.startsWith("@") ? fs.readFileSync(v.slice(1), "utf8") : v); }
const form = a.includes("--form") ? a[a.indexOf("--form") + 1] : null;
st.calls.push({ metodo, ruta, data, form, sub: process.env.ZENDESK_SUBDOMAIN });
const out = (o) => { fs.writeFileSync(process.env.FAKE_ZD, JSON.stringify(st)); process.stdout.write(JSON.stringify(o)); process.exit(0); };
const err = (c) => { fs.writeFileSync(process.env.FAKE_ZD, JSON.stringify(st)); process.stderr.write(`HTTP ${c}`); process.exit(1); };
let m;
const nid = () => ++st.seq;
if (metodo === "POST" && (m = ruta.match(/^\/help_center\/sections\/(\d+)\/articles\.json$/))) {
  const id = nid(); const art = data.article;
  st.articles[id] = { id, section_id: +m[1], translations: { [art.locale]: { title: art.title, body: art.body, draft: art.draft } } };
  out({ article: { id, section_id: +m[1] } });
}
if (metodo === "GET" && (m = ruta.match(/^\/help_center\/articles\/(\d+)\.json$/))) {
  const art = st.articles[m[1]]; if (!art) err(404); out({ article: { id: art.id, section_id: art.section_id } });
}
if (metodo === "GET" && (m = ruta.match(/^\/help_center\/articles\/(\d+)\/translations\.json$/))) {
  const art = st.articles[m[1]]; if (!art) err(404); out({ translations: Object.keys(art.translations).map((l) => ({ locale: l })) });
}
if ((metodo === "PUT") && (m = ruta.match(/^\/help_center\/articles\/(\d+)\/translations\/(\w+)\.json$/))) {
  st.articles[m[1]].translations[m[2]] = { ...st.articles[m[1]].translations[m[2]], ...data.translation }; out({ translation: data.translation });
}
if (metodo === "POST" && (m = ruta.match(/^\/help_center\/articles\/(\d+)\/translations\.json$/))) {
  st.articles[m[1]].translations[data.translation.locale] = data.translation; out({ translation: data.translation });
}
if (metodo === "POST" && (m = ruta.match(/^\/help_center\/articles\/(\d+)\/attachments\.json$/))) {
  const id = nid(); out({ article_attachment: { id, content_url: `https://${process.env.ZENDESK_SUBDOMAIN}.zendesk.com/hc/article_attachments/${id}` } });
}
if (metodo === "POST" && ruta === "/help_center/categories.json") { const id = nid(); out({ category: { id } }); }
if (metodo === "POST" && (m = ruta.match(/^\/help_center\/categories\/(\d+)\/sections\.json$/))) { const id = nid(); out({ section: { id } }); }
if (metodo === "POST" && (m = ruta.match(/^\/help_center\/(categories|sections)\/(\d+)\/translations\.json$/))) out({ translation: {} });
err(400);
