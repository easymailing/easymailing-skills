# Changelog

Todos los cambios notables en este repositorio.

## [Unreleased]

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
- Guía de estilo (`style-guide.md`) en Comunicacion/

### Changed
- Renombrado `release-communication` → `marketing-content`
- README.md raíz ahora es general, cada skill tiene su propio README
- Flujo de Release ahora permite elegir qué versión(es) comunicar (lista últimas 10)

### Infrastructure
- Estructura de documentación: README.md por skill + design.md en docs/
- Reglas de mantenimiento en CLAUDE.md
