---
name: storyblok-content
description: "Storyblok CMS — create and manage pages, blog articles, integrations, and any content type. Use when: creating pages, editing Storyblok content, publishing stories, managing assets, or building page layouts with components."
---

# Storyblok Content Management

Skill para crear y gestionar contenido en el CMS de Storyblok. Usa mcporter para CRUD y md2rt para convertir markdown a richtext.

## Setup

### Requisitos

- `mcporter` CLI con el MCP server de Storyblok configurado — si `which mcporter` falla, NO hay CRUD: instalarlo y configurarlo antes de continuar.
- `op` (1Password CLI) con acceso al item `storyblok-cdn-token` (los scripts leen el token con `op read`).
- `storyblok` CLI global (solo para `generate-types.sh`).

Space ID: `310467`

### Verificar conexion

```bash
mcporter call storyblok.search query="stories"
```

## CRUD via mcporter

Todas las operaciones CRUD usan el MCP server de Storyblok via mcporter.

### Buscar operaciones

Siempre busca primero para obtener el operationId correcto:

```bash
mcporter call storyblok.search query="stories"
mcporter call storyblok.search query="assets"
mcporter call storyblok.search query="components"
```

### Leer (operaciones readOnly)

```bash
# Listar stories
mcporter call storyblok.execute_readonly operation=listStories parameters='{"space_id": 310467}'

# Filtrar por content type
mcporter call storyblok.execute_readonly operation=listStories parameters='{"space_id": 310467, "contain_component": "content-blog-article"}'

# Obtener story por ID
mcporter call storyblok.execute_readonly operation=getStory parameters='{"space_id": 310467, "story_id": 12345}'

# Listar componentes
mcporter call storyblok.execute_readonly operation=listComponents parameters='{"space_id": 310467}'

# Listar assets
mcporter call storyblok.execute_readonly operation=listAssets parameters='{"space_id": 310467}'
```

### Crear y actualizar

```bash
# Crear story (siempre como draft)
mcporter call storyblok.execute operation=createStory parameters='{"space_id": 310467, "story": {"name": "Mi articulo", "slug": "mi-articulo", "parent_id": 573400902, "content": {"component": "content-blog-article", "title": "...", "content": {...}}}}'

# Actualizar story
mcporter call storyblok.execute operation=updateStory parameters='{"space_id": 310467, "story_id": 12345, "story": {"content": {...}}}'

# Publicar story
mcporter call storyblok.execute operation=publishStory parameters='{"space_id": 310467, "story_id": 12345}'
```

### Subir assets

```bash
# Desde URL
mcporter call storyblok.upload_asset space_id=310467 filename="hero.png" source="https://example.com/image.png" alt="Descripcion"

# Desde archivo local
mcporter call storyblok.upload_asset space_id=310467 filename="hero.png" source="/path/to/image.png" alt="Descripcion"
```

### Eliminar (operaciones destructive)

```bash
mcporter call storyblok.execute_destructive operation=deleteStory parameters='{"space_id": 310467, "story_id": 12345}'
```

## Preview de drafts en producción

Para ver cómo se renderiza un story en draft (antes de publicar), usar el script `preview-url.sh` que genera la URL automáticamente con el token CDN global de 1Password:

```bash
./scripts/preview-url.sh blog/mi-articulo
# Output: https://easymailing.com/blog/mi-articulo?preview_secret=xxxxx
```

### Ejemplos

```bash
./scripts/preview-url.sh blog/ia-util-vs-ia-cosmetica-email-marketing
./scripts/preview-url.sh guides/automatizaciones
./scripts/preview-url.sh integrations/shopify
```

### Cuándo usar

- **Antes de crear `content_publish` approval**: verificar visualmente que el draft montado en Storyblok se renderiza correctamente en producción.
- **Para screenshots de verificación**: pasar esta URL a la skill `screenshots` para capturar el estado del draft.
- **Debugging de componentes**: comprobar que blok nodes (CTAs, expert-tips, FAQs, box-alerts) renderizan bien antes de publicar.

### Importante

- **NUNCA construir la URL de preview manualmente** ni usar el `preview_token` que devuelve la API de Storyblok en la respuesta de cada story. Ese token no es equivalente al `preview_secret` de la web pública. Usar siempre este script.
- El token es el mismo CDN token que usa `cdn-get.sh` (almacenado en 1Password).
- La URL de preview solo funciona si el story existe como draft en Storyblok (no tiene que estar publicado).
- El `full_slug` es el que devuelve Storyblok (sin `/` inicial): `blog/mi-slug`, `guides/mi-slug`, etc.

## Consultar version publicada (CDN API)

El Management API (`getStoryById`) siempre devuelve la version **draft**. Para ver el JSON **publicado** (lo que ven los usuarios), usar el script `cdn-get.sh` que consulta el Content Delivery API:

```bash
# Version publicada
./scripts/cdn-get.sh blog/mi-articulo

# Version draft (para comparar)
./scripts/cdn-get.sh blog/mi-articulo --draft
```

El slug es el `full_slug` del story (sin `/` inicial). El token CDN se lee de 1Password (`op://Easymailing/storyblok-cdn-token/credential`).

**Cuando usar:**
- Antes de actualizar un story: comparar published vs draft para saber que cambio
- Para verificar que una publicacion se aplico correctamente
- Para obtener el contenido publicado con todas las imagenes y componentes inline intactos

## Conversion markdown → richtext

El contenido de origen esta en markdown. Storyblok usa richtext (ProseMirror). Usa `md2rt.ts` para la conversion:

```bash
# Desde stdin
echo "# Titulo\n\nTexto **bold**" | npx bun skills/storyblok-content/scripts/md2rt.ts

# Desde archivo
npx bun skills/storyblok-content/scripts/md2rt.ts --file /path/to/content.md
```

Output: `{ "success": true, "data": { "type": "doc", "content": [...] } }`

### Que hace md2rt automaticamente

- **Elimina comentarios HTML** (`<!-- ... -->`) — los metadatos del redactor no aparecen en el richtext
- **Elimina frontmatter** (`---` al inicio) — no genera horizontal_rule por el separador
- **Convierte tablas markdown** a ProseMirror (`table` > `tableRow` > `tableHeader`/`tableCell`) con attrs (colspan, rowspan, colwidth, backgroundColor) y soporte para **bold**, *italic* y [links](url) dentro de las celdas
- **Snake_case para listas** — `bullet_list`, `ordered_list`, `list_item`, `code_block`, `horizontal_rule`, `hard_break`
- **CamelCase para tablas** — `tableRow`, `tableCell`, `tableHeader` (formato nativo de Storyblok)

### Limitaciones de md2rt

- **Componentes inline**: expert-tip, box-alert, content-accordeon (FAQs), PromoCard, call-to-action, content-image, etc. no se generan desde markdown. Se insertan manualmente como blok nodes en el JSON resultante. Ver `reference/composition-guide.md` seccion "Patrones de articulo" para donde colocarlos

### Componentes inline en richtext (blok nodes)

Dentro de cualquier campo richtext (ej: `content` de un blog article) se pueden insertar componentes como nodos `blok`. Estos se renderizan inline entre el texto, no en containers.

**Formato de un blok node:**
```json
{
  "type": "blok",
  "attrs": {
    "id": "<uuid>",
    "body": [{
      "component": "<nombre-componente>",
      "_uid": "<uuid>",
      ...campos del componente...
    }]
  }
}
```

**Componentes disponibles como inline en richtext:**

| Componente | Campos | Uso |
|---|---|---|
| `box-alert` | color (info/warning/error/success/brand/neutral), content (richtext) | Aviso, warning, nota informativa |
| `expert-tip` | title, content (richtext), link (url obj), link_text | Consejo destacado de experto |
| `check-list` | title, content (richtext con lista) | Lista con iconos de check |
| `content-image` | image (asset obj) | Imagen inline en el articulo |
| `content-button` | label, link (url obj), color (primary/secondary/...), variant (solid/outline/...), size (xs-xl), align | Boton con link |
| `content-table` | table (storyblok table plugin), center (bool) | Tabla de datos |
| `embed-video` | url (string) | Video embebido (YouTube, Vimeo, etc.) |
| `PromoCard` | image (asset), title, subtitle, cta_text, cta_link (url obj), button_color, background_color, border_color | Tarjeta promocional con CTA |
| `easymailing-form` | (formulario de registro Easymailing) | Formulario de captacion inline |

**Ejemplo: expert-tip dentro de un articulo:**
```json
{
  "type": "blok",
  "attrs": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "body": [{
      "component": "expert-tip",
      "_uid": "f1e2d3c4-b5a6-7890-abcd-ef1234567890",
      "title": "Consejo profesional",
      "content": {
        "type": "doc",
        "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Segmenta tu lista antes de enviar." }] }]
      },
      "link": { "url": "https://easymailing.com/blog/segmentacion", "linktype": "url" },
      "link_text": "Saber mas"
    }]
  }
}
```

**IMPORTANTE:** Estos componentes son los unicos que van como `blok` nodes dentro de richtext. Otros como `call-to-action`, `content-accordeon`, `image-banner`, `divider` son componentes de **container** (van dentro de `container.content[]` en paginas con body, no inline en richtext).

### Mapeo markdown → Storyblok

El writer usa la sintaxis `<!-- BLOK -->` / `<!-- /BLOK -->` con campos nombrados. El publisher convierte esos campos a los campos reales de Storyblok:

| Componente | Campo markdown | Campo Storyblok | Notas |
|---|---|---|---|
| `call-to-action` | `título` | `title` | |
| | `botones` | `show_signup`, `show_demo` | `registro` → `show_signup: true`, `demo` → `show_demo: true` |
| `call-to-action-image` | `título` | `title` | |
| | `botón` | `signup_text` | |
| | `imagen` | `image` (asset) | Subir asset si es descripcion, usar URL si ya existe |
| `image-banner` | `título` | `title` | |
| | `contenido` | `content` (richtext) | Convertir texto a richtext |
| | `link` | `link` (multilink) | URL → `{ url, linktype: "url" }` o link interno |
| | `link_texto` | `link_text` | |
| | `imagen` | `image` (asset) | Subir asset si es descripcion |
| `expert-tip` | `título` | `title` | |
| | `contenido` | `content` (richtext) | Convertir texto a richtext |
| | `link` | `link` (multilink) | Opcional |
| | `link_texto` | `link_text` | Opcional, requiere `link` |
| `box-alert` | `tipo` | `color` | `info`, `warning`, `error`, `success` |
| | `contenido` | `content` (richtext) | Convertir texto a richtext |
| `content-accordeon` | `P` / `R` pares | `items[]` → `content-accordeon-item` | `P` → `title`, `R` → `description` (richtext). `content_style: "faqs"` |
| `check-list` | `título` | `title` | |
| | `contenido` | `content` (richtext) | Convertir lista a richtext |
| `content-image` | `imagen` | `image` (asset) | Subir asset si es descripcion |
| | `alt` | `image.alt` | Alt text del asset |
| `embed-video` | `url` | `url` | |
| `integration-list` | `integraciones` | `items[]` | Buscar stories en `/integrations/` por nombre y referenciar |

**Validacion obligatoria antes de montar:** Si un campo obligatorio esta vacio, no montar el componente. Reportar al writer.

## Content types

### Paginas con containers (body → container[])

| Tipo | Uso | Carpeta |
|---|---|---|
| `content-static-page` | Producto, features, comparativas | /features/, /comparativas/ |
| `content-landing-page` | Landing pages con CTA | /lp/ |
| `content-resource` | Recursos descargables | /resources/ |

### Paginas de contenido (richtext directo)

| Tipo | Uso | Campos clave |
|---|---|---|
| `content-blog-article` | Blog | title, author, categories, reading_time, excerp, content, grid_image, detail_image, keywords, metatags |
| `content-guide-article` | Guias | title, category, reading_time, excerp, content, grid_image, detail_image |
| `content-integration` | Integraciones | title, categories, excerpt, min_plan, logo, content |
| `content-glossary-term` | Glosario | term, title, content |
| `content-legal-page` | Legal | title, content |

### Datos auxiliares

| Tipo | Uso |
|---|---|
| `blog-author` | Autores (name, avatar) |
| `blog-category` | Categorias (name, description) |
| `blog-tag` | Tags (name) |

## Metatags (SEO)

El campo `metatags` usa el plugin `seo_metatags` de Storyblok:

```json
{
  "metatags": {
    "title": "Meta title",
    "description": "Meta description",
    "og_title": "OG Title",
    "og_description": "OG Description",
    "og_image": "https://a.storyblok.com/f/310467/...",
    "twitter_title": "Twitter Title",
    "twitter_description": "Twitter Description",
    "twitter_image": "https://a.storyblok.com/f/310467/..."
  }
}
```

El schema JSON-LD se genera automaticamente — NO incluirlo manualmente.

## Actualizar stories existentes

**CRITICO**: `updateStory` de Storyblok reemplaza `story.content` por completo. Si envias solo texto nuevo, pierdes imagenes, blok nodes (PromoCard, CTA, FAQs) y metatags existentes.

Protocolo obligatorio:

1. Leer el story publicado con `cdn-get.sh` antes de hacer nada
2. Usar el content existente como base
3. Solo reemplazar los campos que tienen valores nuevos
4. Para richtext: extraer blok nodes existentes, reemplazar nodos de texto, reinsertar blok nodes

Ver `reference/composition-guide.md` seccion "Actualizar un articulo existente" para el protocolo completo con pseudocodigo.

## Refreshes: checklist operativa

Cuando la tarea es un refresh de un contenido ya publicado (actualizar una pagina existente), el story ya existe. La regla central: **published = base, briefing = delta, todo lo no mencionado se preserva**.

### Paso a paso

1. **Backup**: GET story published (`cdn-get.sh {slug}`) → guardar backup local del JSON completo (p.ej. `backup-pre-refresh-{YYYY-MM-DD}.json` junto al material de trabajo).
2. **Leer briefing**: leer el campo `briefing` del content o `variants[0].body` si no hay briefing separado → listar explicitamente que campos y secciones cambian.
3. **Aplicar delta**: usar el story published como base. Aplicar SOLO los cambios del briefing sobre el content existente. No crear story nuevo. No reemplazar el body completo salvo que el briefing lo pida explicitamente.
4. **Verificar preservacion**: confirmar que siguen intactos todos los elementos no mencionados en el delta:
   - Imagenes: `gridImage`, `detailImage`, `content-image`, `image-banner`, `call-to-action-image`
   - Bloques CMS: `expert-tip`, `box-alert`, `content-accordeon`, `check-list`, `integration-list`, `embed-video`
   - CTAs: `call-to-action`, `call-to-action-image`
   - Tablas, listas, estructura general del richtext
5. **Comparar draft vs published**: antes de enviar approval, revisar que la unica diferencia entre el draft y la version published son los cambios que el briefing pedia. Si hay diferencias no justificadas, corregir.

### Errores frecuentes a evitar

- Crear un story nuevo en vez de actualizar el existente.
- Reemplazar `story.content` completo con solo los campos nuevos (pierdes todo lo demas).
- Regenerar el richtext del body desde markdown sin reinsertar blok nodes existentes.
- Eliminar imagenes porque no aparecen en customData del content en MC (en un refresh, las imagenes ya estan en Storyblok).

## Carpetas principales en Storyblok

| Carpeta | parent_id | Content type |
|---|---|---|
| /blog/ | 573400902 | content-blog-article |
| /guides/ | (buscar) | content-guide-article |
| /comparativas/ | (buscar) | content-static-page |
| /lp/ | (buscar) | content-landing-page |
| /integrations/ | (buscar) | content-integration |
| /glossary/ | (buscar) | content-glossary-term |
| /legal/ | (buscar) | content-legal-page |

## Referencia completa

| Archivo | Contenido |
|---------|-----------|
| `reference/storyblok.d.ts` | Tipos TypeScript — campos exactos de cada componente |
| `reference/composition-guide.md` | Composicion de paginas, patrones de articulo, formato richtext, blok nodes, protocolo de actualizacion |
| `reference/interlinking.md` | Estructura de URLs del site, enlaces internos en richtext, patrones de enlazado, cuantos links por articulo |

Para regenerar los tipos tras cambios en Storyblok:
```bash
./generate-types.sh
```
