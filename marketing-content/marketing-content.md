---
name: marketing-content
description: Use when creating marketing content for Easymailing - releases, feature spotlights, tutorials, comparisons, industry trends, tips, or seasonal content. Also use when user says "crear contenido", "comunicar release", "escribir blog", or similar marketing requests.
---

# Marketing Content para Easymailing

Genera contenido de comunicación y marketing para Easymailing, siguiendo la guía de estilo y delegando a skills de marketing especializadas.

## Configuración requerida

### Archivo de configuración

Verifica que existe `.content-config.json` en la carpeta de esta skill. Si no existe, pregunta:

1. "¿Cuál es la ruta del proyecto Easymailing?"
2. "¿Cuál es la ruta del vault de Obsidian?"

Crea el archivo con esta estructura:

```json
{
  "project_path": "{ruta al proyecto}",
  "obsidian_vault_path": "{ruta al vault}"
}
```

### Archivos de contexto en Obsidian

Antes de generar contenido, verifica que existen:
- `product-marketing-context.md` en `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/`
- `style-guide.md` en `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/`

Si no existen, pide al usuario que los cree primero.

## Flujo principal

```
INICIO
   ↓
¿Qué tipo de contenido?
   ↓
[Menú de tipos] → Usuario elige
   ↓
FASE 1: Entrada según tipo
   ↓
FASE 2: Discusión interactiva
   ↓
FASE 3: Crear master-brief.md
   ↓
FASE 4: Generar contenido por canal
   ↓
Guardar en Obsidian
```

## Paso 1: Preguntar tipo de contenido

Muestra este menú y espera respuesta:

```
¿Qué tipo de contenido quieres crear?

1. 🚀 Release - Comunicar nueva versión
2. ✨ Feature spotlight - Destacar feature existente
3. 📖 Tutorial - Cómo hacer X con Easymailing
4. ⚔️ Comparativa - Easymailing vs alternativa
5. 📰 Tendencia - Comentar novedad del sector
6. 💡 Tips y trucos - Contenido educativo corto
7. 🎄 Estacional - Black Friday, Navidad, etc.
```

## Paso 2: Flujo de entrada según tipo

### 🚀 Release
1. Lista las últimas 10 versiones/tags de git del proyecto Easymailing
2. Pregunta: "¿Qué versión(es) quieres comunicar?" (puede elegir una o varias)
3. Para cada versión seleccionada:
   - Analiza CHANGELOG.md para esa versión
   - Revisa commits entre esa versión y la anterior
   - Busca en docs/plans/ documentación relacionada
4. Consolida features de todas las versiones seleccionadas
5. Presenta features encontradas con recomendación de destacadas
6. Usuario confirma/ajusta

### ✨ Feature spotlight / 📖 Tutorial
1. Pregunta: "¿Qué feature o tema quieres destacar?"
2. Busca en código y docs del proyecto Easymailing
3. Presenta lo encontrado
4. Usuario añade contexto adicional

### ⚔️ Comparativa
1. Pregunta: "¿Con qué competidor quieres comparar?"
2. Busca información del competidor en la web
3. Lee product-marketing-context.md para ventajas de Easymailing
4. Presenta comparación inicial
5. Usuario complementa

### 📰 Tendencia
1. Pregunta: "¿Qué tendencia o tema del sector?"
2. Busca información en la web
3. Usuario puede añadir links
4. Conecta con Easymailing

### 💡 Tips y trucos
1. Pregunta: "¿Tema específico o quieres sugerencias?"
2. Si sugerencias: propone tips basados en features
3. Usuario elige/refina

### 🎄 Estacional
1. Pregunta: "¿Qué fecha o evento? (Black Friday, Navidad, etc.)"
2. Propone ángulos y enfoques
3. Usuario elige/ajusta

## Paso 3: Discusión interactiva (FASE 2)

Por cada elemento destacado, pregunta UNA A UNA:

1. "¿Qué es exactamente y cómo funciona?"
2. "¿Qué problema/frustración resolvía antes?"
3. "¿Qué beneficio concreto obtiene el usuario?"
4. "¿Cuál es el caso de uso principal?"
5. "¿Nos diferencia de la competencia? ¿Cómo?"

Acuerda la narrativa general: "Este contenido se centra en..."

## Paso 4: Crear master-brief.md (FASE 3)

Genera el documento con esta estructura:

```markdown
# {Tipo} - {Título} - Master Brief

## Metadata
- Fecha: {fecha actual}
- Tipo: {tipo elegido}

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

## Paso 5: Selección de canales (FASE 4)

Pregunta usando AskUserQuestion con multiSelect:

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
```

## Paso 6: Generar contenido por canal

Para cada canal seleccionado:

1. Pregunta: "¿Genero {canal}?"
2. Si confirma:
   - **Blog**: Invoca skill `marketing-skills:copywriting` con master-brief
   - **Newsletter**: Invoca skill `marketing-skills:email-sequence` con master-brief (ver formato newsletter abajo)
   - **Twitter/LinkedIn/Facebook/Teasers**: Invoca skill `marketing-skills:social-content` con master-brief
   - **Slack**: Genera resumen ejecutivo sin skill externa
3. Muestra resultado
4. Pregunta: "¿Ajustes o siguiente canal?"
5. Repite hasta completar

### Formato Blog

Los artículos de blog SIEMPRE incluyen frontmatter YAML con metadatos:

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

### Formato Newsletter

Las newsletters SIEMPRE incluyen variantes A/B para asunto y preview text:

```markdown
# Newsletter - {Título}

**Asunto A:** {Versión A del asunto}
**Asunto B:** {Versión B del asunto - diferente enfoque/ángulo}

**Preview text A:** {Preview para asunto A}
**Preview text B:** {Preview para asunto B}

---

{Contenido del email}
```

**Criterios para variantes A/B:**
- Asunto A: Enfoque directo o informativo
- Asunto B: Enfoque emocional, con pregunta, o beneficio diferente
- Los preview texts deben complementar cada asunto, no repetirlo

**CTAs diferenciados:** Las newsletters se envían tanto a usuarios con cuenta como a leads sin cuenta. Incluir siempre dos CTAs:
- CTA para usuarios existentes: "Abrir X", "Probar X en tu cuenta"
- CTA para nuevos: "Crear cuenta gratis", "Registrarse gratis"

### Componentes de Blog

Los blogs pueden incluir componentes especiales. Usar según el contexto del artículo:

#### CTA Block
Call to action con claim + botón. Usar al final del artículo y opcionalmente intercalado.

```markdown
{% cta %}
claim: "{Frase que engancha o promete valor}"
button_text: "{Texto del botón - corto y accionable}"
button_url: "{URL destino}"
{% endcta %}
```

#### FAQs
Preguntas frecuentes. Ideal para releases, tutoriales y comparativas.

```markdown
{% faqs %}
- question: "{Pregunta}"
  answer: "{Respuesta concisa}"
- question: "{Pregunta}"
  answer: "{Respuesta concisa}"
{% endfaqs %}
```

#### Checklist
Lista de verificación. Útil para tutoriales y guías.

```markdown
{% checklist title="{Título opcional}" %}
- {Item 1}
- {Item 2}
- {Item 3}
{% endchecklist %}
```

#### Integration List
Enlaces a integraciones de Easymailing. Usar cuando se mencionan integraciones.

```markdown
{% integrations %}
- name: "{Nombre}"
  url: "{URL a la integración}"
- name: "{Nombre}"
  url: "{URL a la integración}"
{% endintegrations %}
```

#### Promo Card
Tarjeta promocional destacada. Para ofertas o contenido relacionado.

```markdown
{% promo %}
title: "{Título}"
image: "{URL imagen}"
description: "{Descripción breve}"
button_text: "{Texto CTA}"
button_url: "{URL destino}"
{% endpromo %}
```

#### Testimonial
Testimonio individual. Para social proof.

```markdown
{% testimonial %}
quote: "{Texto del testimonio}"
name: "{Nombre}"
job_title: "{Cargo y empresa}"
{% endtestimonial %}
```

### Cuándo usar cada componente

| Tipo contenido | Componentes recomendados |
|---------------|-------------------------|
| Release | CTA, FAQs |
| Tutorial | CTA, Checklist, FAQs |
| Comparativa | CTA, FAQs, Promo Card |
| Feature spotlight | CTA, Testimonial |
| Tips y trucos | CTA, Checklist |

## Paso 7: Guardar en Obsidian

Determina carpeta destino:
- Release → `Areas/Easymailing/Comunicacion/Releases/v{version}/`
- Otros → `Areas/Easymailing/Comunicacion/Content/{YYYY-MM-DD}-{slug}/`

Crea estructura:
```
{carpeta}/
├── master-brief.md
├── blog.md (si generado)
├── newsletter.md (si generado)
├── slack.md (si generado)
├── social/
│   ├── twitter.md (si generado)
│   ├── linkedin.md (si generado)
│   └── facebook.md (si generado)
└── teasers/
    └── teasers.md (si generado)
```

Confirma: "Contenido guardado en {ruta}"

## Referencias obligatorias

SIEMPRE lee antes de generar contenido (rutas desde `.content-config.json`):
- `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/style-guide.md`
- `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/product-marketing-context.md`

Para consistencia, lee el último contenido similar si existe.

## Rutas del proyecto

Leer de `.content-config.json`:
- **Proyecto Easymailing**: `project_path`
- **Vault Obsidian**: `obsidian_vault_path`
- **Carpeta de contenido**: `Areas/Easymailing/Comunicacion/`
