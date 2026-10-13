import * as fs from "fs";

export interface PromptsFile {
  prompts: string[];
  source: string;
}

export function readPromptsFile(filePath: string): PromptsFile {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompts file not found: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const prompts: string[] = [];
  let seenFirstFence = false;
  let inFrontmatter = false;
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    // YAML frontmatter delimited by --- at file start; skip everything inside
    if (line === "---") {
      if (!seenFirstFence) { seenFirstFence = true; inFrontmatter = true; continue; }
      if (inFrontmatter) { inFrontmatter = false; continue; }
    }
    if (inFrontmatter) continue;
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("<!--")) continue;
    const cleaned = line.replace(/^[-*]\s+/, "").replace(/^"|"$/g, "").trim();
    if (cleaned) prompts.push(cleaned);
  }
  return { prompts, source: filePath };
}
