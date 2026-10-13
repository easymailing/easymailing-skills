# Storyblok Composition Guide — Easymailing

Referencia de como se componen las paginas en Storyblok. Consulta `storyblok.d.ts` para los tipos exactos de cada campo.

## Content Types (pages root)

Cada story en Storyblok tiene un content type root que define su estructura.

### Paginas con containers (body -> container[])

Estas paginas usan un array de `container` como body. Cada container envuelve componentes:

#### content-static-page
- **Uso:** Paginas de producto, features, soluciones, sobre nosotros
- **Campos:** `body: container[]`, `metatags`
- **Carpeta tipica:** `/features/`, `/solutions/`, `/about/`

#### content-landing-page
- **Uso:** Landing pages con CTA prominente
- **Campos:** `text_cta: string`, `body: container[]`, `metatags`
- **Carpeta tipica:** `/lp/`

#### content-resource
- **Uso:** Recursos descargables (ebooks, whitepapers)
- **Campos:** `title`, `grid_image`, `hash`, `category`, `excerp`, `body: container[]`, `metatags`
- **Carpeta tipica:** `/resources/`

### Paginas de contenido (richtext directo)

Estas paginas tienen un campo `content: richtext` sin containers:

#### content-blog-article
- **Uso:** Articulos de blog
- **Campos obligatorios:** `title`, `author` (relacion a blog-author), `categories` (relacion a blog-category[]), `reading_time`, `excerp`, `content: richtext`, `grid_image`, `detail_image`
- **Campos opcionales:** `tags` (relacion a blog-tag[]), `include_h3_in_menu`, `keywords`
- **Metatags:** `metatags` (title, description, og_title)
- **Carpeta:** `/blog/`

#### content-guide-article
- **Uso:** Guias y tutoriales
- **Campos:** Similar a blog-article pero con `category: string` en vez de relacion
- **Carpeta:** `/guides/`

#### content-integration
- **Uso:** Paginas de integracion
- **Campos obligatorios:** `title`, `categories` (relacion a integration-category[]), `excerpt`, `min_plan`
- **Campos opcionales:** `logo`, `connect` (URL), `developer`, `use_cases`, `featured`, `related_links: integration-link[]`, `integration_platforms: integration-platform[]`, `content: richtext`
- **Carpeta:** `/integrations/`

#### content-glossary-term
- **Uso:** Terminos del glosario
- **Campos:** `term`, `title`, `author`, `content: richtext`
- **Carpeta:** `/glossary/`

#### content-legal-page
- **Uso:** Paginas legales (privacidad, terminos)
- **Campos:** `title`, `content: richtext`

#### content-video
- **Uso:** Videos
- **Campos:** `title`, `url`, `time`, `excerpt`, `content: richtext`, `grid_image`, `category`

## Container — el wrapper universal

Todas las paginas con `body` usan containers:

```json
{
  "component": "container",
  "_uid": "uuid",
  "type": "full-width | boxed | boxed_small",
  "background": "transparent | white | light | dark-gradient | light-fade-overlay",
  "margin_options": "none | top | bottom | top-bottom",
  "content": [ ...componentes nestables... ]
}
```

- `full-width`: ancho completo de pantalla
- `boxed`: ancho maximo ~1200px centrado
- `boxed_small`: ancho maximo ~800px centrado
- `dark-gradient`: fondo oscuro con gradiente (para CTAs finales, heroes)
- `light-fade-overlay`: fondo claro con overlay suave

## Componentes nestables

### Heroes (primer bloque de la pagina)

#### hero-page
Seccion principal con titulo, subtitulo, badge opcional, imagen y formulario de registro.

```json
{
  "component": "hero-page",
  "title": "Titulo principal",
  "subtitle": { "type": "doc", "content": [...] },
  "badge": true,
  "badge_style": "text",
  "badge_text": "Novedad",
  "show_image": true,
  "image": { "filename": "https://a.storyblok.com/..." },
  "show_register": true,
  "supporting_text": "Sin tarjeta de credito"
}
```

#### hero-video-page
Como hero-page pero con video en vez de imagen.

```json
{
  "component": "hero-video-page",
  "title": "Titulo",
  "subtitle": { "type": "doc", "content": [...] },
  "video_url": "https://...",
  "autoplay": true,
  "muted": true,
  "loop": true,
  "controls": false,
  "show_register": true
}
```

### Headers (introducen secciones)

#### section-header
Header de seccion con badge, heading y subheading. Puede incluir botones/links.

```json
{
  "component": "section-header",
  "show_badge": true,
  "badge_text": "Features",
  "heading": { "type": "doc", "content": [...] },
  "subheading": { "type": "doc", "content": [...] },
  "align": "center | left | left-with-padding",
  "theme": "light | dark",
  "content": [ ...content-button, content-link, content-text... ]
}
```

#### content-header
Header mas simple, con tema claro/oscuro.

```json
{
  "component": "content-header",
  "theme": "light | dark",
  "show_badge": true,
  "badge_text": "Texto",
  "heading": { "type": "doc", "content": [...] },
  "subheading": { "type": "doc", "content": [...] }
}
```

### Contenido (secciones principales)

#### content-split-image
Imagen a un lado + header + contenido al otro. Muy usado para features.

```json
{
  "component": "content-split-image",
  "content_direction": "image_right | image_left",
  "image": { "filename": "https://..." },
  "section_header": [{ "component": "section-header", ... }],
  "section_content": { "type": "doc", "content": [...] }
}
```

#### content-split-items
Header a un lado + grid de items al otro.

```json
{
  "component": "content-split-items",
  "section_header": [{ "component": "section-header", ... }],
  "items": [{ "component": "content-grid-item", "icon": "1234", "title": "...", "description": {...} }]
}
```

#### content-grid
Grid de 2, 3 o 4 columnas con items.

```json
{
  "component": "content-grid",
  "columns": "2_columns | 3_columns | 4_columns",
  "items": [{ "component": "content-grid-item", ... }]
}
```

#### content-grid-item
Item de grid con icono, titulo y descripcion.

```json
{
  "component": "content-grid-item",
  "theme": "light | dark",
  "variant": "icon_left_side | icon_top_side | none",
  "icon": "1234",
  "title": "Titulo",
  "description": { "type": "doc", "content": [...] }
}
```

#### content-accordeon
Acordeon con items expandibles. Puede tener estilo FAQ o con imagen.

```json
{
  "component": "content-accordeon",
  "content_style": "faqs | content_with_image_left | content_with_image_right",
  "items": [{ "component": "content-accordeon-item", "title": "Pregunta", "description": {...}, "image": {...} }]
}
```

#### content-image-split-content
Imagen central con dos columnas de contenido a los lados.

```json
{
  "component": "content-image-split-content",
  "show_image": true,
  "image": { "filename": "https://..." },
  "left_column": [{ "component": "content-image-split-content-column", "title": "...", "content": "...", "items": [...] }],
  "right_column": [{ "component": "content-image-split-content-column", ... }]
}
```

### Social proof

#### testimonials
Slider de testimonios.

```json
{
  "component": "testimonials",
  "items": [{
    "component": "testimonial-item",
    "comment": "Texto del testimonio",
    "score": "5",
    "name": "Nombre",
    "job_title": "Cargo, Empresa",
    "provider": "trustpilot | capterra | product_hunt | getapp"
  }]
}
```

#### unique-testimonial
Testimonio destacado unico.

```json
{
  "component": "unique-testimonial",
  "title": "Texto largo del testimonio",
  "name": "Nombre",
  "job_title": "Cargo"
}
```

#### carousel
Slider de items con icono, titulo, subtitulo e imagen.

```json
{
  "component": "carousel",
  "items": [{ "component": "carousel-item", "icon": "1234", "title": "...", "subtitle": "...", "image": {...} }],
  "transition_duration": "500",
  "slide_duration": "5000"
}
```

### CTAs

#### call-to-action
CTA con titulo y botones de registro/demo.

```json
{
  "component": "call-to-action",
  "title": "Empieza gratis hoy",
  "show_signup": true,
  "show_demo": true,
  "signup_text": "Crear cuenta gratis"
}
```

#### call-to-action-image
CTA con imagen lateral.

```json
{
  "component": "call-to-action-image",
  "title": "Titulo CTA",
  "signup_text": "Empezar",
  "image": { "filename": "https://..." }
}
```

### Layouts especiales

#### bento-three / bento-four / bento-six
Layouts bento de 3, 4 o 6 items. Variantes masonry disponibles.

```json
{
  "component": "bento-four",
  "items": [
    { "component": "bento-item", "title": "...", "subtitle": {...}, "image": {...} },
    { "component": "bento-item", "title": "...", "subtitle": {...}, "image": {...} },
    { "component": "bento-item", "title": "...", "subtitle": {...}, "image": {...} },
    { "component": "bento-item", "title": "...", "subtitle": {...}, "image": {...} }
  ]
}
```

Variantes: `bento-three` (3 items), `bento-four` (4), `bento-four-mansonry` (4 masonry), `bento-six` (6), `bento-six-mansonry` (6 masonry).

### Otros componentes utiles

#### check-list
Lista con checks, titulo y contenido richtext.

```json
{
  "component": "check-list",
  "title": "Titulo",
  "content": { "type": "doc", "content": [...] }
}
```

#### box-alert
Alerta con color y contenido richtext.

```json
{
  "component": "box-alert",
  "color": "info | warning | error | success | brand | neutral",
  "content": { "type": "doc", "content": [...] }
}
```

#### expert-tip
Tip destacado con titulo, contenido y link opcional.

```json
{
  "component": "expert-tip",
  "title": "Titulo",
  "content": { "type": "doc", "content": [...] },
  "link": { "url": "https://...", "linktype": "url" },
  "link_text": "Saber mas"
}
```

#### image-banner
Banner con imagen, titulo, contenido y link.

```json
{
  "component": "image-banner",
  "image": { "filename": "https://..." },
  "title": "Titulo",
  "content": { "type": "doc", "content": [...] },
  "link": { "url": "https://...", "linktype": "url" },
  "link_text": "Ver mas"
}
```

#### PromoCard
Tarjeta promocional con imagen, titulo, subtitulo, CTA y colores custom.

```json
{
  "component": "PromoCard",
  "image": { "filename": "https://..." },
  "title": "Titulo",
  "subtitle": "Subtitulo",
  "cta_text": "Texto del boton",
  "button_color": "#00b3b0",
  "background_color": "#f5f5f5",
  "border_color": "#e0e0e0",
  "cta_link": { "url": "https://...", "linktype": "url" }
}
```

#### pricing-overview
Seccion de pricing con tier.

```json
{
  "component": "pricing-overview",
  "title": "Elige tu plan",
  "tier": "starter | business | premium"
}
```

#### card-slider
Slider de tarjetas con imagen, titulo, subtitulo y link.

```json
{
  "component": "card-slider",
  "items": [{
    "component": "card-item",
    "image": { "filename": "https://..." },
    "title": "Titulo",
    "subtitle": { "type": "doc", "content": [...] },
    "show_link": true,
    "link_title": "Ver mas",
    "link": { "url": "https://...", "linktype": "url" }
  }]
}
```

### Componentes basicos (inline en richtext o containers)

#### content-rich-text
Bloque de richtext libre.

#### content-text
Texto con control de tamano, alineacion, fuente, color y peso.

```json
{
  "component": "content-text",
  "text": "Texto",
  "align": "text-left | text-right | text-center",
  "size": "text-xs | text-sm | text-base | text-lg | text-xl | text-2xl | text-3xl | text-4xl",
  "font_family": "font-display | font-sans",
  "color": "text-neutral-950 | text-gray-200 | text-gray-400 | text-gray-600 | text-gray-800",
  "font_weight": "font-normal | font-semibold | font-bold"
}
```

#### content-button
Boton con link, color, variante y tamano.

```json
{
  "component": "content-button",
  "label": "Texto del boton",
  "link": { "url": "https://...", "linktype": "url" },
  "color": "primary | secondary | neutral | success | info | warning | error",
  "variant": "solid | outline | soft | subtle | ghost | link",
  "size": "xs | sm | md | lg | xl",
  "align": "justify-start | justify-center | justify-end"
}
```

#### content-link
Link simple con titulo y alineacion.

#### content-image
Imagen simple.

#### divider
Separador con tipo (none, line) y margen (my-1 a my-72).

#### content-table
Tabla con thead/tbody.

## Patrones de articulo (richtext + blok nodes)

Los articulos de blog, guias y glosario tienen un campo `content: richtext` directo (sin containers). El richtext mezcla nodos de texto (paragraph, heading, bullet_list, table) con nodos `blok` (componentes inline) intercalados.

No existe una anatomia obligatoria unica para blog. La estructura final depende del brief SEO/editorial y del articulo ya publicado si es un refresh.

### Anatomia de un blog article

Un articulo puede tener esta estructura base:

```
paragraph (intro)           ← hook + contexto
heading H2                  ← primera seccion
paragraphs + lists          ← desarrollo
heading H3                  ← subsecciones
paragraphs + lists
heading H2                  ← siguientes secciones
paragraphs + lists + tables
heading H2                  ← seccion puente a Easymailing (si aplica)
paragraphs
heading H2                  ← FAQs (si aplica)
```

Los bloques promocionales, formularios y FAQs no van por defecto: usalos solo si el brief lo pide.
No uses divisores visuales tipo `---` para separar bloques editoriales.

### Ejemplo real: "Los 12 Mejores Gestores de Correo" (80 nodos)

```
 0. P: intro (hook)
 1. P: (espacio)
 2. [BLOK] PromoCard           ← tras la intro, antes del primer H2
 3. H2: ¿Que es un gestor de correo?
    ... (paragraphs)
 5. H2: ¿Como elegir el mejor?
    ... (paragraphs + bullet_list)
10. H2: Gestores gratuitos
    ... (H3 por cada gestor + paragraphs)
21. [BLOK] call-to-action      ← a mitad del articulo, tras ~40% del contenido
22. H3: (sigue listado)
    ... (mas gestores)
68. H2: Comparativa rapida
69. table (13 rows)
71. H2: Gestores vs email marketing  ← seccion puente a Easymailing
    ... (paragraphs + bullet_list)
78. H2: Preguntas frecuentes
79. [BLOK] content-accordeon   ← ultimo nodo, contiene las FAQs
```

### Cuando usar cada componente inline

| Componente | Posicion tipica | Proposito |
|---|---|---|
| `PromoCard` | Tras la intro, solo si el brief lo pide | CRO: captar atencion temprana con CTA visual |
| `call-to-action` | A mitad del articulo, solo si el brief lo pide | CRO: conversion mid-article |
| `content-accordeon` (FAQs) | Ultimo nodo, solo si el brief lo pide | SEO: genera FAQ schema, resuelve queries long-tail |
| `expert-tip` | Dentro de secciones relevantes | Autoridad: destaca un consejo de experto |
| `box-alert` | Donde haya un aviso importante | UX: llama atencion sobre algo critico |
| `content-image` | Junto al contenido que ilustra | Visual: imagen contextual (no decorativa) |
| `embed-video` | Donde el video complementa el texto | Engagement: video tutorial o demo |
| `easymailing-form` | Final del articulo, solo si el brief lo pide | Lead gen: formulario de captacion inline |

### Blok nodes NO se generan desde markdown

El script `md2rt.ts` convierte markdown a nodos de texto (paragraphs, headings, lists, tables). Los blok nodes (PromoCard, call-to-action, content-accordeon, expert-tip, etc.) se insertan manualmente en el JSON resultante como nodos `blok` en las posiciones deseadas.

Flujo completo para un articulo nuevo:
1. Escribir el texto en markdown
2. Convertir con `md2rt.ts` → JSON richtext con nodos de texto
3. Decidir que componentes inline necesita (ver tabla arriba)
4. Insertar blok nodes en el array `content[]` del richtext en las posiciones correctas
5. Montar el story completo con campos del componente (title, images, metatags, etc.)

### Actualizar un articulo existente

`updateStory` de Storyblok **reemplaza `story.content` por completo**. Si envias solo el texto nuevo, pierdes todos los blok nodes, imagenes y campos que no incluyas.

Protocolo obligatorio al actualizar:

1. **Leer el story publicado**: `./skills/storyblok-content/scripts/cdn-get.sh <full_slug>`
2. **Identificar que preservar**: blok nodes (PromoCard, CTA, FAQs, expert-tip), campos de imagen (grid_image, detail_image), metatags (og_image, twitter_image)
3. **Construir el nuevo content**: partir del content existente como base, reemplazar solo lo que cambia
4. **Para el richtext**: extraer blok nodes del richtext existente, reemplazar nodos de texto con la nueva conversion md2rt, reinsertar los blok nodes en posiciones equivalentes
5. **Para imagenes**: si no hay imagen nueva, mantener la existente. Si hay nueva, subirla como asset y reemplazar
6. **Para metatags**: merge parcial — solo sobreescribir campos que tienen valor nuevo

```
# Pseudocodigo de merge
existing = cdn-get.sh(slug)  # story publicado completo
new_text = md2rt(markdown)   # solo nodos de texto

# Richtext: merge texto + blok nodes
existing_bloks = [n for n in existing.content.content if n.type == "blok"]
merged_richtext = new_text.content + existing_bloks  # simplificado
# En la practica: insertar blok nodes en posiciones relativas similares

# Content: merge campos
new_content = { ...existing.content }  # base = existente
new_content.content = merged_richtext
if new_title: new_content.title = new_title
if new_image: new_content.grid_image = upload(new_image)
# campos sin valor nuevo → se mantienen del existente
```

## Recetas de pagina

### Pagina de producto (content-static-page)
```
container(full-width, dark-gradient) -> hero-page
container(boxed, white) -> content-split-image (image_right)
container(boxed, light) -> content-split-image (image_left)
container(boxed, white) -> content-grid (3_columns, content-grid-item con iconos)
container(boxed, light) -> testimonials
container(full-width, dark-gradient) -> call-to-action
```

### Landing page (content-landing-page)
```
container(full-width, dark-gradient) -> hero-page (con registro)
container(boxed, white) -> bento-four
container(boxed, white) -> content-split-items
container(boxed, light) -> content-accordeon (faqs)
container(boxed, white) -> pricing-overview
container(full-width, dark-gradient) -> call-to-action
```

### Pagina de features (content-static-page)
```
container(full-width, dark-gradient) -> hero-video-page
container(boxed, white) -> section-header + content-grid (4_columns)
container(boxed, light) -> content-split-image (image_right)
container(boxed, white) -> content-split-image (image_left)
container(boxed, light) -> content-accordeon (faqs)
container(full-width, dark-gradient) -> call-to-action
```

## Metatags

Todos los content types root tienen campo `metatags`:

```json
{
  "metatags": {
    "component": "metatags",
    "title": "Titulo SEO (max 60 chars) | Easymailing",
    "description": "Descripcion SEO (max 155 chars)",
    "og_title": "Titulo para Open Graph"
  }
}
```

## Richtext format

Storyblok usa formato ProseMirror para richtext. Convencion de nombres en los tipos de nodo:

- **snake_case**: listas (`bullet_list`, `ordered_list`, `list_item`), bloques de codigo (`code_block`), separadores (`horizontal_rule`), saltos de linea (`hard_break`)
- **camelCase**: tablas (`tableRow`, `tableHeader`, `tableCell`)

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Texto normal" },
        { "type": "text", "text": "negrita", "marks": [{ "type": "bold" }] },
        { "type": "text", "text": "italica", "marks": [{ "type": "italic" }] },
        {
          "type": "text",
          "text": "link",
          "marks": [{ "type": "link", "attrs": { "href": "https://...", "target": "_blank" } }]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Titulo H2" }]
    },
    {
      "type": "bullet_list",
      "content": [
        {
          "type": "list_item",
          "content": [
            { "type": "paragraph", "content": [{ "type": "text", "text": "Item 1" }] }
          ]
        }
      ]
    },
    {
      "type": "ordered_list",
      "attrs": { "order": 1 },
      "content": [
        {
          "type": "list_item",
          "content": [
            { "type": "paragraph", "content": [{ "type": "text", "text": "Paso 1" }] }
          ]
        }
      ]
    },
    {
      "type": "blockquote",
      "content": [
        { "type": "paragraph", "content": [{ "type": "text", "text": "Cita" }] }
      ]
    },
    {
      "type": "horizontal_rule"
    },
    {
      "type": "table",
      "content": [
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableHeader",
              "attrs": { "colspan": 1, "rowspan": 1, "colwidth": null, "backgroundColor": null },
              "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Columna 1" }] }]
            },
            {
              "type": "tableHeader",
              "attrs": { "colspan": 1, "rowspan": 1, "colwidth": null, "backgroundColor": null },
              "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Columna 2" }] }]
            }
          ]
        },
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "attrs": { "colspan": 1, "rowspan": 1, "colwidth": null, "backgroundColor": null },
              "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Valor 1" }] }]
            },
            {
              "type": "tableCell",
              "attrs": { "colspan": 1, "rowspan": 1, "colwidth": null, "backgroundColor": null },
              "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Valor 2" }] }]
            }
          ]
        }
      ]
    },
    {
      "type": "blok",
      "attrs": {
        "id": "uuid",
        "body": [{ "component": "box-alert", "color": "info", "content": {...} }]
      }
    }
  ]
}
```

### Componentes inline en richtext (via `blok` node)

Estos componentes se pueden insertar como nodos `blok` dentro de cualquier campo richtext (ej: `content` de blog-article). Se renderizan inline entre parrafos, headings y listas.

| Componente | Campos clave | Uso |
|---|---|---|
| `box-alert` | color (info/warning/error/success/brand/neutral), content (richtext) | Aviso, warning, nota informativa |
| `expert-tip` | title, content (richtext), link, link_text | Consejo destacado de experto |
| `check-list` | title, content (richtext) | Lista con iconos de check |
| `content-image` | image (asset) | Imagen inline |
| `content-button` | label, link, color, variant, size, align | Boton con link |
| `content-table` | table (plugin), center | Tabla de datos |
| `embed-video` | url | Video embebido (YouTube, Vimeo) |
| `PromoCard` | image, title, subtitle, cta_text, cta_link, button_color, background_color, border_color | Tarjeta promocional con CTA |
| `easymailing-form` | — | Formulario de captacion Easymailing |

**No confundir** con componentes de container como `call-to-action`, `content-accordeon`, `image-banner`, `divider` — esos van dentro de `container.content[]`, no como blok nodes en richtext.
