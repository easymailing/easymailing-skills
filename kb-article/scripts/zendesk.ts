#!/usr/bin/env -S npx -y bun

/**
 * Zendesk Help Center CLI
 *
 * Uso:
 *   npx bun kb-article/scripts/zendesk.ts <command> [args]
 *
 * Comandos:
 *   categories                    - Listar categorías
 *   sections <category_id>        - Listar secciones de una categoría
 *   search <query>                - Buscar artículos
 *   article <article_id>          - Obtener un artículo
 *   translations <article_id>     - Obtener traducciones de un artículo
 *   backup <article_id>           - Guardar backup JSON/Markdown del artículo y sus traducciones
 *   create <section_id>           - Crear artículo (usa --title, --body, --locale, --draft)
 *   translate <article_id>        - Añadir traducción (usa --title, --body, --locale)
 *   update <article_id>           - Actualizar traducción (usa --locale, --title, --body)
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";

// Encontrar el directorio de la skill (donde está .env y .kb-config.json)
const scriptDir = dirname(Bun.main);
const skillDir = join(scriptDir, "..");

// Cargar .env
function loadEnv(): Record<string, string> {
  const envPath = join(skillDir, ".env");
  if (!existsSync(envPath)) {
    console.error(JSON.stringify({ success: false, error: `.env not found at ${envPath}` }));
    process.exit(1);
  }

  const env: Record<string, string> = {};
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      env[key.trim()] = valueParts.join("=").trim();
    }
  }
  return env;
}

// Cargar config
function loadConfig(): Record<string, any> {
  const configPath = join(skillDir, ".kb-config.json");
  if (!existsSync(configPath)) {
    console.error(JSON.stringify({ success: false, error: `.kb-config.json not found at ${configPath}` }));
    process.exit(1);
  }
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

const env = loadEnv();
const config = loadConfig();

const ZENDESK_SUBDOMAIN = config.zendesk_subdomain || "easymailing";
const ZENDESK_EMAIL = config.zendesk_email;
const ZENDESK_TOKEN = env.ZENDESK_API_TOKEN;

if (!ZENDESK_TOKEN) {
  console.error(JSON.stringify({ success: false, error: "ZENDESK_API_TOKEN not set in .env" }));
  process.exit(1);
}

if (!ZENDESK_EMAIL) {
  console.error(JSON.stringify({ success: false, error: "zendesk_email not set in .kb-config.json" }));
  process.exit(1);
}

const BASE_URL = `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/help_center`;
const AUTH = Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_TOKEN}`).toString("base64");

// Helper para requests
async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Basic ${AUTH}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Zendesk API error ${response.status}: ${error}`);
  }

  return response.json();
}

// Comandos
async function getCategories() {
  const data = await request("/categories.json");
  return data.categories.map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    locale: c.locale,
    position: c.position,
  }));
}

async function getSections(categoryId: string) {
  const data = await request(`/categories/${categoryId}/sections.json`);
  return data.sections.map((s: any) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    locale: s.locale,
    position: s.position,
    category_id: s.category_id,
  }));
}

async function searchArticles(query: string) {
  const data = await request(`/articles/search.json?query=${encodeURIComponent(query)}`);
  return data.results.map((a: any) => ({
    id: a.id,
    title: a.title,
    locale: a.locale,
    section_id: a.section_id,
    draft: a.draft,
    url: a.html_url,
    snippet: a.snippet,
  }));
}

async function getArticle(articleId: string) {
  const data = await request(`/articles/${articleId}.json`);
  const a = data.article;
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    locale: a.locale,
    section_id: a.section_id,
    draft: a.draft,
    url: a.html_url,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

async function getArticleTranslations(articleId: string) {
  const data = await request(`/articles/${articleId}/translations.json`);
  return data.translations.map((t: any) => ({
    id: t.id,
    title: t.title,
    body: t.body,
    locale: t.locale,
    draft: t.draft,
    url: t.html_url,
    created_at: t.created_at,
    updated_at: t.updated_at,
    source_id: t.source_id,
    source_type: t.source_type,
    outdated: t.outdated,
  }));
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}

async function backupArticle(articleId: string, outDir?: string) {
  const article = await getArticle(articleId);
  const translations = await getArticleTranslations(articleId);
  const backedUpAt = new Date().toISOString();
  const outputDir = outDir || join(config.project_path, "docs/kb-workspace/v1.27/backups");
  const baseName = `${backedUpAt.replace(/[:.]/g, "-")}-zendesk-${articleId}-${slugify(article.title)}`;
  const jsonPath = join(outputDir, `${baseName}.json`);
  const markdownPath = join(outputDir, `${baseName}.md`);
  const payload = {
    backed_up_at: backedUpAt,
    source: "zendesk",
    article,
    translations,
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
  writeFileSync(
    markdownPath,
    [
      `# Backup Zendesk ${article.id} - ${article.title}`,
      "",
      `- Backed up at: ${backedUpAt}`,
      `- Article URL: ${article.url}`,
      `- Section ID: ${article.section_id}`,
      `- Locales: ${translations.map((t: any) => t.locale).join(", ") || "none"}`,
      `- JSON: ${jsonPath}`,
      "",
      "## Article",
      "",
      "```json",
      JSON.stringify(article, null, 2),
      "```",
      "",
      "## Translations",
      "",
      ...translations.flatMap((translation: any) => [
        `### ${translation.locale} - ${translation.title}`,
        "",
        `- Translation ID: ${translation.id}`,
        `- Draft: ${translation.draft}`,
        `- Updated at: ${translation.updated_at}`,
        "",
        "```html",
        translation.body || "",
        "```",
        "",
      ]),
    ].join("\n")
  );

  return {
    article_id: article.id,
    title: article.title,
    backup_json: jsonPath,
    backup_markdown: markdownPath,
    locales: translations.map((t: any) => t.locale),
    backed_up_at: backedUpAt,
  };
}

async function createArticle(sectionId: string, title: string, body: string, locale: string = "es", draft: boolean = true) {
  const data = await request(`/sections/${sectionId}/articles.json`, {
    method: "POST",
    body: JSON.stringify({
      article: {
        title,
        body,
        locale,
        draft,
        permission_group_id: 208637, // Administradores
        user_segment_id: null, // Visible para todos
      },
    }),
  });

  const a = data.article;
  return {
    id: a.id,
    title: a.title,
    locale: a.locale,
    draft: a.draft,
    url: a.html_url,
  };
}

async function createTranslation(articleId: string, title: string, body: string, locale: string = "en") {
  const data = await request(`/articles/${articleId}/translations.json`, {
    method: "POST",
    body: JSON.stringify({
      translation: {
        title,
        body,
        locale,
      },
    }),
  });

  const t = data.translation;
  return {
    id: t.id,
    title: t.title,
    locale: t.locale,
    url: t.html_url,
  };
}

async function updateTranslation(articleId: string, locale: string, title?: string, body?: string) {
  const updateData: any = {};
  if (title) updateData.title = title;
  if (body) updateData.body = body;

  const data = await request(`/articles/${articleId}/translations/${locale}.json`, {
    method: "PUT",
    body: JSON.stringify({
      translation: updateData,
    }),
  });

  const t = data.translation;
  return {
    id: t.id,
    title: t.title,
    locale: t.locale,
    url: t.html_url,
  };
}

// Parse args
function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
      flags[key] = value;
    } else {
      positional.push(args[i]);
    }
  }

  return { positional, flags };
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  try {
    let result: any;

    switch (command) {
      case "categories":
        result = await getCategories();
        break;

      case "sections":
        if (!positional[1]) {
          throw new Error("Usage: sections <category_id>");
        }
        result = await getSections(positional[1]);
        break;

      case "search":
        if (!positional[1]) {
          throw new Error("Usage: search <query>");
        }
        result = await searchArticles(positional.slice(1).join(" "));
        break;

      case "article":
        if (!positional[1]) {
          throw new Error("Usage: article <article_id>");
        }
        result = await getArticle(positional[1]);
        break;

      case "translations":
        if (!positional[1]) {
          throw new Error("Usage: translations <article_id>");
        }
        result = await getArticleTranslations(positional[1]);
        break;

      case "backup":
        if (!positional[1]) {
          throw new Error("Usage: backup <article_id> [--out <directory>]");
        }
        result = await backupArticle(positional[1], flags.out);
        break;

      case "create":
        if (!positional[1] || !flags.title || !flags.body) {
          throw new Error("Usage: create <section_id> --title <title> --body <body> [--locale es] [--draft]");
        }
        result = await createArticle(
          positional[1],
          flags.title,
          flags.body,
          flags.locale || "es",
          flags.draft !== "false"
        );
        break;

      case "translate":
        if (!positional[1] || !flags.title || !flags.body) {
          throw new Error("Usage: translate <article_id> --title <title> --body <body> [--locale en]");
        }
        result = await createTranslation(
          positional[1],
          flags.title,
          flags.body,
          flags.locale || "en"
        );
        break;

      case "update":
        if (!positional[1] || !flags.locale || (!flags.title && !flags.body)) {
          throw new Error("Usage: update <article_id> --locale <locale> [--title <title>] [--body <body>]");
        }
        result = await updateTranslation(
          positional[1],
          flags.locale,
          flags.title,
          flags.body
        );
        break;

      default:
        throw new Error(`Unknown command: ${command}. Available: categories, sections, search, article, translations, backup, create, translate, update`);
    }

    console.log(JSON.stringify({ success: true, data: result }, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

main();
