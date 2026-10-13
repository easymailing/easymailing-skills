# easymailing-kb en OpenClaw

- Ejecuta `node <skills>/easymailing-kb/scripts/kb.mjs buscar ...` mediante `gateway_exec` (Gateway de OpenClaw, Codex). El secreto `EASYMAILING_KB_API_KEY` es un sentinel ligado a `api.openai.com`; `em-api` lo usa solo. No ejecutes desde shell nativo/sandbox ni uses `op read`.
- Hueco de conocimiento: crea una tarea de mejora de KB en Mission Control con: pregunta original, qué buscaste y en qué tipos, qué faltaba, por qué importa y siguiente paso propuesto (nuevo artículo, ampliar, aclarar pricing, documentar integración).
