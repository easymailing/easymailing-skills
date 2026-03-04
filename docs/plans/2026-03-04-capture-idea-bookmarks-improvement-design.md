# Mejora del flujo de Bookmarks en capture-idea

**Fecha:** 2026-03-04
**Skill:** em-capture-idea
**Enfoque:** Incremental — solo flujo de Bookmarks (Flujo B)

## Resumen

Tres mejoras al flujo de bookmarks de Twitter:

1. Procesamiento automático sin confirmación
2. Extracción de contenido de URLs enlazadas en tweets
3. Digest consolidado al finalizar

## 1. Procesamiento automático

**Antes:** Se muestra lista de bookmarks y se pregunta cuáles exportar.
**Después:** Se procesan todos los bookmarks nuevos automáticamente.

Flujo simplificado:
1. Obtener bookmarks con `bird bookmarks -n {N} --json`
2. Filtrar ya exportados (comparar `source_url` con archivos existentes)
3. Mostrar progreso: `"📚 Procesando {N} bookmarks nuevos..."`
4. Procesar cada uno con extracción mejorada
5. Generar y mostrar digest final

Se mantiene `capture-idea bookmarks 20` para controlar cantidad. Default: 10.

## 2. Extracción de contenido enlazado

Después de leer un tweet con `bird read`, se detectan URLs en el contenido. Si hay enlaces externos (no tweets ni imágenes):

1. Navegar a la URL con `WebFetch`
2. Extraer contenido principal
3. Generar resumen del artículo (3-5 párrafos)
4. Añadir al archivo en sección `## Contenido enlazado`

### URLs que se siguen
- Artículos de blog, noticias, documentación
- GitHub repos (README)
- Páginas de producto

### URLs que se ignoran
- Otros tweets (x.com, twitter.com)
- Imágenes/videos embedidos

### Formato actualizado del archivo bookmark

```markdown
---
type: bookmark
status: pending
created: YYYY-MM-DD
tags: [tag1, tag2]
source_url: https://x.com/...
linked_url: https://articulo.com/...   # NUEVO (si hay enlace externo)
author: username
---

## Fuente

![](https://x.com/usuario/status/123)

## Contenido

{Texto original del tweet}

## Contenido enlazado

{Resumen del artículo/recurso enlazado: 3-5 párrafos con los puntos clave}

## Resumen

{Resumen general en español integrando tweet + artículo enlazado}

## Notas

{Análisis de Claude: relevancia, conexiones, posibles usos}
```

Si el tweet no tiene enlaces externos, se omite la sección `## Contenido enlazado` y el campo `linked_url`.

## 3. Digest consolidado

Al terminar de procesar todos los bookmarks, se genera un digest que se muestra en consola Y se guarda en Obsidian.

### Salida en consola

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

### Archivo digest en Obsidian

Ubicación: `Inbox/bookmarks/YYYY-MM-DD-digest.md`

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
{Resumen narrativo de los bookmarks relacionados}

## Conexiones y patrones

{Observaciones sobre conexiones entre bookmarks, tendencias emergentes}
```

## Cambios en SKILL.md

Solo se modifica el **Flujo B: Bookmarks de Twitter**:

- **Paso 2:** Eliminar pregunta de selección
- **Paso 3 (nuevo):** Para cada bookmark, detectar y seguir URLs externas
- **Paso 4 (nuevo):** Generar digest consolidado
- **Formato archivo:** Añadir sección `## Contenido enlazado` y campo `linked_url`
- **Confirmación final:** Reemplazar el resumen simple por el digest

Los flujos A (Captura individual), C (Trending/News) y la estructura general no se tocan.
