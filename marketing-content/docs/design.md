# Marketing Content Skill - Design Document

## Propósito

Generar contenido de comunicación para Easymailing, analizando múltiples fuentes y produciendo material adaptado para cada canal con enfoque marketing. Soporta múltiples tipos de contenido, no solo releases.

## Tipos de contenido

Al invocar la skill, el usuario elige:

| Tipo | Descripción | Fuentes principales |
|------|-------------|---------------------|
| 🚀 Release | Comunicar nueva versión | Changelog, commits, plans |
| ✨ Feature spotlight | Destacar feature existente | Código, docs de la feature |
| 📖 Tutorial / Caso de uso | "Cómo hacer X con Easymailing" | Feature + casos reales |
| ⚔️ Comparativa | Easymailing vs alternativa | Competidor + nuestra feature |
| 📰 Tendencia del sector | Comentar novedad + posicionar | Web/noticias del sector |
| 💡 Tips y trucos | Contenido educativo corto | Features varias |
| 🎄 Contenido estacional | Black Friday, Navidad, etc. | Calendario + features relevantes |

## Flujo de entrada por tipo

Cada tipo de contenido tiene un flujo de entrada diferente:

### 🚀 Release
```
1. Claude lista las últimas 10 versiones/tags de git
2. Pregunta: "¿Qué versión(es) quieres comunicar?" (una o varias)
3. Para cada versión seleccionada:
   - Analiza CHANGELOG.md para esa versión
   - Revisa commits entre esa versión y la anterior
   - Busca en docs/plans/ documentación relacionada
4. Consolida features de todas las versiones seleccionadas
5. Presenta features encontradas con recomendación de destacadas
6. Usuario confirma/ajusta → continúa a Fase 2
```

### ✨ Feature spotlight
```
1. Usuario indica nombre/área de la feature
2. Claude busca en código y documentación del proyecto
3. Presenta lo encontrado
4. Usuario añade contexto adicional (texto, links, explicaciones)
5. Continúa a Fase 2
```

### 📖 Tutorial / Caso de uso
```
(Mismo flujo que Feature spotlight)
1. Usuario indica tema del tutorial
2. Claude busca features relacionadas
3. Presenta lo encontrado
4. Usuario añade contexto y casos de uso reales
5. Continúa a Fase 2
```

### ⚔️ Comparativa
```
1. Usuario indica competidor a comparar
2. Claude busca información del competidor en la web
3. Claude consulta product-marketing-context.md para ventajas de Easymailing
4. Presenta comparación inicial
5. Usuario complementa con info adicional del competidor
6. Continúa a Fase 2
```

### 📰 Tendencia del sector
```
1. Usuario indica tema/tendencia a comentar
2. Claude busca información en la web
3. Usuario puede añadir links o artículos específicos
4. Claude conecta la tendencia con Easymailing
5. Continúa a Fase 2
```

### 💡 Tips y trucos
```
1. Usuario indica tema específico O pide sugerencias
2. Si pide sugerencias: Claude propone tips basados en features de Easymailing
3. Si da tema: Claude desarrolla el tip
4. Usuario refina/ajusta
5. Continúa a Fase 2
```

### 🎄 Contenido estacional
```
1. Usuario indica fecha/evento (Black Friday, Navidad, etc.)
2. Claude propone ángulos y enfoques para Easymailing
3. Usuario elige/ajusta el enfoque
4. Continúa a Fase 2
```

## Flujo de la skill (4 fases)

```
FASE 1: ANÁLISIS (automático)
├── Detectar/recibir contexto según tipo de contenido
├── Leer último contenido similar (para consistencia)
├── Leer style-guide.md (tono base)
└── Leer product-marketing-context.md

FASE 2: DISCUSIÓN (interactiva)
├── Claude presenta lo encontrado con recomendación de destacados
├── Usuario confirma/ajusta prioridades
├── Por cada elemento destacado, Claude pregunta:
│   ├── ¿Qué es y cómo funciona?
│   ├── ¿Qué pain point resuelve?
│   ├── ¿Qué beneficio concreto aporta?
│   ├── ¿Caso de uso principal?
│   └── ¿Nos diferencia de competidores?
└── Acordar narrativa general y enfoque

FASE 3: MASTER BRIEF
└── Genera master-brief.md con todo lo acordado

FASE 4: GENERACIÓN (delegando a skills de marketing)
├── copywriting → blog.md
├── social-content → twitter.md, linkedin.md, facebook.md
├── email-sequence → newsletter.md
├── copy-editing → revisión final
└── Guardar en Obsidian
```

## Documento maestro (master-brief.md)

```markdown
# {Tipo} - {Título} - Master Brief

## Metadata
- Fecha: YYYY-MM-DD
- Tipo: [Release/Feature spotlight/Tutorial/etc.]
- Contenido anterior relacionado: [link si existe]

## Audiencia
- **Target principal:** [Todos / Segmento específico / Usuarios avanzados]
- **Contexto:** [¿Por qué les importa este contenido?]

## Narrativa principal
[Frase que resume el enfoque: "Este contenido se centra en..."]

## Elementos destacados

### 1. [Nombre elemento]
- **Qué es:** Explicación clara de la funcionalidad
- **Cómo funciona:** Descripción del flujo/comportamiento
- **Pain point:** Lo que frustraba al usuario antes
- **Beneficio:** Resultado concreto que obtiene
- **Caso de uso:** "Ahora puedes..."
- **Diferenciación:** ¿Nos distingue de competidores? ¿Cómo?
- **Prioridad:** Alta/Media
- **Assets sugeridos:** [Captura de X, GIF mostrando Y, video de Z]

### 2. [Nombre elemento]
...

## Otros puntos menores
- Punto: descripción breve
- Punto: descripción breve

## Estrategia de comunicación
- **Ganchos:** Frases clave, ángulo emocional
- **Palabras a usar:** [...]
- **Palabras a evitar:** [...]
- **Call to action:** ¿Qué queremos que haga el usuario?

## Notas adicionales
[Si aplica: deployment, timing, contexto especial]
```

## Integración con skills de marketing

La skill delega la generación de contenido a las skills existentes del plugin `marketing-skills`.

### Canales disponibles

Después de crear el master-brief, Claude pregunta qué canales generar:

```
Master brief creado ✓

¿Qué contenido quieres generar?

[ ] 📝 Blog - Artículo narrativo completo
[ ] 📧 Newsletter - Email para suscriptores
[ ] 🐦 Twitter - Posts o hilo
[ ] 💼 LinkedIn - Post profesional
[ ] 📘 Facebook - Post intermedio
[ ] 📢 Slack - Resumen para equipo interno
[ ] 🎯 Teasers - Adelantos para generar expectación

Puedes elegir uno o varios.
```

### Mapping de skills

| Canal | Skill de marketing | Descripción |
|-------|-------------------|-------------|
| Blog | `copywriting` | Artículo narrativo con estructura y CTAs |
| Newsletter | `email-sequence` | Email personal y directo |
| Twitter | `social-content` | Posts o hilos según contenido |
| LinkedIn | `social-content` | Tono profesional |
| Facebook | `social-content` | Tono intermedio |
| Slack | (sin skill) | Resumen ejecutivo interno |
| Teasers | `social-content` | Frases cortas que generan curiosidad |

### Skills de apoyo

Estas skills se usan internamente para mejorar el contenido:

| Skill | Uso |
|-------|-----|
| `copy-editing` | Revisión y pulido final |
| `marketing-psychology` | Ganchos y ángulos emocionales |
| `launch-strategy` | Para releases importantes |
| `competitor-alternatives` | Para comparativas |

### Flujo de generación

```
1. Claude pregunta: "¿Genero el blog con copywriting?"
2. Usuario confirma
3. Claude invoca skill con master-brief como contexto
4. Genera contenido y lo muestra
5. Usuario puede pedir ajustes
6. Claude pregunta por siguiente canal elegido
7. Repite hasta completar todos los canales seleccionados
8. Guarda todo en Obsidian
```

El master-brief.md se pasa como contexto a cada skill.

## Archivos generados

```
{carpeta-destino}/
├── master-brief.md           # Documento base validado
├── blog.md                   # Artículo narrativo
├── newsletter.md             # Email a usuarios
├── slack.md                  # Resumen para equipo interno
├── social/
│   ├── twitter.md            # Posts o hilos
│   ├── linkedin.md           # Tono profesional
│   └── facebook.md           # Tono intermedio
└── teasers/
    └── teasers.md            # Frases de adelanto por plataforma
```

### Detalle por archivo

#### blog.md
- Artículo narrativo generado con skill `copywriting`
- Cuenta una historia, no una lista de features
- Beneficios concretos, no descripción técnica

#### newsletter.md
- Contenido generado con skill `email-sequence`
- Más personal y directo que el blog
- Incluye CTA claro

#### social/*.md
- Contenido generado con skill `social-content`
- Adaptado al tono de cada plataforma
- Hooks efectivos según las fórmulas de la skill

## Estructura en Obsidian

El vault (`/Users/sergio/Dev/knowledge/`) organiza el contenido así:

```
knowledge/
├── Inbox/
├── Proyectos/
├── Areas/
│   └── Easymailing/
│       └── Comunicacion/                    ← todo el contenido de marketing
│           ├── style-guide.md               ← guía de estilo marketing
│           ├── product-marketing-context.md ← contexto del producto
│           ├── Releases/
│           │   └── v{version}/              ← contenido de releases
│           │       ├── master-brief.md
│           │       ├── blog.md
│           │       ├── newsletter.md
│           │       └── social/
│           └── Content/
│               └── {YYYY-MM-DD}-{slug}/     ← otro contenido (tutoriales, etc.)
│                   ├── master-brief.md
│                   ├── blog.md
│                   ├── newsletter.md
│                   └── social/
└── Archivo/
```

**Rutas de destino:**
- Release v1.14 → `Areas/Easymailing/Comunicacion/Releases/v1.14/`
- Tutorial drag & drop → `Areas/Easymailing/Comunicacion/Content/2026-02-02-tutorial-drag-drop/`

## Consistencia entre contenidos

Para mantener consistencia de tono y estilo:

1. **style-guide.md** - Define la voz base de Easymailing:
   - Voz de marca
   - Vocabulario preferido y palabras a evitar
   - Estructura típica por tipo de contenido
   - Ejemplos de referencia

2. **Contenido anterior** - Claude lee el último contenido similar antes de generar:
   - Para releases: lee el release anterior
   - Para tutoriales: lee el último tutorial
   - Mantiene coherencia de tono entre piezas

## Invocación

```bash
# Invocar skill (muestra menú de tipos)
/marketing-content

# Tipo específico
/marketing-content release
/marketing-content tutorial
/marketing-content comparativa
```

## Configuración

Archivo: `.content-config.json` en el repo de la skill

```json
{
  "project_path": "/Users/sergio/Sites/easymailingv2-docker",
  "obsidian_vault_path": "/Users/sergio/Dev/knowledge"
}
```

La primera ejecución pregunta por estas rutas si no existen.

## Pendientes

- [x] Crear style-guide.md inicial en Comunicacion/
- [x] Renombrar carpeta de skill a `marketing-content`
- [ ] Implementar la skill
