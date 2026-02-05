---
name: em-release
description: Use when the user wants to publish changes, create a release, commit to git, or says "haz release", "publica los cambios", "sube a git", "crear release".
---

# Release de Easymailing Skills

Analiza los cambios pendientes, determina la versión semver, actualiza el CHANGELOG, hace commit, push y crea un release en GitHub.

## Flujo principal

```
FASE 1: Análisis de cambios
   ↓
FASE 2: Determinar versión
   ↓
FASE 3: Actualizar CHANGELOG
   ↓
FASE 4: Commit y push
   ↓
FASE 5: Crear release en GitHub
```

## Fase 1: Análisis de cambios

### Paso 1.1: Ver estado del repositorio

Ejecuta estos comandos para entender qué ha cambiado:

```bash
# Estado actual
git status

# Cambios en archivos
git diff

# Último tag/release
git describe --tags --abbrev=0 2>/dev/null || echo "No hay tags previos"

# Commits desde el último tag (si existe)
git log $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --oneline 2>/dev/null || git log --oneline -10
```

### Paso 1.2: Resumir cambios

Presenta al usuario un resumen de los cambios detectados:

```
## Cambios detectados

### Archivos modificados:
- kb-article/kb-article.md
- kb-article/scripts/zendesk.ts

### Resumen de cambios:
- [descripción breve de cada cambio significativo]
```

## Fase 2: Determinar versión

### Reglas de versionado semver

Analiza los cambios y determina el tipo de incremento:

**MAJOR (x.0.0)** - Cambios breaking:
- Eliminar o renombrar una skill
- Cambiar estructura de archivos de forma incompatible
- Cambiar flujo de skill de forma que rompa uso existente

**MINOR (0.x.0)** - Nueva funcionalidad:
- Añadir nueva skill
- Añadir nuevo comando o fase a una skill existente
- Añadir nueva integración (API, herramienta)

**PATCH (0.0.x)** - Correcciones y mejoras menores:
- Corregir bugs
- Mejorar documentación
- Ajustar textos o formatos
- Refactorizar sin cambiar funcionalidad

### Paso 2.1: Proponer versión

Obtén la versión actual:

```bash
git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"
```

Propón la nueva versión y explica por qué:

```
## Versión propuesta: v1.2.0

**Razón:** Se añadió nueva funcionalidad (comando `update` en zendesk.ts)

¿Te parece bien esta versión o prefieres otra?
```

Espera confirmación del usuario antes de continuar.

## Fase 3: Actualizar CHANGELOG

### Paso 3.1: Leer CHANGELOG actual

```bash
cat CHANGELOG.md
```

### Paso 3.2: Preparar entrada del changelog

Genera la entrada para el CHANGELOG siguiendo el formato existente:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Descripción de funcionalidades nuevas

### Changed
- Descripción de cambios en funcionalidades existentes

### Fixed
- Descripción de correcciones
```

Solo incluye las secciones que apliquen (Added, Changed, Fixed, Removed, etc.)

### Paso 3.3: Actualizar CHANGELOG.md

Mueve el contenido de `[Unreleased]` a la nueva versión y deja `[Unreleased]` vacío:

```markdown
## [Unreleased]

## [X.Y.Z] - YYYY-MM-DD
[contenido movido de Unreleased + cambios actuales]
```

## Fase 4: Commit y push

### Paso 4.1: Añadir archivos

```bash
git add -A
```

### Paso 4.2: Crear commit

Usa un mensaje descriptivo que resuma los cambios:

```bash
git commit -m "feat: descripción breve de los cambios principales

- Detalle 1
- Detalle 2
- Detalle 3"
```

Convenciones de prefijos:
- `feat:` nueva funcionalidad
- `fix:` corrección de bugs
- `docs:` documentación
- `refactor:` refactorización

### Paso 4.3: Push

```bash
git push origin main
```

## Fase 5: Crear release en GitHub

### Paso 5.1: Preparar notas del release

Las notas deben incluir:
- Resumen de los cambios principales
- Lista de cambios (copiada del CHANGELOG)
- Créditos si aplica

### Paso 5.2: Crear release

```bash
gh release create vX.Y.Z --title "vX.Y.Z - Título descriptivo" --notes "$(cat <<'EOF'
## Cambios en esta versión

### Added
- ...

### Changed
- ...

### Fixed
- ...
EOF
)"
```

### Paso 5.3: Confirmar al usuario

```
✅ Release creado exitosamente

- **Versión:** vX.Y.Z
- **URL:** https://github.com/usuario/repo/releases/tag/vX.Y.Z
- **Commit:** [hash]

El CHANGELOG.md ha sido actualizado y los cambios están publicados.
```

## Invocación

```bash
/release
```

O cuando el usuario diga:
- "haz release"
- "publica los cambios"
- "sube a git"
- "crear release"
- "nueva versión"
