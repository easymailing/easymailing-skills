# easymailing-skills

Skills comunes de Easymailing para cualquier IA (Claude Code, Codex, agentes OpenClaw y las que vengan). Formato estándar Agent Skills: `skills/<dir>/SKILL.md` con `name` y `description`.

## Reglas

1. **Primero la línea de comandos.** Toda integración es un script o CLI ejecutable desde terminal. Un MCP puede mencionarse como alternativa, nunca como requisito.
2. **Credenciales solo vía `bin/em-api`** (destino fijo por servicio, definido en `servicios.json`). Ninguna skill lee `.env`, pide tokens en el chat ni documenta `em-secret`.
3. **Nunca imprimas ni escribas un secreto** (ficheros, commits, mensajes, logs).
4. **Tests obligatorios** para todo script (`tests/` de la raíz o `skills/<dir>/tests/`), con las APIs simuladas.
5. **Nada de rutas absolutas de una máquina**: usa variables de entorno con valor por defecto documentado.
6. **Publicar es decisión del flujo, no de la skill**: las skills crean borradores y publican solo con un comando explícito (con Claude, cuando Sergio lo dice; en OpenClaw, tras su approval).
7. Mantén los `SKILL.md` concisos: se cargan en el contexto del agente.

## Instalación

- Mac: `bin/install` (enlaza las skills en `~/.agents/skills`, `~/.claude/skills`, `~/.codex/skills` y añade `bin/` al PATH).
- Mac Mini (OpenClaw): `skills.load.extraDirs` incluye `~/easymailing-skills/skills`.
- Credenciales en el Mac: cuenta de servicio de 1Password (vault «Marcos OpenClaw», solo lectura) con su token en el Llavero (`security add-generic-password -U -s em-1password-sa -a "$USER" -w`). En OpenClaw: sentinels. Para servicios con `auth.tipo: basic` (ChartMogul, Zendesk) el almacén guarda la credencial Basic **ya codificada** (`base64(usuario:clave)`) y `em-api` la envía como `Authorization: Basic <sentinel>`: el proxy no sustituye un sentinel dentro del base64.

## Tests

`for t in tests/*.test.sh; do bash $t; done` y `node --test skills/*/tests/*.test.mjs`.
