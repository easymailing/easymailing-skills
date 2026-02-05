---
name: em-capture-idea
description: Captura material para contenido desde URLs, texto libre, bookmarks de Twitter o trending. Solo investiga y guarda en Obsidian Inbox. No genera contenido final.
---

# Capture Idea

Captura y organiza material para crear contenido después. Claude investiga y guarda, no genera posts.

## Paso 1: Mostrar menú

Al invocar la skill, SIEMPRE muestra este menú primero:

```
📥 ¿Qué quieres capturar?

1. 🔗 URL - Capturar un tweet, video o artículo
2. 💡 Idea - Escribir una idea propia
3. 🔖 Bookmarks - Exportar tus bookmarks de Twitter
4. 🔥 Trending - Ver qué es tendencia y elegir qué guardar
5. 📰 News - Ver noticias de actualidad y elegir

Escribe el número o pega directamente una URL.
```

Si el usuario:
- Escribe **1** → Pregunta: "Pega la URL:"
- Escribe **2** → Pregunta: "Escribe tu idea:"
- Escribe **3** → Ejecuta flujo de bookmarks
- Escribe **4** → Ejecuta flujo de trending
- Escribe **5** → Ejecuta flujo de news
- Pega una **URL** directamente → Ejecuta captura individual

## Invocación directa (opcional)

También se puede invocar directamente con argumentos:

```bash
capture-idea "https://x.com/usuario/status/123"   # Captura URL
capture-idea idea "Mi idea sobre X"               # Captura idea directa
capture-idea bookmarks                            # Exportar bookmarks
capture-idea bookmarks 20                         # Exportar últimos 20
capture-idea trending                             # Ver trending
capture-idea news                                 # Ver news
```

## Configuración

### Archivo de configuración

Verifica que existe `.capture-config.json` en la carpeta de esta skill:

```json
{
  "obsidian_vault_path": "/Users/sergio/Dev/knowledge"
}
```

### Requisitos

Bird CLI instalado y autenticado:
```bash
brew install steipete/tap/bird
```

## Estructura en Obsidian

```
Inbox/
├── ideas/              ← Capturas manuales (URLs, texto)
├── bookmarks/          ← Bookmarks exportados de Twitter
└── trending/           ← Items de trending/news
```

---

## Flujo A: Captura individual

### Entrada

```bash
capture-idea "url o texto"
```

### Proceso

1. **Detectar tipo:**
   - `x.com` o `twitter.com` → tweet
   - `youtube.com` o `youtu.be` → video
   - Otra URL → link
   - Sin URL → idea

2. **Investigar:**
   - Tweet: obtener contenido, autor, contexto (hilo si existe)
   - Video: título, descripción, canal
   - Link: título, extracto, puntos clave
   - Idea: analizar tema

3. **Mostrar resumen para validar:**
   ```
   📝 {tipo}: {título corto}

   {resumen 2-3 frases}

   Tags: #{tag1} #{tag2}

   ¿Ok o ajusto?
   ```

4. **Guardar** en `Inbox/ideas/YYYY-MM-DD-{type}-{slug}.md`

### Formato del archivo

```markdown
---
type: tweet | video | link | idea
status: pending
created: YYYY-MM-DD
tags: [tag1, tag2]
source_url: https://...
---

## Fuente

![](https://x.com/...) | ![](https://youtube.com/...) | <iframe>...</iframe>

## Resumen

{Lo que Claude investigó}

## Notas

{Vacío, para añadir después}
```

### Embeds

- **Tweet:** `![](https://x.com/usuario/status/123)`
- **YouTube:** `![](https://youtube.com/watch?v=xxx)`
- **Link:** `<iframe src="{url}" width="100%" height="400"></iframe>`
- **Idea:** Sin embed

---

## Flujo B: Bookmarks de Twitter

### Entrada

```bash
capture-idea bookmarks      # Últimos 10
capture-idea bookmarks 20   # Últimos 20
```

### Proceso

1. **Obtener bookmarks:**
   ```bash
   bird bookmarks -n {N} --json
   ```

2. **Filtrar ya exportados:**
   - Leer `source_url` de archivos existentes en `Inbox/bookmarks/`
   - Mostrar solo los nuevos

3. **Mostrar lista:**
   ```
   📚 {N} bookmarks nuevos:

   1. @user1: "Texto truncado del tweet..."
   2. @user2: "Otro tweet..."

   ¿Exportar todos, algunos (1,3,5), o cancelar?
   ```

4. **Para cada seleccionado:**
   - Leer tweet completo con `bird read {url} --json`
   - Extraer fecha del tweet del campo `createdAt` (formato: "Wed Jan 21 13:47:22 +0000 2026" → 2026-01-21)
   - Investigar contexto (autor, tema, por qué es relevante)
   - Generar resumen en español + notas con análisis de Claude
   - Guardar en `Inbox/bookmarks/{fecha-del-tweet}-{username}-{id}.md`
   - Eliminar de Twitter: `bird unbookmark {url}`

5. **Resumen:**
   ```
   ✅ Exportados {N} bookmarks

   - 2024-02-05-levelsio-123456.md
   - 2024-02-05-naval-789012.md
   ```

### Formato del archivo (bookmarks)

```markdown
---
type: bookmark
status: pending
created: YYYY-MM-DD
tags: [tag1, tag2]
source_url: https://x.com/...
author: username
---

## Fuente

![](https://x.com/usuario/status/123)

## Contenido

{Texto original del tweet/artículo en su idioma}

## Resumen

{Resumen en español de qué trata: 2-4 frases explicando el contenido de forma clara}

## Notas

{Análisis de Claude: por qué es relevante, conexiones con tus intereses, posibles usos}
```

---

## Flujo C: Trending / News

### Entrada

```bash
capture-idea trending
capture-idea news
```

### Proceso

1. **Obtener trending o news:**
   ```bash
   bird trending -n 15 --json          # Para trending
   bird news -n 15 --ai-only --json    # Para news
   ```

2. **Mostrar lista:**
   ```
   🔥 Trending ahora:

   1. AI Agents - 45K tweets
   2. Claude 4 - 32K tweets
   3. ...

   ¿Cuáles te interesan? (1,3,5 o "cancelar")
   ```

3. **Para cada seleccionado:**
   - Investigar: buscar tweets relevantes, contexto
   - Mostrar resumen para validar
   - Guardar en `Inbox/trending/YYYY-MM-DD-{slug}.md`

### Formato del archivo (trending)

```markdown
---
type: trending
status: pending
created: YYYY-MM-DD
tags: []
topic: "AI Agents"
---

## Tema

{Descripción del trending}

## Contexto

{Lo que Claude investigó: por qué es trending, puntos de vista, etc.}

## Tweets relevantes

![](https://x.com/tweet1)
![](https://x.com/tweet2)

## Notas

```

---

## Tags disponibles

- `ia` - Inteligencia artificial, Claude, LLMs
- `dev` - Desarrollo, código, herramientas
- `saas` - SaaS, producto, emprendimiento
- `easymailing` - Relacionado con Easymailing
- `productividad` - Flujos de trabajo, automatización
- `marketing` - Marketing, contenido, growth

---

## Confirmación final

Al terminar cualquier flujo:

```
✅ Guardado en Inbox/{carpeta}/{archivo}.md

Tienes {N} items pendientes en tu Inbox:
- {X} ideas
- {Y} bookmarks
- {Z} trending
```
