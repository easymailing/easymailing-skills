# Mejora del flujo de Bookmarks en capture-idea — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mejorar el flujo de bookmarks de em-capture-idea para que procese automáticamente, extraiga contenido de URLs enlazadas en tweets, y genere un digest consolidado al finalizar.

**Architecture:** Se modifica solo el Flujo B (Bookmarks) en `capture-idea/SKILL.md`. Tres cambios: eliminar paso de confirmación, añadir extracción de contenido enlazado, y añadir generación de digest. No se tocan otros flujos ni otros archivos de código.

**Tech Stack:** Markdown (SKILL.md es un archivo de instrucciones para Claude Code)

**Design doc:** `docs/plans/2026-03-04-capture-idea-bookmarks-improvement-design.md`

---

### Task 1: Eliminar paso de confirmación y simplificar flujo

**Files:**
- Modify: `capture-idea/SKILL.md:155-189` (Flujo B: Proceso pasos 1-5)

**Step 1: Reemplazar los pasos 1-5 del Proceso del Flujo B**

Reemplazar las líneas 155-189 (desde `### Proceso` hasta el final del paso 5) con este contenido:

```markdown
### Proceso

1. **Obtener bookmarks:**
   ```bash
   bird bookmarks -n {N} --json
   ```

2. **Filtrar ya exportados:**
   - Leer `source_url` de archivos existentes en `Inbox/bookmarks/`
   - Si no hay nuevos, mostrar `"✅ No hay bookmarks nuevos"` y terminar

3. **Mostrar progreso:**
   ```
   📚 Procesando {N} bookmarks nuevos...
   ```

4. **Para cada bookmark:**
   - Leer tweet completo con `bird read {url} --json`
   - Extraer fecha del tweet del campo `createdAt` (formato: "Wed Jan 21 13:47:22 +0000 2026" → 2026-01-21)
   - **Detectar URLs externas** en el contenido del tweet (ver paso 4b)
   - Investigar contexto (autor, tema, por qué es relevante)
   - Generar resumen en español + notas con análisis de Claude
   - Guardar en `Inbox/bookmarks/{fecha-del-tweet}-{username}-{id}.md`
   - Eliminar de Twitter: `bird unbookmark {url}`

4b. **Extraer contenido enlazado (si hay URLs externas):**
   - Detectar URLs en el texto del tweet
   - **Ignorar:** URLs de `x.com`, `twitter.com`, URLs de imágenes/videos embedidos
   - **Seguir:** Artículos de blog, noticias, documentación, GitHub repos, páginas de producto
   - Para cada URL externa válida:
     - Navegar con `WebFetch` y extraer contenido principal
     - Generar resumen del artículo (3-5 párrafos con puntos clave)
     - Añadir al archivo en sección `## Contenido enlazado`
     - Añadir campo `linked_url` en frontmatter

5. **Generar digest consolidado** (ver sección "Digest final")
```

**Step 2: Verificar que el paso de selección ya no existe**

Leer `capture-idea/SKILL.md` y confirmar que no queda el texto `¿Exportar todos, algunos` ni `Mostrar lista:`.

**Step 3: Commit**

```bash
git add capture-idea/SKILL.md
git commit -m "feat(capture-idea): remove confirmation step, add link extraction to bookmarks flow"
```

---

### Task 2: Actualizar formato del archivo bookmark

**Files:**
- Modify: `capture-idea/SKILL.md:191-218` (sección "Formato del archivo (bookmarks)")

**Step 1: Reemplazar el formato del archivo bookmark**

Reemplazar la sección completa `### Formato del archivo (bookmarks)` (líneas 191-218) con:

```markdown
### Formato del archivo (bookmarks)

```markdown
---
type: bookmark
status: pending
created: YYYY-MM-DD
tags: [tag1, tag2]
source_url: https://x.com/...
linked_url: https://articulo.com/...   # Solo si hay enlace externo
author: username
---

## Fuente

![](https://x.com/usuario/status/123)

## Contenido

{Texto original del tweet/artículo en su idioma}

## Contenido enlazado

{Resumen del artículo/recurso enlazado: 3-5 párrafos con los puntos clave}
{Omitir esta sección si el tweet no tiene enlaces externos}

## Resumen

{Resumen general en español integrando tweet + artículo enlazado si existe}

## Notas

{Análisis de Claude: por qué es relevante, conexiones con tus intereses, posibles usos}
```
```

**Step 2: Commit**

```bash
git add capture-idea/SKILL.md
git commit -m "feat(capture-idea): update bookmark file format with linked content section"
```

---

### Task 3: Añadir sección de Digest final

**Files:**
- Modify: `capture-idea/SKILL.md` (añadir nueva sección después del Flujo B, antes del Flujo C)

**Step 1: Añadir sección de Digest**

Insertar esta sección después del formato del archivo bookmark y antes de `## Flujo C: Trending / News`:

```markdown
### Digest final

Al terminar de procesar todos los bookmarks, generar un digest consolidado. Se muestra en consola Y se guarda en Obsidian.

**Salida en consola:**

```
✅ Procesados {N} bookmarks

📊 Resumen rápido:
┌─────────────────┬──────────────┬─────────────────────────┐
│ Tema            │ Autor        │ Punto clave             │
├─────────────────┼──────────────┼─────────────────────────┤
│ AI Agents       │ @levelsio   │ Agentes que facturan... │
│ Email marketing │ @dhh        │ La muerte del spam...   │
└─────────────────┴──────────────┴─────────────────────────┘

📝 Temas principales:
- {Tema} ({N} bookmarks): {descripción breve}
- ...

Guardado en: Inbox/bookmarks/YYYY-MM-DD-digest.md
```

**Archivo digest en Obsidian:**

Guardar en `Inbox/bookmarks/YYYY-MM-DD-digest.md`:

```markdown
---
type: digest
created: YYYY-MM-DD
bookmarks_count: N
---

## Tabla resumen

| Tema | Autor | Punto clave | Archivo |
|------|-------|-------------|---------|
| AI Agents | @levelsio | Agentes que facturan... | [[2026-03-04-levelsio-123]] |

## Temas principales

### {Tema} ({N} bookmarks)
{Resumen narrativo de los bookmarks relacionados con este tema}

### {Otro tema} ({N} bookmarks)
{Resumen narrativo}

## Conexiones y patrones

{Observaciones sobre conexiones entre los bookmarks procesados, tendencias emergentes}
```
```

**Step 2: Commit**

```bash
git add capture-idea/SKILL.md
git commit -m "feat(capture-idea): add digest generation to bookmarks flow"
```

---

### Task 4: Actualizar confirmación final para bookmarks

**Files:**
- Modify: `capture-idea/SKILL.md:296-307` (sección "Confirmación final")

**Step 1: Actualizar la confirmación final**

La sección `## Confirmación final` (líneas 296-307) debe actualizarse para indicar que el flujo de bookmarks usa el digest en lugar del resumen genérico:

Reemplazar con:

```markdown
## Confirmación final

Al terminar cualquier flujo (excepto Bookmarks, que usa el digest):

```
✅ Guardado en Inbox/{carpeta}/{archivo}.md

Tienes {N} items pendientes en tu Inbox:
- {X} ideas
- {Y} bookmarks
- {Z} trending
```

Para el flujo de Bookmarks, la confirmación es el propio digest (ver "Digest final" en Flujo B).
```

**Step 2: Commit**

```bash
git add capture-idea/SKILL.md
git commit -m "feat(capture-idea): update final confirmation to reference digest for bookmarks"
```

---

### Task 5: Actualizar documentación

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: Añadir entrada al CHANGELOG**

Añadir bajo `## [Unreleased]` → `### Changed`:

```markdown
- **`capture-idea`**: Mejora del flujo de bookmarks
  - Procesamiento automático sin confirmación (se exportan todos los nuevos)
  - Extracción de contenido enlazado: sigue URLs en tweets para resumir artículos
  - Digest consolidado: tabla resumen + temas principales, mostrado en consola y guardado en Obsidian
  - Nuevo formato de archivo bookmark con sección `## Contenido enlazado` y campo `linked_url`
```

**Step 2: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add capture-idea bookmarks improvement to changelog"
```

---

### Task 6: Verificación manual

**Step 1: Leer SKILL.md completo**

Leer `capture-idea/SKILL.md` de principio a fin y verificar:
- [ ] El Flujo B ya no tiene paso de selección/confirmación
- [ ] El paso 4b de extracción de contenido enlazado está claro
- [ ] El formato del archivo bookmark incluye `linked_url` y `## Contenido enlazado`
- [ ] La sección de Digest final está completa con formato consola + Obsidian
- [ ] La confirmación final menciona que bookmarks usa el digest
- [ ] Los flujos A y C no han sido modificados
- [ ] No hay inconsistencias ni referencias rotas

**Step 2: Verificar CHANGELOG**

Confirmar que la entrada en CHANGELOG refleja los tres cambios correctamente.
