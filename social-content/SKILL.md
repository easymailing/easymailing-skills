---
name: em-social-content
description: Genera posts para Twitter y LinkedIn desde el Inbox de capturas o ideas nuevas. Usa cuando el usuario dice "crear post", "publicar en redes", "social media", "tweet", "linkedin post", o quiere convertir material capturado en contenido para redes.
---

# Social Content

Genera posts bilingües (ES/EN) para Twitter y LinkedIn desde material capturado o ideas nuevas.

## Configuración

Lee `obsidian_vault_path` desde `.social-config.json` en la carpeta de esta skill:

```json
{
  "obsidian_vault_path": "/ruta/al/vault"
}
```

## Paso 1: Mostrar Inbox y menú

Al invocar la skill, lista los items pendientes del Inbox y muestra el menú:

```bash
# Leer items pendientes de:
# - {vault}/Inbox/ideas/
# - {vault}/Inbox/bookmarks/
# - {vault}/Inbox/trending/
```

Muestra:

```
📱 ¿Qué quieres publicar?

Inbox pendiente:
1. 📝 2026-02-01 - Marketing automation for AI (@tom_doerr)
2. 📝 2026-02-01 - Claude Agent SDK (@rryssf_)
3. 📝 2026-01-31 - Guía Mission Control (@pbteja1998)
...

0. ✨ Crear algo nuevo (pegar URL o escribir idea)

Escribe el número o pega directamente una URL/texto.
```

**Comportamiento:**
- Si elige **número > 0** → Usa ese item del Inbox
- Si elige **0** → Pregunta: "Pega la URL o escribe tu idea:"
- Si pega **URL directamente** → Investiga y genera posts
- Si escribe **texto** → Trata como idea y genera posts

## Paso 2: Leer material y contexto

### Si viene del Inbox

1. Lee el archivo seleccionado completo
2. Extrae: contenido original, resumen, notas, tags, source_url

### Si es nuevo

1. Investiga la URL o analiza la idea
2. Genera resumen y contexto

### Siempre

Lee el style-guide para contexto de marca:
```
{obsidian_vault_path}/Areas/Easymailing/Comunicacion/style-guide.md
```

## Paso 3: Generar posts

Genera 4 versiones con tonos diferenciados:

### Twitter (directo, casual)
- Máximo 280 caracteres por tweet
- Tono conversacional, directo
- Emojis ok (sin abusar)
- Hashtags relevantes (1-3 máximo)
- Si el contenido lo amerita, puede ser hilo (indicar con 1/N, 2/N...)

### LinkedIn (profesional)
- Extensión media (1000-1500 caracteres)
- Tono profesional pero cercano
- Orientado a valor y aprendizaje
- Sin hashtags excesivos (3-5 máximo al final)
- Incluir pregunta o CTA al final para engagement

## Paso 4: Mostrar preview

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

---
¿Ok o ajusto algo?
```

Iterar hasta que el usuario apruebe.

## Paso 5: Guardar

### Generar slug

Del título o tema principal, en minúsculas, sin acentos, guiones en vez de espacios.

### Guardar archivo

Ruta: `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/Social/{fecha}-{slug}.md`

Formato:

```markdown
---
type: social
created: YYYY-MM-DD
source: Inbox/bookmarks/2026-02-01-autor-id.md
status: draft
tags: [tag1, tag2]
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
```

- `source`: ruta relativa al item del Inbox usado (o `null` si fue idea nueva)
- `status`: siempre `draft` al crear

## Paso 6: Mover item usado

Si el contenido vino del Inbox, mover el archivo a `Processed/`:

```
Inbox/bookmarks/2026-02-01-autor-id.md
  → Processed/bookmarks/2026-02-01-autor-id.md
```

Crear la carpeta `Processed/{subcarpeta}/` si no existe.

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
└── Areas/Easymailing/Comunicacion/
    └── Social/
        ├── 2026-02-05-marketing-automation-ai.md
        └── ...
```

## Múltiples items

Si el usuario selecciona varios items (ej: "1,3,5"):

1. Preguntar: "¿Un post combinado o posts separados?"
2. Si combinado → Fusionar el contenido en un solo post/hilo
3. Si separados → Generar posts independientes para cada uno

## Tags disponibles

Heredar del item del Inbox o sugerir:
- `ia` - Inteligencia artificial
- `dev` - Desarrollo
- `saas` - SaaS, producto
- `easymailing` - Relacionado con Easymailing
- `productividad` - Flujos de trabajo
- `marketing` - Marketing, growth
