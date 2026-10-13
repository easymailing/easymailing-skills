import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CACHE_DIR = path.join(os.homedir(), ".cache", "dataforseo");
const CACHE_FILE = path.join(CACHE_DIR, "cache.json");
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry { data: any; ts: number; }
type CacheStore = Record<string, CacheEntry>;

function load(): CacheStore {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed;
  } catch { return {}; }
}

function save(store: CacheStore): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const now = Date.now();
    const pruned: CacheStore = {};
    for (const [k, v] of Object.entries(store)) {
      if (v && typeof v.ts === "number" && now - v.ts < TTL_MS) pruned[k] = v;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(pruned));
  } catch { /* non-fatal */ }
}

export function makeKey(command: string, query: string, location: number, language: string): string {
  return `${command}:${location}:${language}:${query.toLowerCase()}`;
}

export function get(key: string): any | null {
  const store = load();
  const entry = store[key];
  if (!entry || typeof entry.ts !== "number") return null;
  if (Date.now() - entry.ts > TTL_MS) return null;
  return entry.data;
}

export function set(key: string, data: any): void {
  const store = load();
  store[key] = { data, ts: Date.now() };
  save(store);
}

export function printCache(): void {
  const store = load();
  const now = Date.now();
  const entries = Object.entries(store).filter(([, v]) => v && now - v.ts < TTL_MS);
  if (entries.length === 0) { console.log("Cache is empty."); return; }
  console.log(`Cached entries: ${entries.length}\n`);
  for (const [key, entry] of entries) {
    const daysAgo = Math.floor((now - entry.ts) / (24 * 60 * 60 * 1000));
    console.log(`  ${key} (${daysAgo}d ago)`);
  }
}
