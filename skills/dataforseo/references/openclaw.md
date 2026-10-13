# DataForSEO en OpenClaw

Los comandos se ejecutan mediante `gateway_exec`; las peticiones usan `em-api dataforseo` (sentinel `oc-sent-…` en `DATAFORSEO_API_TOKEN`). Las rutas siguientes son de la máquina de OpenClaw (Mac Mini); ajústalas con las variables de ese entorno.

## Cron weekly-llm-coverage y Mission Control

La linea estable `DATAFORSEO_LLM_COVERAGE_SUMMARY` mapea el resultado para Mission Control: `success -> success`, `partial -> partial`, `failed -> error`. El cron usa el caller versionado con un flujo fail-closed:

```bash
# PRIMERA operacion del cron
/opt/homebrew/bin/node ${AGENT_HUB:-$HOME/agent-hub}/scripts/mc-calendar-log.mjs start \
  --agent-file $HOME/.openclaw/workspace-seo-strategist/AGENTS.md \
  --cron "weekly-llm-coverage"

# Ejecutar llm-coverage. Crear /tmp/weekly-llm-coverage-summary.log con la
# herramienta de escritura de archivos, nunca con heredoc o redireccion shell,
# y asegurar que el archivo tenga modo 0600.
/bin/chmod 600 /tmp/weekly-llm-coverage-summary.log

# Operacion FINAL del cron
/opt/homebrew/bin/node ${AGENT_HUB:-$HOME/agent-hub}/scripts/mc-calendar-log.mjs finish \
  --agent-file $HOME/.openclaw/workspace-seo-strategist/AGENTS.md \
  --cron "weekly-llm-coverage" \
  --log-file /tmp/weekly-llm-coverage-summary.log \
  --status partial
```

Usar en `finish` el status real de la linea machine-readable, ya mapeado a `success | partial | error`; `skipped` queda disponible para una omision intencionada. La ruta absoluta de `--agent-file` apunta al `AGENTS.md` provisionado y debe ser identica en `start` y `finish`. `--duration-ms` y `--run-id` son opcionales: incluirlos solo si OpenClaw entrega los valores reales. Nunca inventar un `runId`; omitir el flag mientras no exista.

Si `start` o `finish` falla, detenerse. Ejecutar `inspect` con el mismo caller, tools file y cron; usar `retry` para fase `prepared`, o `abandon --started-at <startedAt-real-de-inspect>` para fase `started` solo cuando se decida descartar la ejecucion. No empezar otra ejecucion con recovery pendiente.

Cambiar esta skill local no actualiza los crons live: se requiere sync de skills y actualizar/desplegar el prompt o caller que consume el resumen. No ejecutar probes de pago para validar cambios de formato o control de flujo; usar los tests con transporte inyectado.


## Variante con --tools-file

Para un cron, consume la linea `DATAFORSEO_LLM_COVERAGE_SUMMARY` y reporta a Mission Control con el mapping completo `success -> success`, `partial -> partial`, `failed -> error`. El flujo fail-closed es:

```bash
# PRIMERA operacion del cron
/opt/homebrew/bin/node ${AGENT_HUB:-$HOME/agent-hub}/scripts/mc-calendar-log.mjs start \
  --tools-file $HOME/.openclaw/workspace-seo-strategist/TOOLS.md \
  --cron "weekly-llm-coverage"

# Ejecutar el informe. Crear /tmp/weekly-llm-coverage-summary.log mediante la
# herramienta de escritura de archivos (no heredoc ni redireccion shell) y
# asegurar modo 0600.
/bin/chmod 600 /tmp/weekly-llm-coverage-summary.log

# Operacion FINAL del cron
/opt/homebrew/bin/node ${AGENT_HUB:-$HOME/agent-hub}/scripts/mc-calendar-log.mjs finish \
  --tools-file $HOME/.openclaw/workspace-seo-strategist/TOOLS.md \
  --cron "weekly-llm-coverage" \
  --log-file /tmp/weekly-llm-coverage-summary.log \
  --status partial
```

Sustituir `partial` por el status real mapeado (`success | partial | error`; `skipped` solo para omision intencionada). La ruta absoluta de `--tools-file` es la provisionada para el agente y debe ser exactamente la misma en ambas operaciones. `--duration-ms` y `--run-id` son opcionales y solo se incluyen cuando el runtime ofrece sus valores reales. Nunca inventar `runId`: si no existe, omitir el flag.

Ante cualquier fallo, detener el flujo. Ejecutar `inspect` con el mismo caller, tools file y cron; una fase `prepared` se recupera con `retry`, mientras que una fase `started` solo se descarta deliberadamente con `abandon --started-at <startedAt-real-de-inspect>`. No lanzar otro `start` mientras haya recovery pendiente. El caller/prompt live debe actualizarse y desplegarse: instalar este cambio local no crea ejecuciones amber por si solo.

