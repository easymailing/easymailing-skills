# Changelog

Todos los cambios notables en este repositorio.

## [Unreleased]

### Added
- Carpeta centralizada `docs/plans/` para documentos de diseño

### Changed
- **`marketing-content` v2**: Rediseño completo de la estructura
  - Menú simplificado a 4 tipos: Blog, Integración, Página de producto, Newsletter
  - Blog ahora es contenido principal que va a Storyblok (`content-blog-article`)
  - Newsletter es tipo independiente que agrupa contenidos existentes
  - Distribución en redes (Twitter, LinkedIn, Facebook, Teasers, Slack) opcional para todo contenido web
  - Los "motivos" de blog (release, tutorial, comparativa...) son submenú dentro de Blog
  - Script `storyblok.ts` para crear borradores en Storyblok
  - Nueva estructura en Obsidian: `Blog/`, `Integraciones/`, `Paginas-Producto/`, `Newsletters/`
- Movidos documentos de diseño de `{skill}/docs/design.md` a `docs/plans/YYYY-MM-DD-{topic}-design.md`

## [1.0.0] - 2026-02-04

### Added
- Skill `kb-article`: crea artículos de base de conocimiento para Zendesk
  - Flujo de 6 fases: contexto → investigación → preguntas → estructura → generación → publicación
  - Consulta código de Easymailing para entender funcionalidades
  - Navegación de la app con Chrome cuando es necesario
  - Integración con API de Zendesk (lectura + creación de borradores)
  - Generación bilingüe (español primero, luego inglés)
  - Componentes HTML estilizados (alertas, pasos, tablas, etc.)
  - Placeholders descriptivos para imágenes
  - Almacenamiento en Obsidian (`Areas/Easymailing/Knowledge-Base/`)
- Skill `marketing-content`: genera contenido de comunicación y marketing
  - 7 tipos de contenido: releases, feature spotlight, tutoriales, comparativas, tendencias, tips, estacional
  - Flujo de entrada específico por tipo de contenido
  - Flujo de 4 fases: análisis → discusión → master-brief → generación
  - 7 canales de salida: blog, newsletter, twitter, linkedin, facebook, slack, teasers
  - Usuario elige qué canales generar
  - Integración con skills de marketing existentes (copywriting, social-content, etc.)
  - Almacenamiento en Obsidian (`Areas/Easymailing/Comunicacion/`)
- Skill `release`: gestiona el ciclo de releases
  - Análisis automático de cambios pendientes
  - Determinación de versión semver según tipo de cambios
  - Actualización de CHANGELOG.md
  - Commit, push y creación de release en GitHub
- Guía de estilo (`style-guide.md`) en Comunicacion/
- Comando `update` en zendesk.ts para actualizar artículos existentes

### Changed
- Renombrado `release-communication` → `marketing-content`
- README.md raíz ahora es general, cada skill tiene su propio README
- Flujo de Release ahora permite elegir qué versión(es) comunicar (lista últimas 10)
- kb-article: flujo de revisión en Markdown antes de generar HTML
- kb-article: placeholders de imágenes con formato `(IMAGEN PENDIENTE: descripción)`
- kb-article: archivos se guardan como `.md` en lugar de `.html`

### Fixed
- kb-article: añadidos `permission_group_id` y `user_segment_id` requeridos por API de Zendesk

### Infrastructure
- Estructura de documentación: README.md por skill + design.md en docs/
- Reglas de mantenimiento en CLAUDE.md
