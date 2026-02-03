# Easymailing Skills

Este repositorio contiene skills para Claude Code específicas del proyecto Easymailing.

## Estructura del proyecto

- Cada skill tiene su propia carpeta con el archivo `.md` ejecutable
- La documentación de diseño va en `[skill]/docs/`
- La configuración local (`.kb-config.json`, `.content-config.json`) está ignorada en git

## Convenciones

### Skills
- Archivo principal: `[nombre-skill]/[nombre-skill].md`
- Diseño/documentación: `[nombre-skill]/docs/design.md`
- Las skills siguen el formato estándar de Claude Code skills

### Commits
- `feat:` nueva funcionalidad
- `fix:` corrección de bugs
- `docs:` documentación
- `refactor:` refactorización sin cambio de funcionalidad

## Mantenimiento

Al modificar una skill, revisar y actualizar si es necesario:
- `{skill}/README.md` - Uso, tipos, flujo
- `{skill}/docs/design.md` - Diseño técnico
- `README.md` raíz - Si cambia nombre o descripción de skill
- `CHANGELOG.md` - Añadir entrada con el cambio realizado

## Skills actuales

### kb-article
Crea artículos de base de conocimiento para Zendesk. Consulta código, navega la app, genera HTML bilingüe y publica borradores. Ver [design.md](kb-article/docs/design.md) para detalles.

### marketing-content
Genera contenido de comunicación y marketing para Easymailing (releases, tutoriales, comparativas, etc.). Ver [design.md](marketing-content/docs/design.md) para detalles.
