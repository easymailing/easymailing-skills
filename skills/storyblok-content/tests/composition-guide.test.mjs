// Reglas editoriales de la guía de composición (trasladado de agent-hub: lib/seo-editorial-lifecycle.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const guia = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "references", "composition-guide.md"), "utf8");

test("deja CTA y formularios como opcionales en la guía de composición", () => {
  assert.ok(guia.includes("No existe una anatomia obligatoria unica"));
  assert.ok(guia.includes("solo si el brief lo pide"));
  assert.ok(guia.includes("No uses divisores visuales tipo `---`"));
});
