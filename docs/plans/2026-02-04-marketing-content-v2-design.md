# Marketing Content v2 - Rediseño de estructura

## Fecha
2026-02-04

## Contexto

Análisis del flujo existente reveló problemas de diseño:
- Flujos divergentes entre tipos de contenido
- Blog no se publicaba en Storyblok
- Newsletter tratada como derivado cuando es contenido independiente
- Mezcla de "qué comunicar" con "dónde publicar"

## Nueva estructura

### Menú principal (Paso 1)

```
¿Qué quieres crear?

1. 📝 Blog - Artículo (release, tutorial, comparativa...)
2. 🔌 Integración - Página de nueva integración
3. 📦 Página de producto - Funcionalidad, solución...
4. 📧 Newsletter - Comunicación con contenidos existentes
```

### Capas conceptuales

```
CAPA 1: CONTENIDO WEB (→ Storyblok + Obsidian)
├── 📝 Blog (content-blog-article)
│   └── Motivos: Release, Feature, Tutorial, Comparativa, Tendencia, Tips, Estacional
├── 🔌 Integración (content-integration)
└── 📦 Página de producto (content-static-page)

CAPA 2: COMUNICACIÓN (→ Obsidian)
└── 📧 Newsletter
    └── Agrupa contenidos existentes + extras

CAPA 3: DISTRIBUCIÓN (opcional, aplica a cualquier contenido web)
├── 🐦 Twitter
├── 💼 LinkedIn
├── 📘 Facebook
├── 🎯 Teasers
└── 📢 Slack
```

## Flujos por tipo

### 📝 Blog

```
1. Preguntar motivo: ¿Sobre qué?
   - 🚀 Release - Comunicar nueva versión
   - ✨ Feature spotlight - Destacar feature existente
   - 📖 Tutorial - Cómo hacer X con Easymailing
   - ⚔️ Comparativa - Easymailing vs alternativa
   - 📰 Tendencia - Comentar novedad del sector
   - 💡 Tips y trucos - Contenido educativo corto
   - 🎄 Estacional - Black Friday, Navidad, etc.

2. Flujo de entrada SEGÚN MOTIVO:

   🚀 Release:
   - Lista últimas 10 versiones/tags de git del proyecto
   - Pregunta: "¿Qué versión(es) quieres comunicar?"
   - Para cada versión:
     - Analiza CHANGELOG.md
     - Revisa commits entre esa versión y la anterior
     - Busca en docs/plans/ documentación relacionada
   - Consolida features de todas las versiones
   - Presenta features con recomendación de destacadas
   - Usuario confirma/ajusta

   ✨ Feature spotlight / 📖 Tutorial:
   - Pregunta: "¿Qué feature o tema quieres destacar?"
   - Busca en código y docs del proyecto
   - Presenta lo encontrado
   - Usuario añade contexto adicional

   ⚔️ Comparativa:
   - Pregunta: "¿Con qué competidor quieres comparar?"
   - Busca información del competidor en la web
   - Lee product-marketing-context.md para ventajas de Easymailing
   - Presenta comparación inicial
   - Usuario complementa

   📰 Tendencia:
   - Pregunta: "¿Qué tendencia o tema del sector?"
   - Busca información en la web
   - Usuario puede añadir links
   - Conecta con Easymailing

   💡 Tips y trucos:
   - Pregunta: "¿Tema específico o quieres sugerencias?"
   - Si sugerencias: propone tips basados en features
   - Usuario elige/refina

   🎄 Estacional:
   - Pregunta: "¿Qué fecha o evento? (Black Friday, Navidad, etc.)"
   - Propone ángulos y enfoques
   - Usuario elige/ajusta

3. Discusión interactiva (preguntas una a una):
   - "¿Qué es exactamente y cómo funciona?"
   - "¿Qué problema/frustración resolvía antes?"
   - "¿Qué beneficio concreto obtiene el usuario?"
   - "¿Cuál es el caso de uso principal?"
   - "¿Nos diferencia de la competencia? ¿Cómo?"
   - Acordar narrativa: "Este contenido se centra en..."

4. Crear master-brief.md

5. Generar artículo con SEO metatags

6. Guardar en Obsidian: Areas/Easymailing/Comunicacion/Blog/{slug}/

7. Crear en Storyblok como borrador (content-blog-article)

8. Preguntar: ¿Distribuir en redes?
   [ ] Twitter
   [ ] LinkedIn
   [ ] Facebook
   [ ] Teasers
   [ ] Slack
```

### 🔌 Integración

```
1. Preguntar: "¿Qué integración quieres crear?"

2. Obtener de Storyblok:
   - Categorías (integration-category)
   - Casos de uso (integration-use-case)

3. Recopilar campos:
   - Título
   - Excerpt
   - Descripción
   - Enlace "Probar"
   - Enlaces de interés
   - Categorías (selección múltiple)
   - Casos de uso (selección múltiple)
   - Plan disponible

4. Guardar en Obsidian: Areas/Easymailing/Comunicacion/Integraciones/{slug}/

5. Crear en Storyblok como borrador (content-integration)

6. Preguntar: ¿Distribuir en redes?
   [ ] Twitter
   [ ] LinkedIn
   [ ] Facebook
   [ ] Teasers
   [ ] Slack
```

### 📦 Página de producto

```
1. Preguntar tipo:
   - Funcionalidad (ej: automatizaciones)
   - Solución (ej: email marketing para ecommerce)
   - Otro

2. Preguntar: "¿Qué funcionalidad/solución?"

3. Obtener de Storyblok:
   - Componentes disponibles
   - 2-3 páginas existentes como referencia

4. Discusión interactiva

5. Proponer estructura:
   - Componentes y orden
   - Textos (headlines, descripciones, CTAs, bullets)
   - SEO metatags

6. Guardar en Obsidian: Areas/Easymailing/Comunicacion/Paginas-Producto/{slug}/

7. Crear en Storyblok como borrador (content-static-page)

8. Preguntar: ¿Distribuir en redes?
   [ ] Twitter
   [ ] LinkedIn
   [ ] Facebook
   [ ] Teasers
   [ ] Slack
```

### 📧 Newsletter

```
1. Listar contenidos recientes de Obsidian:
   - Blogs recientes
   - Integraciones recientes
   - Páginas de producto recientes

2. Usuario selecciona cuáles incluir

3. Discusión:
   - ¿Añadir algo más? (texto libre, anuncios)
   - ¿Enfoque general?
   - ¿CTA principal?

4. Generar newsletter:
   - Asunto A/B
   - Preview text A/B
   - Contenido con enlaces a los contenidos seleccionados
   - CTAs diferenciados (usuarios existentes / nuevos)

5. Guardar en Obsidian: Areas/Easymailing/Comunicacion/Newsletters/{fecha}-{slug}/
```

## Documento maestro (master-brief.md)

Se genera para Blog después de la discusión interactiva:

```markdown
# {Motivo} - {Título} - Master Brief

## Metadata
- Fecha: YYYY-MM-DD
- Motivo: [Release/Feature spotlight/Tutorial/etc.]
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

## Estrategia de comunicación
- **Ganchos:** Frases clave, ángulo emocional
- **Palabras a usar:** [...]
- **Palabras a evitar:** [...]
- **Call to action:** ¿Qué queremos que haga el usuario?

## Notas adicionales
[Si aplica: deployment, timing, contexto especial]
```

## Formato Blog

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

### Componentes de Blog

Los blogs pueden incluir componentes especiales:

#### CTA Block
```markdown
{% cta %}
claim: "{Frase que engancha o promete valor}"
button_text: "{Texto del botón - corto y accionable}"
button_url: "{URL destino}"
{% endcta %}
```

#### FAQs
```markdown
{% faqs %}
- question: "{Pregunta}"
  answer: "{Respuesta concisa}"
{% endfaqs %}
```

#### Checklist
```markdown
{% checklist title="{Título opcional}" %}
- {Item 1}
- {Item 2}
{% endchecklist %}
```

#### Integration List
```markdown
{% integrations %}
- name: "{Nombre}"
  url: "{URL a la integración}"
{% endintegrations %}
```

#### Promo Card
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

## Formato Newsletter

Las newsletters SIEMPRE incluyen variantes A/B:

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

## Integración con skills de marketing

La skill delega la generación de contenido a skills existentes:

| Canal | Skill de marketing | Descripción |
|-------|-------------------|-------------|
| Blog | `copywriting` | Artículo narrativo con estructura y CTAs |
| Twitter | `social-content` | Posts o hilos según contenido |
| LinkedIn | `social-content` | Tono profesional |
| Facebook | `social-content` | Tono intermedio |
| Teasers | `social-content` | Frases cortas que generan curiosidad |
| Slack | (sin skill) | Resumen ejecutivo interno |
| Newsletter | `email-sequence` | Email personal y directo |

### Skills de apoyo

| Skill | Uso |
|-------|-----|
| `copy-editing` | Revisión y pulido final |
| `marketing-psychology` | Ganchos y ángulos emocionales |
| `launch-strategy` | Para releases importantes |
| `competitor-alternatives` | Para comparativas |

## Flujo de distribución (común)

Después de crear cualquier contenido web (Blog, Integración, Página de producto):

```
¿Distribuir en redes?

[ ] 🐦 Twitter - Posts o hilo
[ ] 💼 LinkedIn - Post profesional
[ ] 📘 Facebook - Post intermedio
[ ] 🎯 Teasers - Adelantos
[ ] 📢 Slack - Resumen interno

Para cada seleccionado:
1. Generar contenido adaptado
2. Mostrar y validar
3. Guardar junto al contenido principal
```

## Estructura en Obsidian

```
Areas/Easymailing/Comunicacion/
├── Blog/
│   └── {slug}/
│       ├── article.md
│       └── social/
│           ├── twitter.md
│           ├── linkedin.md
│           └── ...
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

## Storyblok content types

| Tipo | Content type |
|------|--------------|
| Blog | `content-blog-article` |
| Integración | `content-integration` |
| Página de producto | `content-static-page` |

## Cambios respecto a v1

| Antes | Ahora |
|-------|-------|
| 9 tipos en menú principal | 4 tipos claros |
| Blog como canal derivado | Blog como contenido principal |
| Newsletter como derivado | Newsletter independiente que agrupa contenidos |
| Distribución solo para algunos | Distribución opcional para todo contenido web |
| Blog no iba a Storyblok | Blog va a Storyblok |
| Flujos divergentes | Flujos consistentes |

## Archivos a modificar

1. `marketing-content/marketing-content.md` - Reescribir completamente
2. `marketing-content/README.md` - Actualizar documentación
3. `CHANGELOG.md` - Documentar cambio de versión
