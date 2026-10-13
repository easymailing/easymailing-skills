#!/usr/bin/env -S npx -y bun

/**
 * Storyblok Management API CLI
 *
 * Uso:
 *   npx bun marketing-content/scripts/storyblok.ts <command> [args]
 *
 * Comandos:
 *   components                              - Listar componentes disponibles
 *   stories --content-type <type>           - Listar stories de un content type
 *   story <story_id>                        - Obtener una story específica
 *   create --content-type <type> --name <name> --slug <slug> --parent <parent_id> --data <json>
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

// Encontrar el directorio de la skill (donde está .env y .content-config.json)
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
  const configPath = join(skillDir, ".content-config.json");
  if (!existsSync(configPath)) {
    console.error(JSON.stringify({ success: false, error: `.content-config.json not found at ${configPath}` }));
    process.exit(1);
  }
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

const env = loadEnv();
const config = loadConfig();

const STORYBLOK_SPACE_ID = config.storyblok?.space_id;
const STORYBLOK_TOKEN = env.STORYBLOK_TOKEN;

if (!STORYBLOK_TOKEN) {
  console.error(JSON.stringify({ success: false, error: "STORYBLOK_TOKEN not set in .env" }));
  process.exit(1);
}

if (!STORYBLOK_SPACE_ID) {
  console.error(JSON.stringify({ success: false, error: "storyblok.space_id not set in .content-config.json" }));
  process.exit(1);
}

const BASE_URL = `https://mapi.storyblok.com/v1/spaces/${STORYBLOK_SPACE_ID}`;

// Helper para requests
async function request(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": STORYBLOK_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Storyblok API error ${response.status}: ${error}`);
  }

  return response.json();
}

// Comandos
async function getComponents() {
  const data = await request("/components/");
  return data.components.map((c: any) => ({
    id: c.id,
    name: c.name,
    display_name: c.display_name,
    is_root: c.is_root,
    is_nestable: c.is_nestable,
    schema: Object.keys(c.schema || {}),
  }));
}

async function getStories(contentType?: string, perPage: number = 25) {
  let endpoint = `/stories/?per_page=${perPage}&with_summary=1`;
  if (contentType) {
    // Use contain_component for filtering by content type
    endpoint += `&contain_component=${contentType}`;
  }

  const data = await request(endpoint);
  return data.stories.map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    full_slug: s.full_slug,
    content_type: s.content?.component,
    created_at: s.created_at,
    published: s.published,
    parent_id: s.parent_id,
  }));
}

async function getStory(storyId: string) {
  const data = await request(`/stories/${storyId}`);
  const s = data.story;
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    full_slug: s.full_slug,
    content: s.content,
    created_at: s.created_at,
    published_at: s.published_at,
    parent_id: s.parent_id,
  };
}

async function createStory(
  contentType: string,
  name: string,
  slug: string,
  parentId?: string,
  data?: Record<string, any>
) {
  const storyData: any = {
    story: {
      name,
      slug,
      content: {
        component: contentType,
        ...data,
      },
      publish: 0, // Crear como borrador
    },
  };

  if (parentId) {
    storyData.story.parent_id = parseInt(parentId);
  }

  const response = await request("/stories/", {
    method: "POST",
    body: JSON.stringify(storyData),
  });

  const s = response.story;
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    full_slug: s.full_slug,
    content_type: s.content?.component,
    published: s.published,
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
      case "components":
        result = await getComponents();
        break;

      case "stories":
        result = await getStories(flags["content-type"], parseInt(flags["per-page"] || "25"));
        break;

      case "story":
        if (!positional[1]) {
          throw new Error("Usage: story <story_id>");
        }
        result = await getStory(positional[1]);
        break;

      case "create":
        if (!flags["content-type"] || !flags.name || !flags.slug) {
          throw new Error("Usage: create --content-type <type> --name <name> --slug <slug> [--parent <parent_id>] [--data <json>]");
        }
        const data = flags.data ? JSON.parse(flags.data) : undefined;
        result = await createStory(
          flags["content-type"],
          flags.name,
          flags.slug,
          flags.parent,
          data
        );
        break;

      default:
        throw new Error(`Unknown command: ${command}. Available: components, stories, story, create`);
    }

    console.log(JSON.stringify({ success: true, data: result }, null, 2));
  } catch (error: any) {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

main();
