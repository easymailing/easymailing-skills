---
name: em-social-content
description: Genera posts para redes sociales (Twitter, LinkedIn, Facebook) y comunicación interna (Slack). Usa cuando el usuario dice "crear post", "publicar en redes", "social media", "tweet", "linkedin post", "teaser", "slack", o quiere convertir material en contenido para distribución.
---

# Social Content

Genera posts bilingües (ES/EN) para redes sociales y comunicación interna.

## Configuración

Lee `obsidian_vault_path` desde `.social-config.json` en la carpeta de esta skill:

```json
{
  "obsidian_vault_path": "/ruta/al/vault"
}
```

## Paso 1: Elegir fuente de contenido

Al invocar la skill, muestra el menú de fuentes:

```
📱 ¿De dónde viene el contenido?

1. 📥 Inbox - Ideas y bookmarks pendientes
2. ✍️  Writing - Artículos de blog personal (Substack)
3. 📦 Easymailing - Contenido de producto

0. ✨ Nuevo - Pegar URL o escribir idea
```

**Comportamiento:**
- Si elige **1** → Paso 1.1 (Inbox)
- Si elige **2** → Paso 1.2 (Writing)
- Si elige **3** → Paso 1.3 (Easymailing)
- Si elige **0** → Pregunta: "Pega la URL o escribe tu idea:"
- Si pega **URL directamente** → Investiga y genera posts
- Si escribe **texto** → Trata como idea y genera posts

### Paso 1.1: Inbox

Lista items pendientes de:
- `{vault}/Inbox/ideas/`
- `{vault}/Inbox/bookmarks/`
- `{vault}/Inbox/trending/`

```
📥 Inbox pendiente:

1. 📝 2026-02-01 - Marketing automation for AI (@tom_doerr)
2. 📝 2026-02-01 - Claude Agent SDK (@rryssf_)
3. 📝 2026-01-31 - Guía Mission Control (@pbteja1998)
...

Escribe el número.
```

### Paso 1.2: Writing (blog personal)

Lista artículos de `{vault}/Areas/Writing/*/article.md`:

```
✍️  Artículos de blog personal:

1. 📝 2026-02-05 - Mi sistema de contenido con Claude skills
2. 📝 2026-01-28 - Cómo uso Obsidian para todo
...

Escribe el número.
```

### Paso 1.3: Easymailing

Submenú por tipo:

```
📦 ¿Qué tipo de contenido?

1. 📝 Blog - Artículos del blog de Easymailing
2. 📧 Newsletter - Emails enviados a usuarios
3. 🔌 Integración - Páginas de integración
4. 📄 Página producto - Funcionalidades y soluciones
```

Luego lista items del tipo elegido:

| Tipo | Ruta |
|------|------|
| Blog | `{vault}/Areas/Easymailing/Comunicacion/Content/Blog/*/article.md` |
| Newsletter | `{vault}/Areas/Easymailing/Comunicacion/Content/Newsletters/*/*.md` |
| Integración | `{vault}/Areas/Easymailing/Comunicacion/Content/Integraciones/*/integration.md` |
| Página | `{vault}/Areas/Easymailing/Comunicacion/Content/Paginas-Producto/*/page-spec.md` |

## Paso 2: Leer material y contexto

### Si viene del Inbox

1. Lee el archivo seleccionado completo
2. Extrae: contenido original, resumen, notas, tags, source_url

### Si viene de Writing

1. Lee el artículo completo
2. Extrae: título, excerpt, contenido, tags

### Si viene de Easymailing

1. Lee el archivo seleccionado completo
2. Si existe brief.md en la misma carpeta, léelo también para contexto

### Si es nuevo

1. Investiga la URL o analiza la idea
2. Genera resumen y contexto

### Style guide según fuente

| Fuente | Style guide |
|--------|-------------|
| Inbox (depende del destino) | Preguntar si es para Easymailing o personal |
| Writing | `{vault}/Areas/Writing/style-guide.md` |
| Easymailing | `{vault}/Areas/Easymailing/Comunicacion/style-guide.md` |

## Paso 2.5: Elegir plataformas

```
¿Dónde quieres publicar?

[ ] 🐦 Twitter - Posts o hilo
[ ] 💼 LinkedIn - Post profesional
[ ] 📘 Facebook - Post intermedio
[ ] 🎯 Teasers - Adelantos cortos (para cualquier red)
[ ] 📢 Slack - Resumen interno para el equipo
```

Por defecto, selecciona Twitter + LinkedIn si el usuario no especifica.

## Paso 2.6: Tipo de post para Twitter (si seleccionado)

Si el usuario eligió Twitter, preguntar:

```
¿Qué tipo de post para Twitter?

1. 📝 Post original - Tu contenido propio
2. 💬 Quote tweet - Citar el tweet original y añadir tu comentario
3. 🧵 Hilo - Varios tweets conectados (para temas que requieren más desarrollo)
4. 💡 Inspirado en - Usar la idea sin citar directamente
```

**Comportamiento según tipo:**

### Post original
- Contenido 100% tuyo basado en la idea/material
- No menciona ni cita la fuente original
- Máximo 280 caracteres

### Quote tweet
- Incluye el enlace al tweet original para citarlo
- Tu comentario debe aportar valor (no solo "Esto es genial")
- Formato: `{tu comentario}\n\n{url del tweet original}`
- El comentario debe ser < 200 chars para dejar espacio al quote

### Hilo
- 3-7 tweets conectados
- Primer tweet debe funcionar solo (gancho)
- Numeración: 1/N, 2/N...
- Último tweet con CTA o conclusión
- Cada tweet < 280 chars

### Inspirado en
- Tomas la idea pero la haces tuya
- No citas ni mencionas al autor original
- Puedes adaptar el ángulo a tu audiencia
- Útil cuando la fuente es en inglés y quieres crear contenido propio en español

## Paso 3: Generar posts

Genera solo para las plataformas seleccionadas:

### Twitter (directo, casual)
- Tono conversacional, directo
- Emojis ok (sin abusar)
- Hashtags relevantes (1-3 máximo)
- Formato según tipo elegido en paso 2.6

### LinkedIn (profesional)
- Extensión media (1000-1500 caracteres)
- Tono profesional pero cercano
- Orientado a valor y aprendizaje
- Sin hashtags excesivos (3-5 máximo al final)
- Incluir pregunta o CTA al final para engagement

### Facebook (intermedio)
- Extensión media (500-800 caracteres)
- Tono amigable, cercano
- Más visual, mencionar imagen/video si aplica
- Emojis permitidos
- CTA claro al final

### Teasers (adelantos)
- Ultra cortos (100-150 caracteres)
- Generan curiosidad sin revelar todo
- Funcionan en cualquier red
- Formato: gancho + "Pronto más..." o similar

### Slack (interno)
- Resumen ejecutivo para el equipo
- Tono directo, sin marketing
- Bullet points con lo esencial
- Links a recursos si aplica
- NO requiere versión bilingüe (solo español)

## Paso 4: Mostrar preview

Muestra solo las plataformas seleccionadas:

```
📱 Posts generados:

## Twitter

### ES
{post en español}

### EN
{post in English}

## LinkedIn

### ES
{post en español}

### EN
{post in English}

## Facebook (si seleccionado)

### ES
{post en español}

### EN
{post in English}

## Teasers (si seleccionado)

### ES
{teaser en español}

### EN
{teaser in English}

## Slack (si seleccionado)

{resumen interno - solo español}

---
¿Ok o ajusto algo?
```

Iterar hasta que el usuario apruebe.

## Paso 5: Guardar

### Generar slug

Del título o tema principal, en minúsculas, sin acentos, guiones en vez de espacios.

### Guardar archivo

Ruta: `{vault}/Areas/Easymailing/Comunicacion/Social/{fecha}-{slug}.md`

Formato:

```markdown
---
type: social
created: YYYY-MM-DD
source: Areas/Writing/mi-sistema-contenido/article.md
source_type: inbox | writing | easymailing | new
status: draft
tags: [tag1, tag2]
platforms: [twitter, linkedin, facebook, teasers, slack]
twitter_type: original | quote | thread | inspired
---

## Twitter

### ES
{post en español}

### EN
{post in English}

## LinkedIn

### ES
{post en español}

### EN
{post in English}

## Facebook

### ES
{post en español}

### EN
{post in English}

## Teasers

### ES
{teaser en español}

### EN
{teaser in English}

## Slack

{resumen interno}
```

- `source`: ruta relativa al contenido usado
- `source_type`: tipo de fuente (inbox, writing, easymailing, new)
- `status`: siempre `draft` al crear
- `platforms`: lista de plataformas incluidas
- Solo incluir las secciones de plataformas seleccionadas

## Paso 6: Mover item usado (solo Inbox)

Si el contenido vino del Inbox, mover el archivo a `Processed/`:

```
Inbox/bookmarks/2026-02-01-autor-id.md
  → Processed/bookmarks/2026-02-01-autor-id.md
```

Crear la carpeta `Processed/{subcarpeta}/` si no existe.

**Nota:** Los items de Writing y Easymailing NO se mueven, son contenido permanente.

## Paso 7: Confirmación final

```
✅ Guardado en Areas/Easymailing/Comunicacion/Social/{fecha}-{slug}.md

📊 Estado del Inbox:
- {X} ideas pendientes
- {Y} bookmarks pendientes
- {Z} trending pendientes
```

## Estructura de carpetas

```
Obsidian vault/
├── Inbox/
│   ├── ideas/
│   ├── bookmarks/
│   └── trending/
├── Processed/
│   ├── ideas/
│   ├── bookmarks/
│   └── trending/
├── Areas/
│   ├── Writing/
│   │   ├── {slug}/
│   │   │   └── article.md
│   │   └── style-guide.md
│   └── Easymailing/
│       └── Comunicacion/
│           ├── Content/
│           │   ├── Blog/{fecha}-{slug}/
│           │   ├── Newsletters/{fecha}-{slug}/
│           │   ├── Integraciones/{slug}/
│           │   └── Paginas-Producto/{slug}/
│           ├── Social/
│           │   └── {fecha}-{slug}.md
│           └── style-guide.md
```

## Múltiples items

Si el usuario selecciona varios items (ej: "1,3,5"):

1. Preguntar: "¿Un post combinado o posts separados?"
2. Si combinado → Fusionar el contenido en un solo post/hilo
3. Si separados → Generar posts independientes para cada uno

## Tags disponibles

Heredar del contenido fuente o sugerir:
- `ia` - Inteligencia artificial
- `dev` - Desarrollo
- `saas` - SaaS, producto
- `easymailing` - Relacionado con Easymailing
- `productividad` - Flujos de trabajo
- `marketing` - Marketing, growth
