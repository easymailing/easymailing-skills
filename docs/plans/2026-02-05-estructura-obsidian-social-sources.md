# Reestructuración Obsidian + Nuevas fuentes Social Content

*Fecha: 2026-02-05*

## Resumen

1. Reestructurar carpetas de Obsidian en `Areas/Easymailing/Comunicacion/`
2. Añadir fuentes de contenido a `em-social-content` (Writing + Easymailing)
3. Actualizar rutas en todas las skills afectadas

---

## 1. Nueva estructura de Obsidian

### Antes

```
Areas/Easymailing/
├── Comunicacion/
│   ├── Releases/v1.14/
│   │   ├── blog.md
│   │   ├── newsletter.md
│   │   ├── master-brief.md
│   │   └── social/           ← legacy
│   ├── Newsletters/
│   ├── Integraciones/
│   │   └── {slug}/
│   │       ├── integration.md
│   │       └── social/       ← legacy
│   ├── Content/              ← vacía
│   └── Social/               ← vacía
└── Knowledge-Base/
```

### Después

```
Areas/Easymailing/
├── Comunicacion/
│   ├── Content/
│   │   ├── Blog/
│   │   │   └── {fecha}-{slug}/
│   │   │       ├── brief.md
│   │   │       └── article.md
│   │   │
│   │   ├── Newsletters/
│   │   │   └── {fecha}-{slug}/
│   │   │       ├── brief.md
│   │   │       ├── activos.md
│   │   │       ├── inactivos.md
│   │   │       └── newsletter.md
│   │   │
│   │   ├── Integraciones/
│   │   │   └── {slug}/
│   │   │       ├── brief.md
│   │   │       └── integration.md
│   │   │
│   │   └── Paginas-Producto/
│   │       └── {slug}/
│   │           ├── brief.md
│   │           └── page-spec.md
│   │
│   ├── Social/
│   │   └── {fecha}-{slug}.md
│   │
│   ├── style-guide.md
│   ├── product-marketing-context.md
│   └── flujo-contenido.md
│
└── Knowledge-Base/
    └── {fecha}-{slug}/
        ├── brief.md
        ├── article-es.md
        └── article-en.md
```

### Convenciones

| Campo | Formato | Ejemplo |
|-------|---------|---------|
| `{fecha}` | `YYYY-MM-DD` | `2026-02-03` |
| `{slug}` | minúsculas, guiones, sin acentos | `maia-copilot` |

### Frontmatter de article.md (Blog)

```yaml
---
type: release | tutorial | comparativa | feature-spotlight | tips | tendencia | estacional
title: "Título del artículo"
created: 2026-02-03
status: draft | published
tags: [maia, ia, release]
---
```

---

## 2. Cambios en em-social-content

### Nuevo menú de dos niveles

**Paso 1: Elegir fuente**

```
📱 ¿De dónde viene el contenido?

1. 📥 Inbox - Ideas y bookmarks pendientes
2. ✍️  Writing - Artículos de blog personal (Substack)
3. 📦 Easymailing - Contenido de producto

0. ✨ Nuevo - Pegar URL o escribir idea
```

**Paso 1.1: Si elige Inbox (opción 1)**

Lista items de:
- `Inbox/ideas/`
- `Inbox/bookmarks/`
- `Inbox/trending/`

**Paso 1.2: Si elige Writing (opción 2)**

Lista artículos de:
- `Areas/Writing/*/article.md`

Mostrar:
```
✍️  Artículos de blog personal:

1. 📝 2026-02-05 - Mi sistema de contenido con Claude skills
2. 📝 2026-01-28 - Cómo uso Obsidian para todo

Escribe el número.
```

**Paso 1.3: Si elige Easymailing (opción 3)**

Submenú por tipo:

```
📦 ¿Qué tipo de contenido?

1. 📝 Blog - Artículos del blog de Easymailing
2. 📧 Newsletter - Emails enviados a usuarios
3. 🔌 Integración - Páginas de integración
4. 📄 Página producto - Funcionalidades y soluciones
```

Luego lista items del tipo elegido:
- Blog: `Content/Blog/*/article.md`
- Newsletters: `Content/Newsletters/*/*.md`
- Integraciones: `Content/Integraciones/*/integration.md`
- Páginas: `Content/Paginas-Producto/*/page-spec.md`

### Rutas actualizadas

| Fuente | Ruta |
|--------|------|
| Inbox | `{vault}/Inbox/{ideas,bookmarks,trending}/` |
| Writing | `{vault}/Areas/Writing/*/article.md` |
| Blog EM | `{vault}/Areas/Easymailing/Comunicacion/Content/Blog/*/article.md` |
| Newsletters | `{vault}/Areas/Easymailing/Comunicacion/Content/Newsletters/*/*.md` |
| Integraciones | `{vault}/Areas/Easymailing/Comunicacion/Content/Integraciones/*/integration.md` |
| Páginas | `{vault}/Areas/Easymailing/Comunicacion/Content/Paginas-Producto/*/page-spec.md` |
| Output Social | `{vault}/Areas/Easymailing/Comunicacion/Social/` |

### Style guide según fuente

| Fuente | Style guide |
|--------|-------------|
| Inbox | Depende del destino (preguntar) |
| Writing | `Areas/Writing/style-guide.md` |
| Easymailing | `Areas/Easymailing/Comunicacion/style-guide.md` |

---

## 3. Cambios en otras skills

### em-marketing-content

Rutas antiguas → nuevas:

| Tipo | Antes | Después |
|------|-------|---------|
| Blog | `Comunicacion/Blog/{slug}/` | `Comunicacion/Content/Blog/{fecha}-{slug}/` |
| Integraciones | `Comunicacion/Integraciones/{slug}/` | `Comunicacion/Content/Integraciones/{slug}/` |
| Páginas | `Comunicacion/Paginas-Producto/{slug}/` | `Comunicacion/Content/Paginas-Producto/{slug}/` |

Archivos:
- `master-brief.md` → `brief.md`
- `article.md` (sin cambio)
- `integration.md` (sin cambio)
- `page-spec.md` (sin cambio)

Añadir brief.md a Integraciones y Páginas (actualmente no lo generan).

### em-newsletter

Rutas antiguas → nuevas:

| Antes | Después |
|-------|---------|
| `Comunicacion/Newsletters/{fecha}-{slug}/` | `Comunicacion/Content/Newsletters/{fecha}-{slug}/` |

Añadir generación de `brief.md` con:
- Tipo de comunicación
- Audiencias seleccionadas
- Puntos clave a comunicar

### em-kb-article

Sin cambios en estructura (Knowledge-Base se mantiene fuera de Content/).

Verificar si genera brief.md, si no, añadirlo.

---

## 4. Migración de archivos existentes

### Releases → Blog + Newsletters

```bash
# v1.14
Releases/v1.14/blog.md → Content/Blog/2026-02-03-maia-copilot/article.md
Releases/v1.14/master-brief.md → Content/Blog/2026-02-03-maia-copilot/brief.md
Releases/v1.14/newsletter.md → Content/Newsletters/2026-02-03-maia-copilot/newsletter.md
Releases/v1.14/social/* → Social/ (renombrar archivos)
```

### Integraciones (mover y limpiar social/)

```bash
Integraciones/cursor/ → Content/Integraciones/cursor/
Integraciones/cursor/social/* → Social/2026-02-04-cursor-{platform}.md
# Eliminar carpeta social/ vacía

Integraciones/claude/ → Content/Integraciones/claude/
Integraciones/claude/social/* → Social/2026-02-04-claude-{platform}.md

Integraciones/codex/ → Content/Integraciones/codex/
Integraciones/codex/social/* → Social/2026-02-04-codex-{platform}.md
```

### Newsletters

```bash
Newsletters/2026-02-04-integraciones-ia/ → Content/Newsletters/2026-02-04-integraciones-ia/
```

### Limpiar carpetas vacías

```bash
rm -rf Comunicacion/Releases/
rm -rf Comunicacion/Integraciones/
rm -rf Comunicacion/Newsletters/
rm -rf Comunicacion/Content/  # la vacía original
```

---

## 5. Checklist de implementación

### Obsidian (manual o script)
- [ ] Crear estructura Content/
- [ ] Migrar Releases → Blog + Newsletters
- [ ] Migrar Integraciones → Content/Integraciones/
- [ ] Migrar Newsletters → Content/Newsletters/
- [ ] Mover archivos social/ legacy → Social/
- [ ] Eliminar carpetas vacías

### Skills
- [ ] Actualizar em-social-content (nuevas fuentes + rutas)
- [ ] Actualizar em-marketing-content (rutas + brief para todos)
- [ ] Actualizar em-newsletter (rutas + brief)
- [ ] Verificar em-kb-article (brief si no tiene)
- [ ] Actualizar READMEs si existen

### Documentación
- [ ] Actualizar flujo-contenido.md en Obsidian
- [ ] Actualizar CLAUDE.md del repo si aplica
