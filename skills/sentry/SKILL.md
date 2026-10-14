---
name: em-sentry
description: "Errores de producción de Easymailing en Sentry, en los proyectos easymailing (backend) y customer-app (nueva aplicación): incidencias abiertas, detalle con el stacktrace del último evento, eventos resumen de las últimas 24 h y marcar incidencias como resueltas (con confirmación). Usar cuando pregunten «¿hay errores en producción?», «¿qué está fallando?», «mira este error de Sentry», «¿cuántos usuarios afecta?», tras un despliegue, o antes de depurar un bug reportado."
---

# Sentry

`sn` **no es un comando instalado**: invócalo siempre con `node` y la ruta del script (`SKILL_DIR` = carpeta de esta skill; en OpenClaw, `~/easymailing-skills/skills/sentry`). Va sobre `em-api sentry` (item `sentry-api-token`). En OpenClaw, mediante `gateway_exec`.

```bash
SN="node $SKILL_DIR/scripts/sn.mjs"
$SN resumen                                   # nuevas y más frecuentes de las últimas 24 h, por proyecto
$SN issues [--proyecto customer-app] [--query "is:unresolved level:error"] [--orden date|freq|new] [--periodo 24h] [--max 25]
$SN issue CUSTOMER-APP-1A                     # detalle + último evento: excepción, marcos de la app, URL, release
$SN eventos CUSTOMER-APP-1A [--max 10]
$SN proyectos                                 # slugs reales de la organización
$SN resolver CUSTOMER-APP-1A --confirmado      # marca como resuelta (escritura)
```

- Proyectos por defecto: `easymailing` y `customer-app` (cámbialos con `SENTRY_PROJECTS=a,b`). Si uno da 404, comprueba el slug con `sn proyectos`.
- La salida omite cookies, cabeceras, cuerpo de las peticiones y datos de usuario: no los busques por otra vía ni los pegues en informes.
- Para depurar: `sn issue <ID>` da fichero, función y línea en el código de la app; ve al repo (`producto/easymailingv2-docker`) y sigue sus `AGENTS.md`.
- `resolver` es la única escritura: añade `--confirmado` solo cuando Sergio lo pida o apruebe esa incidencia concreta (en OpenClaw, tras approval). Ignorar o asignar no está en la skill.
