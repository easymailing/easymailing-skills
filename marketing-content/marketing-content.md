---
name: marketing-content
description: Use when creating marketing content for Easymailing - blog articles, integration pages, product pages, or newsletters. Also use when user says "crear contenido", "escribir blog", "crear integración", "página de producto", "newsletter", or similar requests.
---

# Marketing Content para Easymailing

Genera contenido de comunicación y marketing para Easymailing, siguiendo la guía de estilo y delegando a skills de marketing especializadas.

## Configuración requerida

### Archivo de configuración

Verifica que existe `.content-config.json` en la carpeta de esta skill. Si no existe, pregunta:

1. "¿Cuál es la ruta del proyecto Easymailing?"
2. "¿Cuál es la ruta del vault de Obsidian?"
3. "¿Cuál es el space_id de Storyblok?"

Crea el archivo con esta estructura:

```json
{
  "project_path": "{ruta al proyecto}",
  "obsidian_vault_path": "{ruta al vault}",
  "storyblok": {
    "space_id": "{id del espacio de Storyblok}"
  }
}
```

### Variables de entorno

El archivo `.env` en la carpeta de la skill debe contener:
```
STORYBLOK_TOKEN=tu_token_de_management_api
```

### Archivos de contexto en Obsidian

Antes de generar contenido, verifica que existen:
- `product-marketing-context.md` en `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/`
- `style-guide.md` en `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/`

Si no existen, pide al usuario que los cree primero.

## Paso 1: Preguntar tipo de contenido

Muestra este menú y espera respuesta:

```
¿Qué quieres crear?

1. 📝 Blog - Artículo (release, tutorial, comparativa...)
2. 🔌 Integración - Página de nueva integración
3. 📦 Página de producto - Funcionalidad, solución...
4. 📧 Newsletter - Comunicación con contenidos existentes
```

## Paso 2: Flujo según tipo

---

### 📝 Blog

#### 2.1 Preguntar motivo

```
¿Sobre qué quieres escribir?

1. 🚀 Release - Comunicar nueva versión
2. ✨ Feature spotlight - Destacar feature existente
3. 📖 Tutorial - Cómo hacer X con Easymailing
4. ⚔️ Comparativa - Easymailing vs alternativa
5. 📰 Tendencia - Comentar novedad del sector
6. 💡 Tips y trucos - Contenido educativo corto
7. 🎄 Estacional - Black Friday, Navidad, etc.
```

#### 2.2 Flujo de entrada según motivo

##### 🚀 Release
1. Lista las últimas 10 versiones/tags de git del proyecto Easymailing
2. Pregunta: "¿Qué versión(es) quieres comunicar?" (puede elegir una o varias)
3. Para cada versión seleccionada:
   - Analiza CHANGELOG.md para esa versión
   - Revisa commits entre esa versión y la anterior
   - Busca en docs/plans/ documentación relacionada
4. Consolida features de todas las versiones seleccionadas
5. Presenta features encontradas con recomendación de destacadas
6. Usuario confirma/ajusta

##### ✨ Feature spotlight / 📖 Tutorial
1. Pregunta: "¿Qué feature o tema quieres destacar?"
2. Busca en código y docs del proyecto Easymailing
3. Presenta lo encontrado
4. Usuario añade contexto adicional

##### ⚔️ Comparativa
1. Pregunta: "¿Con qué competidor quieres comparar?"
2. Busca información del competidor en la web
3. Lee product-marketing-context.md para ventajas de Easymailing
4. Presenta comparación inicial
5. Usuario complementa

##### 📰 Tendencia
1. Pregunta: "¿Qué tendencia o tema del sector?"
2. Busca información en la web
3. Usuario puede añadir links
4. Conecta con Easymailing

##### 💡 Tips y trucos
1. Pregunta: "¿Tema específico o quieres sugerencias?"
2. Si sugerencias: propone tips basados en features
3. Usuario elige/refina

##### 🎄 Estacional
1. Pregunta: "¿Qué fecha o evento? (Black Friday, Navidad, etc.)"
2. Propone ángulos y enfoques
3. Usuario elige/ajusta

#### 2.3 Discusión interactiva

Por cada elemento destacado, pregunta UNA A UNA:

1. "¿Qué es exactamente y cómo funciona?"
2. "¿Qué problema/frustración resolvía antes?"
3. "¿Qué beneficio concreto obtiene el usuario?"
4. "¿Cuál es el caso de uso principal?"
5. "¿Nos diferencia de la competencia? ¿Cómo?"

Acuerda la narrativa general: "Este contenido se centra en..."

#### 2.4 Crear master-brief.md

Genera el documento con esta estructura:

```markdown
# {Motivo} - {Título} - Master Brief

## Metadata
- Fecha: {fecha actual}
- Motivo: {motivo elegido}
- Contenido anterior relacionado: {link si existe}

## Audiencia
- **Target principal:** {definido en discusión}
- **Contexto:** {por qué les importa}

## Narrativa principal
{frase acordada}

## Elementos destacados

### 1. {nombre}
- **Qué es:** {explicación}
- **Cómo funciona:** {flujo}
- **Pain point:** {frustración anterior}
- **Beneficio:** {resultado concreto}
- **Caso de uso:** "Ahora puedes..."
- **Diferenciación:** {vs competencia}
- **Prioridad:** Alta/Media
- **Assets sugeridos:** {capturas, GIFs, videos}

## Estrategia de comunicación
- **Ganchos:** {frases clave}
- **Palabras a usar:** {del style-guide + específicas}
- **Palabras a evitar:** {del style-guide}
- **Call to action:** {qué queremos que haga}
```

Muestra el brief y pregunta: "¿Está bien o ajustamos algo?"

#### 2.5 Generar artículo

Invoca skill `marketing-skills:copywriting` con master-brief.

El artículo SIEMPRE incluye frontmatter YAML:

```markdown
---
reading_time: {X} min
excerpt: "{Resumen de 1-2 frases para preview/listados}"
tags: [{lista de tags relevantes en minúsculas}]
meta_title: "{Título SEO - máx 60 caracteres} | Easymailing"
meta_description: "{Descripción SEO - máx 155 caracteres}"
meta_keywords: [{lista de keywords para SEO}]
---

# {Título del artículo}
...
```

**Cálculo de reading_time**: ~200 palabras por minuto, redondear al minuto más cercano.

#### 2.6 Guardar y publicar

1. Guardar en Obsidian: `Areas/Easymailing/Comunicacion/Blog/{slug}/`
   - `master-brief.md`
   - `article.md`

2. Crear en Storyblok como borrador:
   ```bash
   npx bun marketing-content/scripts/storyblok.ts create --content-type content-blog-article --name "{título}" --slug "{slug}" --data '{...}'
   ```

#### 2.7 Distribución (opcional)

Preguntar: "¿Distribuir en redes?"

```
[ ] 🐦 Twitter - Posts o hilo
[ ] 💼 LinkedIn - Post profesional
[ ] 📘 Facebook - Post intermedio
[ ] 🎯 Teasers - Adelantos
[ ] 📢 Slack - Resumen interno
```

Para cada seleccionado:
- **Twitter/LinkedIn/Facebook/Teasers**: Invoca skill `marketing-skills:social-content` con master-brief
- **Slack**: Genera resumen ejecutivo sin skill externa

Guardar en `Areas/Easymailing/Comunicacion/Blog/{slug}/social/`

---

### 🔌 Integración

#### 2.1 Preguntar integración

Pregunta: "¿Qué integración quieres crear?"

#### 2.2 Obtener datos de Storyblok

```bash
npx bun marketing-content/scripts/storyblok.ts stories --content-type integration-category
npx bun marketing-content/scripts/storyblok.ts stories --content-type integration-use-case
```

#### 2.3 Recopilar campos

Pregunta uno a uno:

- **Título**: Nombre de la integración (ej: "Integración de Easymailing con Shopify")
- **Excerpt**: Resumen corto para listados
- **Descripción**: Texto explicativo de qué hace y cómo funciona
- **Enlace "Probar"**: URL para probar la integración
- **Enlaces de interés**: Lista de links relacionados
- **Categorías**: Selección múltiple de las obtenidas (o crear nueva)
- **Casos de uso**: Selección múltiple de los obtenidos (o crear nuevo)
- **Plan disponible**: Qué plan incluye esta integración

#### 2.4 Confirmar

Muestra resumen completo y pregunta: "¿Está bien o ajustamos algo?"

#### 2.5 Guardar y publicar

1. Guardar en Obsidian: `Areas/Easymailing/Comunicacion/Integraciones/{slug}/`
   - `integration.md`

2. Crear en Storyblok como borrador:
   ```bash
   npx bun marketing-content/scripts/storyblok.ts create --content-type content-integration --name "{nombre}" --slug "{slug}" --data '{...}'
   ```

#### 2.6 Distribución (opcional)

Preguntar: "¿Distribuir en redes?"

(Mismo flujo que Blog)

---

### 📦 Página de producto

#### 2.1 Preguntar tipo de página

```
¿Qué tipo de página quieres crear?

1. Funcionalidad (ej: automatizaciones, segmentación)
2. Solución (ej: email marketing para ecommerce)
3. Otro (describir)
```

#### 2.2 Preguntar tema

Pregunta: "¿Qué funcionalidad/solución quieres documentar?"

#### 2.3 Obtener datos de Storyblok

```bash
# Componentes disponibles
npx bun marketing-content/scripts/storyblok.ts components

# Páginas existentes como referencia
npx bun marketing-content/scripts/storyblok.ts stories --content-type content-static-page
npx bun marketing-content/scripts/storyblok.ts story <story_id>
```

#### 2.4 Discusión interactiva

Preguntas una a una:
- ¿Cuál es el beneficio principal para el usuario?
- ¿Qué problemas resuelve?
- ¿Qué features específicas hay que destacar?
- ¿Hay competidores que lo hagan diferente?

#### 2.5 Proponer estructura

Presenta:
- Qué componentes usar y en qué orden
- Textos para cada componente (headlines, descripciones, CTAs, bullets)
- SEO metatags:
  - `meta_title` (máx 60 caracteres)
  - `meta_description` (máx 155 caracteres)
  - `meta_keywords`
  - `slug` URL

Itera hasta que el usuario apruebe.

#### 2.6 Guardar y publicar

1. Guardar en Obsidian: `Areas/Easymailing/Comunicacion/Paginas-Producto/{slug}/`
   - `page-spec.md`

2. Crear en Storyblok como borrador:
   ```bash
   npx bun marketing-content/scripts/storyblok.ts create --content-type content-static-page --name "{nombre}" --slug "{slug}" --data '{...}'
   ```

#### 2.7 Distribución (opcional)

Preguntar: "¿Distribuir en redes?"

(Mismo flujo que Blog)

---

### 📧 Newsletter

#### 2.1 Listar contenidos recientes

Lee de Obsidian los contenidos recientes:
- `Areas/Easymailing/Comunicacion/Blog/` - blogs recientes
- `Areas/Easymailing/Comunicacion/Integraciones/` - integraciones recientes
- `Areas/Easymailing/Comunicacion/Paginas-Producto/` - páginas recientes

Presenta lista con fecha y título.

#### 2.2 Seleccionar contenidos

Usuario selecciona cuáles incluir en la newsletter.

#### 2.3 Discusión

Preguntas:
- "¿Añadir algo más?" (texto libre, anuncios, novedades no documentadas)
- "¿Cuál es el enfoque general de esta newsletter?"
- "¿Cuál es el CTA principal?"

#### 2.4 Generar newsletter

Invoca skill `marketing-skills:email-sequence` con los contenidos seleccionados.

Formato obligatorio:

```markdown
# Newsletter - {Título}

**Asunto A:** {Versión A del asunto}
**Asunto B:** {Versión B del asunto - diferente enfoque/ángulo}

**Preview text A:** {Preview para asunto A}
**Preview text B:** {Preview para asunto B}

---

{Contenido del email con enlaces a los contenidos seleccionados}
```

**Criterios para variantes A/B:**
- Asunto A: Enfoque directo o informativo
- Asunto B: Enfoque emocional, con pregunta, o beneficio diferente
- Los preview texts deben complementar cada asunto, no repetirlo

**CTAs diferenciados:**
- CTA para usuarios existentes: "Abrir X", "Probar X en tu cuenta"
- CTA para nuevos: "Crear cuenta gratis", "Registrarse gratis"

#### 2.5 Guardar

Guardar en Obsidian: `Areas/Easymailing/Comunicacion/Newsletters/{fecha}-{slug}/`
- `newsletter.md`

---

## Componentes de Blog

Los blogs pueden incluir componentes especiales:

### CTA Block
```markdown
{% cta %}
claim: "{Frase que engancha o promete valor}"
button_text: "{Texto del botón - corto y accionable}"
button_url: "{URL destino}"
{% endcta %}
```

### FAQs
```markdown
{% faqs %}
- question: "{Pregunta}"
  answer: "{Respuesta concisa}"
{% endfaqs %}
```

### Checklist
```markdown
{% checklist title="{Título opcional}" %}
- {Item 1}
- {Item 2}
{% endchecklist %}
```

### Integration List
```markdown
{% integrations %}
- name: "{Nombre}"
  url: "{URL a la integración}"
{% endintegrations %}
```

### Promo Card
```markdown
{% promo %}
title: "{Título}"
image: "{URL imagen}"
description: "{Descripción breve}"
button_text: "{Texto CTA}"
button_url: "{URL destino}"
{% endpromo %}
```

### Testimonial
```markdown
{% testimonial %}
quote: "{Texto del testimonio}"
name: "{Nombre}"
job_title: "{Cargo y empresa}"
{% endtestimonial %}
```

### Cuándo usar cada componente

| Motivo de blog | Componentes recomendados |
|----------------|-------------------------|
| Release | CTA, FAQs |
| Tutorial | CTA, Checklist, FAQs |
| Comparativa | CTA, FAQs, Promo Card |
| Feature spotlight | CTA, Testimonial |
| Tips y trucos | CTA, Checklist |

## Script de Storyblok

La skill incluye un script CLI para interactuar con la API de Storyblok:

```bash
# Listar componentes disponibles
npx bun marketing-content/scripts/storyblok.ts components

# Listar stories de un content type
npx bun marketing-content/scripts/storyblok.ts stories --content-type content-static-page
npx bun marketing-content/scripts/storyblok.ts stories --content-type content-blog-article
npx bun marketing-content/scripts/storyblok.ts stories --content-type content-integration
npx bun marketing-content/scripts/storyblok.ts stories --content-type integration-category
npx bun marketing-content/scripts/storyblok.ts stories --content-type integration-use-case

# Obtener una story específica (ver estructura/ejemplo)
npx bun marketing-content/scripts/storyblok.ts story <story_id>

# Crear story como borrador
npx bun marketing-content/scripts/storyblok.ts create --content-type <type> --name <name> --slug <slug> --data <json>
```

El script lee automáticamente `.content-config.json` y `.env` de la carpeta de la skill.

## Referencias obligatorias

SIEMPRE lee antes de generar contenido (rutas desde `.content-config.json`):
- `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/style-guide.md`
- `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/product-marketing-context.md`

Para consistencia, lee el último contenido similar si existe.

## Rutas del proyecto

Leer de `.content-config.json`:
- **Proyecto Easymailing**: `project_path`
- **Vault Obsidian**: `obsidian_vault_path`
- **Storyblok space_id**: `storyblok.space_id`

## Estructura en Obsidian

```
Areas/Easymailing/Comunicacion/
├── Blog/
│   └── {slug}/
│       ├── master-brief.md
│       ├── article.md
│       └── social/
├── Integraciones/
│   └── {slug}/
│       ├── integration.md
│       └── social/
├── Paginas-Producto/
│   └── {slug}/
│       ├── page-spec.md
│       └── social/
└── Newsletters/
    └── {fecha}-{slug}/
        └── newsletter.md
```
