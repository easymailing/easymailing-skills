# Release Communication Skill - Design Document

## Propósito

Generar contenido de comunicación completo para cada release de Easymailing, analizando múltiples fuentes y produciendo material adaptado para cada canal con enfoque marketing.

## Flujo de la skill

```
1. Detectar último tag de git
2. Analizar fuentes:
   - CHANGELOG.MD (sección unreleased o del tag)
   - Commits desde último tag
   - docs/plans/ relacionados
3. Generar resumen maestro interno
4. Producir contenido por canal
5. Guardar en vault Obsidian: Releases/v{version}/
```

## Fuentes de análisis

### 1. CHANGELOG.MD
- Busca sección `## v{version} unreleased` o versión específica
- Extrae entries categorizadas: `[App]`, `[Api]`, `[Core]`, etc.
- Identifica sección `##### Deployment` para notas técnicas

### 2. Git commits desde último tag
- `git log v{last_tag}..HEAD`
- Detecta cambios no documentados en changelog
- Agrupa por prefijo: `feat:`, `fix:`, `refactor:`, `docs:`

### 3. docs/plans/ relacionados
- Busca planes creados en el rango de fechas del release
- Extrae contexto: problema que resuelve, decisiones de diseño
- Enriquece las features con el "por qué" además del "qué"

### Cruce de información
- Commit menciona feature del changelog → enriquece con contexto
- Plan existe para una feature → añade narrativa de diseño
- Commits sin entrada en changelog → marca como "no documentados"

## Enfoque de contenido (Marketing)

Para cada feature significativa, analiza:

### 1. Pain points que resuelve
- ¿Qué problema tenía el usuario antes?
- ¿Qué frustración elimina?
- ¿Qué tiempo/esfuerzo ahorra?

### 2. Beneficios concretos
- Enfocado en resultado, no en implementación técnica
- "Reorganiza tu automatización en segundos" vs "añadimos drag & drop"

### 3. Gancho de expectación
- Teasers previos al release
- Frases que generan curiosidad sin revelar todo

### 4. Casos de uso
- Ejemplos concretos de cómo usar la feature
- "Ahora puedes..." en lugar de "Hemos implementado..."

## Archivos generados

```
Releases/
└── v{version}/
    ├── resumen-completo.md      # Documento maestro con análisis completo
    ├── slack.md                 # Resumen ejecutivo para equipo
    ├── blog.md                  # Artículo narrativo
    ├── newsletter.md            # Contenido propio para email
    ├── social/
    │   ├── twitter.md           # Posts o hilos según tamaño
    │   ├── linkedin.md          # Tono profesional
    │   └── facebook.md          # Tono intermedio
    └── teasers/
        ├── teaser-1.md          # Primer adelanto (general)
        ├── teaser-2.md          # Segundo adelanto (feature específica)
        └── teaser-feature-X.md  # Teasers por feature destacada
```

### Detalle por archivo

#### resumen-completo.md
- Análisis de todos los cambios detectados
- Categorización por tipo (features, fixes, refactors)
- Features destacadas identificadas
- Contexto extraído de docs/plans/
- Notas de deployment
- Pain points y beneficios por feature

#### slack.md
- Resumen ejecutivo para el equipo
- Longitud variable según cantidad de novedades
- Enfocado en qué se desplegó, no en detalles técnicos

#### blog.md
- Artículo narrativo
- Cuenta una historia: "En esta versión nos enfocamos en X porque..."
- Features como parte del relato, no como lista

#### newsletter.md
- Contenido propio, diferente al blog
- Más personal y directo
- Espacio para próximos pasos, agradecimientos, tips de uso

#### social/twitter.md
- LLM decide: post único o hilo según contenido
- Tono casual y directo

#### social/linkedin.md
- Tono profesional
- Enfocado en beneficios de negocio

#### social/facebook.md
- Tono intermedio
- Balance entre profesional y cercano

#### teasers/
- Frases cortas que generan curiosidad
- Sin revelar la feature completa
- Adaptados a cada red social
- LLM decide cantidad según tamaño del release

## Audiencia por canal

| Canal | Audiencia | Tono |
|-------|-----------|------|
| Slack | Equipo interno | Informativo, técnico cuando necesario |
| Blog | Usuarios finales | Narrativo, beneficios |
| Newsletter | Usuarios finales | Personal, directo |
| Twitter | Usuarios finales | Casual, directo |
| LinkedIn | Usuarios finales | Profesional |
| Facebook | Usuarios finales | Intermedio |

## Invocación

```bash
# Release completo (detecta último tag automáticamente)
/release-communication

# Versión específica
/release-communication v1.14

# Solo teasers
/release-communication --teasers

# Solo un canal
/release-communication --only blog
```

## Configuración

Archivo: `.release-config.json` en el repo de la skill

```json
{
  "project_path": "/Users/sergio/Sites/easymailingv2-docker",
  "obsidian_vault_path": "/Users/sergio/Dev/knowledge"
}
```

La primera ejecución pregunta por estas rutas si no existen.

## Pendientes (fuera de esta skill)

- [ ] Configurar vault Obsidian en `/Users/sergio/Dev/knowledge`
- [ ] Configurar Obsidian Sync o iCloud
- [ ] Script de indexación vault → OpenAI Vector Store
- [ ] Explorar MCP Server para consultas desde Claude
