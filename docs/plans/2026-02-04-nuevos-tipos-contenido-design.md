# Nuevos tipos de contenido: Integración y Página de producto

## Fecha
2026-02-04

## Resumen

Ampliar la skill `marketing-content` con dos nuevos tipos de contenido:
- **Integración**: Páginas para nuevas integraciones en easymailing.com/integraciones/
- **Página de producto**: Páginas de funcionalidades, soluciones, etc.

Ambos tipos se guardan en Obsidian (Markdown) y se crean como borrador en Storyblok.

## Menú actualizado (Paso 1)

```
¿Qué tipo de contenido quieres crear?

1. 🚀 Release - Comunicar nueva versión
2. ✨ Feature spotlight - Destacar feature existente
3. 📖 Tutorial - Cómo hacer X con Easymailing
4. ⚔️ Comparativa - Easymailing vs alternativa
5. 📰 Tendencia - Comentar novedad del sector
6. 💡 Tips y trucos - Contenido educativo corto
7. 🎄 Estacional - Black Friday, Navidad, etc.
8. 🔌 Integración - Página para nueva integración
9. 📦 Página de producto - Funcionalidad, solución...
```

## Flujo: Integración (Paso 2)

### Content type en Storyblok
`content-integration`

### Campos requeridos
| Campo | Descripción |
|-------|-------------|
| Título | Nombre de la integración (ej: "Integración de Easymailing con Shopify") |
| Excerpt | Resumen corto para listados |
| Descripción | Texto explicativo de qué hace y cómo funciona |
| Enlace "Probar" | URL para probar la integración |
| Enlaces de interés | Lista de links relacionados |
| Categorías | Selección múltiple (desde Storyblok: `integration-category`) |
| Casos de uso | Selección múltiple (desde Storyblok: `integration-use-case`) |
| Plan disponible | Qué plan incluye esta integración |

### Flujo detallado

```
1. Preguntar: "¿Qué integración quieres crear?"

2. Obtener de Storyblok:
   - Categorías (content type: integration-category)
   - Casos de uso (content type: integration-use-case)

3. Recopilar campos uno a uno:
   - Título
   - Excerpt
   - Descripción
   - Enlace "Probar"
   - Enlaces de interés
   - Categorías (selección múltiple, o crear nueva)
   - Casos de uso (selección múltiple, o crear nuevo)
   - Plan disponible

4. Mostrar resumen y confirmar

5. Guardar en Obsidian:
   Areas/Easymailing/Comunicacion/Integraciones/{slug}/
   └── integration.md

6. Crear en Storyblok como borrador (content-integration)
```

## Flujo: Página de producto (Paso 2)

### Content type en Storyblok
`content-static-page`

### Flujo detallado

```
1. Preguntar: "¿Qué tipo de página quieres crear?"
   - Funcionalidad (ej: automatizaciones, segmentación)
   - Solución (ej: email marketing para ecommerce)
   - Otro (describir)

2. Preguntar: "¿Qué funcionalidad/solución quieres documentar?"

3. Obtener de Storyblok:
   - Componentes disponibles en el espacio
   - 2-3 páginas existentes de content-static-page como referencia

4. Discusión interactiva (preguntas una a una):
   - ¿Cuál es el beneficio principal para el usuario?
   - ¿Qué problemas resuelve?
   - ¿Qué features específicas hay que destacar?
   - ¿Hay competidores que lo hagan diferente?

5. Proponer estructura de página:
   - Qué componentes usar
   - En qué orden
   - Textos para cada componente (headlines, descripciones, CTAs, bullets)
   - SEO metatags:
     - meta_title (máx 60 caracteres)
     - meta_description (máx 155 caracteres)
     - meta_keywords
     - slug URL

6. Iterar hasta aprobar

7. Guardar en Obsidian:
   Areas/Easymailing/Comunicacion/Paginas-Producto/{slug}/
   └── page-spec.md

8. Crear en Storyblok como borrador (content-static-page)
```

## Script de Storyblok

### Ubicación
`marketing-content/scripts/storyblok.ts`

### Comandos

```bash
# Listar componentes disponibles
npx bun marketing-content/scripts/storyblok.ts components

# Listar stories de un content type
npx bun marketing-content/scripts/storyblok.ts stories --content-type content-static-page
npx bun marketing-content/scripts/storyblok.ts stories --content-type content-integration

# Obtener una story específica (ver estructura/ejemplo)
npx bun marketing-content/scripts/storyblok.ts story <story_id>

# Listar categorías de integración
npx bun marketing-content/scripts/storyblok.ts stories --content-type integration-category

# Listar casos de uso de integración
npx bun marketing-content/scripts/storyblok.ts stories --content-type integration-use-case

# Crear story como borrador
npx bun marketing-content/scripts/storyblok.ts create --content-type <type> --name <name> --slug <slug> --data <json>
```

## Configuración

### `.content-config.json`
```json
{
  "project_path": "{ruta al proyecto}",
  "obsidian_vault_path": "{ruta al vault}",
  "storyblok": {
    "space_id": "{id del espacio}"
  }
}
```

### `.env`
```
STORYBLOK_TOKEN={management API token}
```

## Archivos a modificar/crear

### Modificar

1. **`marketing-content/marketing-content.md`**
   - Añadir tipos 8 (Integración) y 9 (Página de producto) al menú
   - Añadir flujos del Paso 2 para ambos tipos
   - Documentar configuración de Storyblok

### Crear

2. **`marketing-content/scripts/storyblok.ts`**
   - Script CLI para API de Storyblok
   - Comandos: components, stories, story, create

### Actualizar (documentación)

3. **`marketing-content/README.md`** - Nuevos tipos de contenido
4. **`marketing-content/docs/design.md`** - Documentar flujos
5. **`CHANGELOG.md`** - Entrada del cambio
6. **`README.md` raíz** - Si cambia descripción de la skill

## Output en Obsidian

### Integraciones
```
Areas/Easymailing/Comunicacion/Integraciones/{slug}/
└── integration.md
```

### Páginas de producto
```
Areas/Easymailing/Comunicacion/Paginas-Producto/{slug}/
└── page-spec.md
```
