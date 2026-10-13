---
name: em-help-center
description: "Help Center NUEVO de la Customer App (segunda marca de Zendesk, no pública hasta el lanzamiento): sincroniza los artículos Markdown del repo help-center con Zendesk (estructura, artículos ES/EN, imágenes, borrador o publicado). Usar al crear, actualizar o publicar artículos de ayuda de la nueva Customer App, o para saber qué artículos afecta un cambio de pantalla. No toca el Help Center actual."
---

# Help Center nuevo (Zendesk)

Los artículos viven en el repo `easymailing/help-center` (en el workspace: `producto/help-center/`). Lee su `AGENTS.md` (frontmatter, flujo y guía de redacción) antes de escribir. Para redactar un artículo desde cero usa también la skill `em-kb-article`.

```bash
HC="node $SKILL_DIR/scripts/hc.mjs"   # ejecutar desde la raíz del repo help-center (o HELP_CENTER_DIR=...)
$HC check                      # valida frontmatter, secciones e imágenes
$HC afectados /crm/segments    # artículos que cubren una pantalla de la app
$HC traducciones               # EN que faltan o están desfasadas
$HC hash articulos/es/...md    # valor para traduccion_de al traducir
$HC estructura --dry-run       # categorías/secciones de zendesk.json que faltan
$HC sync --dry-run             # plan de cambios sin escribir
$HC sync                       # aplica: crea/actualiza, sube imágenes, escribe zendesk_id
```

- Todo pasa por `em-api zendesk` contra el **subdominio de la marca nueva** (`zendesk.json`); si no está configurado, `hc` se niega. Antes de escribir comprueba que cada artículo existente está en una sección nuestra.
- **Publicar** = cambiar `estado: publicado` en el frontmatter y `hc sync`. Hazlo solo cuando Sergio lo diga.
- Ejecuta siempre `hc sync --dry-run` y enseña el plan antes del primer `sync` de una sesión.
- Dependencias: `npm install` en esta carpeta (lo hace `bin/install`).
- **OpenClaw**: ejecuta `hc` mediante `gateway_exec` (hereda el sentinel de `ZENDESK_API_TOKEN`).
