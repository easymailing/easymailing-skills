---
name: storyblok-content
description: "Storyblok CMS (web de easymailing.com) — crear y editar páginas, artículos de blog, integraciones, comparativas y landings; vista previa de borradores y publicación explícita. Usar al crear o editar contenido de la web, publicar o despublicar historias, subir assets o componer páginas con componentes."
---

# Storyblok

CLI `sb` sobre la Management API, vía `em-api storyblok` (credencial sin exponer: cuenta de servicio de 1Password en el Mac, sentinel en OpenClaw). Sin MCP. `SKILL_DIR` = carpeta de esta skill. Space `310467`.

## Comandos

```bash
SB="node $SKILL_DIR/scripts/sb.mjs"
$SB buscar "segmentación" [--componente content-blog-article]
$SB historia <id|full_slug>          # draft actual (Management API)
$SB publicada <full_slug>            # versión publicada (CDN)
$SB componentes                      # esquema de componentes
$SB crear art.md --componente content-blog-article --campo content --nombre "Título" --slug mi-articulo --padre 573400902
$SB crear story.json [--padre ID]    # payload {story:{...}}
$SB actualizar <id|slug> story.json  # copia previa + PUT (borrador)
$SB preview <id|slug>                # URL de vista previa firmada (caduca en 1 h)
$SB publicar <id|slug>               # copia previa + publish
$SB despublicar <id|slug>
$SB borrar <id|slug>
$SB assets subir hero.png --alt "Descripción"
```

- **Todo se crea y actualiza en borrador.** Publicar es una decisión del flujo: con Claude, solo cuando Sergio lo dice; en OpenClaw, tras su approval (`references/openclaw.md`).
- **Copia previa**: `actualizar`, `publicar`, `despublicar` y `borrar` guardan el JSON anterior en `$STORYBLOK_BACKUP_DIR` (por defecto `~/.local/state/storyblok-backups`). Si la copia falla, no se escribe nada.
- `actualizar` **reemplaza `story.content` entero**: parte siempre del contenido existente (ver «Actualizar stories existentes»).
- La URL de `preview` contiene una firma temporal: dásela a Sergio para revisar, no la guardes en ficheros ni comentarios.
- **OpenClaw**: ejecuta siempre `sb` mediante `gateway_exec` (es lo que hereda el sentinel y el proxy protegido; con exec normal falla por falta de credencial). Capturas del draft y approvals en [references/openclaw.md](references/openclaw.md).

## Conversion markdown → richtext

El contenido en Mission Control esta en markdown. Storyblok usa richtext (ProseMirror). Usa `md2rt.ts` para la conversion:

```bash
# Desde stdin
echo "# Titulo\n\nTexto **bold**" | npx -y bun "$SKILL_DIR/scripts/md2rt.ts"

# Desde archivo
npx -y bun "$SKILL_DIR/scripts/md2rt.ts" --file /path/to/content.md
```

Output: `{ "success": true, "data": { "type": "doc", "content": [...] } }`

### Que hace md2rt automaticamente

- **Elimina comentarios HTML** (`<!-- ... -->`) — los metadatos del redactor no aparecen en el richtext
- **Elimina frontmatter** (`---` al inicio) — no genera horizontal_rule por el separador
- **Convierte tablas markdown** a ProseMirror (`table` > `tableRow` > `tableHeader`/`tableCell`) con attrs (colspan, rowspan, colwidth, backgroundColor) y soporte para **bold**, *italic* y [links](url) dentro de las celdas
- **Snake_case para listas** — `bullet_list`, `ordered_list`, `list_item`, `code_block`, `horizontal_rule`, `hard_break`
- **CamelCase para tablas** — `tableRow`, `tableCell`, `tableHeader` (formato nativo de Storyblok)

### Limitaciones de md2rt

- **Componentes inline**: expert-tip, box-alert, content-accordeon (FAQs), PromoCard, call-to-action, content-image, etc. no se generan desde markdown. Se insertan manualmente como blok nodes en el JSON resultante. Ver `references/composition-guide.md` seccion "Patrones de articulo" para donde colocarlos

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

El writer usa la sintaxis `<!-- BLOK -->` / `<!-- /BLOK -->` con campos nombrados (ver skill `seo-workflow` → "Componentes inline"). El publisher convierte esos campos a los campos reales de Storyblok:

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

**Validacion obligatoria antes de montar:** Si un campo obligatorio (`*` en seo-workflow) esta vacio, no montar el componente. Reportar al writer.

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

1. Leer el story publicado antes de hacer nada (`sb publicada <slug>`)
2. Usar el content existente como base
3. Solo reemplazar los campos que tienen valores nuevos
4. Para richtext: extraer blok nodes existentes, reemplazar nodos de texto, reinsertar blok nodes

Ver `references/composition-guide.md` seccion "Actualizar un articulo existente" para el protocolo completo con pseudocodigo.

## Refreshes: checklist operativa

Cuando una tarea de CMS es un refresh (el content tiene `workType: "refresh"` en customData), el story ya existe publicado. La regla central: **published = base, briefing = delta, todo lo no mencionado se preserva**.

### Paso a paso

1. **Backup**: `sb actualizar` guarda ya una copia previa del draft; además guarda la versión publicada (`sb publicada {slug}`) junto al material de la tarea (en OpenClaw: `vault://contenidos/{tipo}/{slug}/backup-pre-refresh-{YYYY-MM-DD}.json`).
2. **Leer briefing**: leer el campo `briefing` del content o `variants[0].body` si no hay briefing separado → listar explicitamente que campos y secciones cambian.
3. **Aplicar delta**: usar el story published como base. Aplicar SOLO los cambios del briefing sobre el content existente. No crear story nuevo. No reemplazar el body completo salvo que el briefing lo pida explicitamente.
4. **Verificar preservacion**: confirmar que siguen intactos todos los elementos no mencionados en el delta:
   - Imagenes: `gridImage`, `detailImage`, `content-image`, `image-banner`, `call-to-action-image`
   - Bloques CMS: `expert-tip`, `box-alert`, `content-accordeon`, `check-list`, `integration-list`, `embed-video`
   - CTAs: `call-to-action`, `call-to-action-image`
   - Tablas, listas, estructura general del richtext
5. **Comparar draft vs published**: antes de pedir la publicación, revisar que la unica diferencia entre el draft y la version published son los cambios que el briefing pedia. Si hay diferencias no justificadas, corregir.

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
| `references/storyblok.d.ts` | Tipos TypeScript — campos exactos de cada componente |
| `references/composition-guide.md` | Composicion de paginas, patrones de articulo, formato richtext, blok nodes, protocolo de actualizacion |
| `references/interlinking.md` | Estructura de URLs del site, enlaces internos en richtext, patrones de enlazado, cuantos links por articulo |

Para regenerar los tipos tras cambios en Storyblok:
```bash
"$SKILL_DIR/generate-types.sh"
```
