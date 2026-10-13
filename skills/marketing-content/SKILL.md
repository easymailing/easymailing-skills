---
name: em-marketing-content
description: Use when creating marketing content for Easymailing - blog articles, integration pages, or product pages. Also use when user says "crear contenido", "escribir blog", "crear integración", "página de producto", or similar requests. For newsletters use em-newsletter skill instead.
---

# Marketing Content para Easymailing

Genera contenido de comunicación y marketing para Easymailing, siguiendo la guía de estilo y delegando a skills de marketing especializadas.

## Configuración requerida

### Archivo de configuración

Verifica que existe `.content-config.json` en la carpeta de esta skill. Si no existe, pregunta:

1. "¿Cuál es la ruta del proyecto Easymailing?"
2. "¿Cuál es la ruta del vault de Obsidian?"
3. "¿Cuál es el space_id de Storyblok?"

Crea el archivo con esta estructura (sin secretos):

```json
{
  "project_path": "/Users/sergio/Sites/easymailing/producto/easymailingv2-docker",
  "obsidian_vault_path": "{ruta al vault}"
}
```

### Contexto de marca y producto

Antes de generar contenido lee, del repo de conocimiento (`/Users/sergio/Sites/easymailing/conocimiento`, o `~/conocimiento`):
- `marketing/marca-y-tono.md` y `marketing/posicionamiento.md`
- `producto/diferenciales.md`, `producto/funcionalidades.md` y el ICP que aplique en `clientes/icp/`

## Storyblok

Todas las operaciones con Storyblok se hacen con la skill **storyblok-content** (CLI `sb`, credenciales vía `em-api`; sin `.env`):

```bash
SB="node <ruta de la skill storyblok-content>/scripts/sb.mjs"
$SB componentes                                   # componentes disponibles
$SB buscar --componente content-blog-article      # stories de un content type
$SB historia <id|full_slug>                       # una story concreta (estructura/ejemplo)
$SB crear story.json --padre <parent_id>          # crear como borrador; story.json = {"story":{"name":...,"slug":...,"content":{"component":"<type>", ...}}}
```

Nunca publiques desde esta skill: el borrador queda para revisión y se publica con `sb publicar` solo cuando Sergio lo diga.

## Referencias obligatorias

SIEMPRE lee antes de generar contenido (rutas desde `.content-config.json`):
- `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/style-guide.md`
- `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/product-marketing-context.md`

Para consistencia, lee el último contenido similar si existe.

## Rutas del proyecto

Leer de `.content-config.json`:
- **Proyecto Easymailing**: `project_path`
- **Vault Obsidian**: `obsidian_vault_path`
- **Storyblok space_id**: `storyblok.space_id`

## Estructura en Obsidian

```
Areas/Easymailing/Comunicacion/
├── Content/
│   ├── Blog/
│   │   └── {fecha}-{slug}/
│   │       ├── brief.md
│   │       └── article.md
│   ├── Integraciones/
│   │   └── {slug}/
│   │       ├── brief.md
│   │       └── integration.md
│   └── Paginas-Producto/
│       └── {slug}/
│           ├── brief.md
│           └── page-spec.md
├── Social/
│   └── {fecha}-{slug}.md
├── style-guide.md
└── product-marketing-context.md
```

> **Nota:** Los posts para redes se guardan en `Social/` mediante la skill `em-social-content`.
