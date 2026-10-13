# Substack Blog - Diseño

*Fecha: 2026-02-05*

## Resumen

Skill independiente para crear y publicar artículos de blog personal en Substack. Contenido técnico y reflexivo con tono conversacional.

## Ubicaciones

| Elemento | Ruta |
|----------|------|
| Repo local | `/Users/sergio/Dev/ai/skills/substack-blog` |
| GitHub | `github.com/easymailing/substack-blog` |
| Obsidian output | `Areas/Writing/{slug}/article.md` |
| Style guide | `Areas/Writing/style-guide.md` |
| Ideas (entrada) | `Inbox/` (ideas/, bookmarks/, trending/) |

## Estructura del Repo

```
substack-blog/
├── SKILL.md                      # Skill principal
├── scripts/
│   └── substack.ts               # CLI para crear drafts
├── .blog-config.json             # Config local (gitignored)
├── .env                          # Cookies Substack (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Flujo de la Skill

### 1. Entrada

Preguntar origen de la idea:

```
¿De dónde viene la idea?

1. Buscar en Inbox/ - Seleccionar idea guardada
2. Tema nuevo - Describir directamente
```

Si elige Inbox:
- Listar archivos en `Inbox/ideas/`, `Inbox/bookmarks/`, `Inbox/trending/`
- Usuario selecciona uno
- Leer contenido como contexto

### 2. Discusión Interactiva

Preguntas una a una:

1. "¿Qué quieres que el lector se lleve de este artículo?"
2. "¿Hay código o ejemplos concretos que mostrar?"
3. "¿Qué aprendiste tú en el proceso?"
4. "¿Hubo algún error, problema interesante o decisión difícil?"
5. "¿Algo más que quieras incluir?"

### 3. Generar Outline

Presentar estructura propuesta:

```markdown
## Outline propuesto

1. **Gancho** - [descripción]
2. **Contexto/Problema** - [descripción]
3. **Desarrollo** - [secciones]
4. **Lecciones/Reflexión** - [descripción]
5. **Cierre** - [descripción]

¿Ajustamos algo?
```

### 4. Escribir Artículo

- Leer `Areas/Writing/style-guide.md`
- Generar artículo completo en Markdown
- Incluir frontmatter:

```yaml
---
title: "Título del artículo"
date: 2026-02-05
tags: [tag1, tag2]
excerpt: "Resumen de 1-2 frases"
status: draft
---
```

### 5. Revisar (Opcional)

Preguntar: "¿Quieres que revise claridad y estilo?"

Si sí → Invocar `marketing-skills:copy-editing` con instrucciones:
- Revisar claridad de frases
- Eliminar redundancias
- NO añadir CTAs ni tono de venta
- Mantener voz personal

### 6. Guardar en Obsidian

```
Areas/Writing/{slug}/
├── article.md          # Artículo final
└── source-idea.md      # Copia de la idea original (si vino de Inbox)
```

Si vino de Inbox:
- Copiar idea original a `source-idea.md`
- Mover archivo original a `Processed/{subcarpeta}/`

### 7. Crear Draft en Substack

```bash
npx bun scripts/substack.ts create --title "Título" --file article.md
```

Mostrar confirmación con link al draft en Substack.

## Script substack.ts

### Comandos

```bash
# Crear draft desde archivo markdown
npx bun substack.ts create --title "Título" --file path/to/article.md

# Crear draft desde contenido directo
npx bun substack.ts create --title "Título" --subtitle "Subtítulo" --content "..."

# Listar drafts existentes
npx bun substack.ts drafts
```

### Autenticación

Cookies requeridas en `.env`:

```
SID=valor_cookie_sid
SUBSTACK_SID=valor_cookie_substack_sid
SUBSTACK_LLI=valor_cookie_substack_lli
```

Obtener de:
1. Login en Substack
2. DevTools (F12) → Application → Cookies → substack.com
3. Copiar valores de `sid`, `substack.sid`, `substack.lli`

### Endpoints de API (no oficial)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/drafts` | Listar drafts |
| GET | `/api/v1/drafts/{id}` | Obtener draft específico |
| POST | `/api/v1/drafts` | Crear nuevo draft |

### Conversión Markdown → Substack JSON

| Markdown | Substack JSON |
|----------|---------------|
| `# H1` | `{ type: "heading", attrs: { level: 1 } }` |
| `## H2` | `{ type: "heading", attrs: { level: 2 } }` |
| Párrafo | `{ type: "paragraph" }` |
| `**bold**` | `marks: [{ type: "strong" }]` |
| `*italic*` | `marks: [{ type: "em" }]` |
| `` `code` `` | `marks: [{ type: "code" }]` |
| `[text](url)` | `marks: [{ type: "link", attrs: { href } }]` |
| `- item` | `{ type: "bullet_list" }` |
| `1. item` | `{ type: "ordered_list" }` |
| ` ``` ` | `{ type: "code_block" }` |
| `---` | `{ type: "horizontal_rule" }` |
| `> quote` | `{ type: "blockquote" }` |

### Estructura JSON de Substack

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Título" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Texto normal " },
        { "type": "text", "text": "en negrita", "marks": [{ "type": "strong" }] }
      ]
    }
  ]
}
```

### Crear Draft - Proceso

1. GET `/api/v1/drafts` - Obtener draft existente como referencia
2. Copiar estructura del draft de referencia
3. Modificar: `draft_title`, `draft_subtitle`, `draft_body`
4. Fix importante: `draft_bylines[].id` = `user_id`
5. POST `/api/v1/drafts` - Crear nuevo draft

## Configuración

### .blog-config.json

```json
{
  "obsidian_vault_path": "/Users/sergio/Dev/knowledge",
  "substack_publication_url": "https://TUNOMBRE.substack.com",
  "user_id": "tu_user_id"
}
```

### Primera ejecución

La skill verifica configuración y pide:
1. Ruta del vault de Obsidian
2. URL de tu publicación Substack
3. Cookies de autenticación (con instrucciones)

## Style Guide Personal

Crear en `Areas/Writing/style-guide.md`:

### Voz y Tono

- **Perspectiva:** Primera persona ("descubrí", "decidí", "me funcionó")
- **Tono:** Conversacional, como hablar con un colega
- **Honestidad:** Admitir limitaciones ("esto no es perfecto", "hay casos donde no aplica")
- **Opiniones:** Claras y fundamentadas ("prefiero X porque...")

### Principios de Escritura

1. **Muestra el proceso, no solo el resultado**
   - Qué problema tenías
   - Qué intentaste
   - Qué falló y por qué
   - Qué funcionó finalmente

2. **Código con contexto**
   - No code dumps sin explicación
   - Explica el "por qué", no solo el "qué"
   - Muestra errores reales que cometiste

3. **Reflexiones genuinas**
   - Qué aprendiste
   - Qué harías diferente
   - Qué sigue sin estar claro

4. **Estructura clara pero no rígida**
   - Headers que guían la lectura
   - Párrafos cortos
   - Listas cuando ayudan, no por defecto

### Qué Evitar

- Tono de tutorial genérico ("en este post vamos a ver...")
- Exceso de disclaimers
- Falsa modestia
- Jerga innecesaria
- CTAs o tono de venta

### Estructura Típica

```
1. Gancho (problema o situación interesante)
2. Contexto (por qué importa, qué intentabas)
3. Desarrollo (el journey, con código si aplica)
4. Reflexión (qué aprendiste, qué cambiarías)
5. Cierre (opcional: próximos pasos, preguntas abiertas)
```

## Dependencias

### Para el script

```json
{
  "dependencies": {
    "marked": "^12.0.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "typescript": "^5.0.0"
  }
}
```

### Skills utilizadas

- `marketing-skills:copy-editing` - Revisión opcional de claridad

## Instalación

```bash
npx skills install https://github.com/easymailing/substack-blog.git -g
```

Instala la skill con nombre `substack-blog`.

## Archivos a Crear

1. **Repo substack-blog/**
   - SKILL.md
   - scripts/substack.ts
   - package.json
   - tsconfig.json
   - .gitignore
   - README.md

2. **En Obsidian**
   - Areas/Writing/style-guide.md

## Notas Técnicas

### Limitaciones de la API de Substack

- API no oficial, puede cambiar sin aviso
- Requiere al menos un draft existente como referencia
- Cookies expiran, hay que renovar periódicamente
- No soporta subida de imágenes vía API

### Decisiones de Diseño

- **Sin publicación automática:** El usuario publica manualmente desde Substack
- **Sin imágenes:** El usuario las añade manualmente en Substack
- **Markdown como fuente:** El artículo se escribe en Markdown y se convierte a JSON de Substack
