---
name: easymailing-kb
description: "Busca en la documentación pública de Easymailing (help center, blog, API pública, integraciones, precios, legal) y es la fuente de verdad para afirmar qué existe o está documentado. Usar cuando pregunten cómo se usa Easymailing, qué incluye un plan, si hay integración con X, qué dice la política de privacidad, o antes de validar claims comerciales o legales. Para datos internos de cuentas usa easymailing-admin-api."
---

# Easymailing Knowledge Base

Busqueda semantica sobre todo el contenido publico de Easymailing indexado en un Vector Store de OpenAI. Fuente principal para responder preguntas sobre uso del producto con base en documentacion publica.

## Cuando usar esta skill

Usar esta skill cuando el usuario pregunta por:
- como usar Easymailing (crear campanas, importar contactos, automatizaciones, etc.)
- que hace una funcionalidad del producto
- ayuda o documentacion publica
- integraciones (Shopify, WooCommerce, Zapier, etc.)
- API publica (endpoints, comportamiento, autenticacion)
- precios y planes
- textos legales (terminos, privacidad, cookies)
- contenido del blog o guias publicas
- comparativas o explicaciones basadas en contenido publico de Easymailing

## Cuando NO usarla sola

No usar esta skill sola si:
- necesitas datos internos reales de una app, campana o cliente (usar `easymailing-admin-api`)
- necesitas logs SMTP o metricas de entrega (usar `mailerq-api`)
- necesitas interpretar problemas de entregabilidad (usar `email-deliverability`)

## Ejemplos de preguntas que activan esta skill

- "Como creo una campana en Easymailing?"
- "Como importar contactos?"
- "Como funcionan las automatizaciones?"
- "Que dice la documentacion sobre la API publica?"
- "Easymailing tiene integracion con Shopify?"
- "Que incluye cada plan?"
- "Que dice la ayuda sobre autenticar un dominio?"
- "Explicame esta funcionalidad de Easymailing"
- "Buscame articulos del blog sobre email marketing para pymes"
- "Que dice Easymailing en su politica de privacidad?"

## Contenido disponible

| Tipo | Filtro `--type` | Que contiene |
|------|-----------------|--------------|
| Help Center | `help_center` | Articulos de ayuda (Zendesk) |
| API Docs | `api_docs` | Documentacion de la API publica |
| Precios | `prices` | Planes y tarifas |
| Legal | `legal` | Terminos, privacidad, textos legales |
| Integraciones | `integrations` | Paginas de integraciones |
| Guias | `guides` | Guias de uso e industrias |
| Blog | `blog` | Posts del blog |

## Como priorizar tipos de contenido

- **Help Center** → fuente principal para uso del producto
- **API Docs** → fuente principal para preguntas tecnicas de API publica
- **Prices** → fuente principal para pricing y planes
- **Legal** → fuente principal para terminos, privacidad y cumplimiento publicado
- **Integrations** → fuente principal para conectores y compatibilidades
- **Guides / Blog** → contexto complementario, buenas practicas, comparativas, marketing

## Uso

CLI `kb` (solo lectura) vía `em-api openai-kb`; `SKILL_DIR` = carpeta de esta skill. En OpenClaw, ejecuta los comandos mediante `gateway_exec` (ver `references/openclaw.md`).

```bash
KB="node $SKILL_DIR/scripts/kb.mjs"
```

Opciones: `--type|--filtro TIPO`, `--max|--limit N` (por defecto 5), `--full|--completo`.


```bash
# Buscar en todo el contenido
$KB buscar "deliverability mejores practicas"

# Filtrar por tipo
$KB buscar "automatizaciones" --type help_center
$KB buscar "email marketing pymes" --type blog
$KB buscar "POST contacts" --type api_docs

# Limitar resultados (default: 5)
$KB buscar "precios planes" --type prices --max 3

# Ver contenido completo del mejor resultado
$KB buscar "automatizaciones" --type help_center --max 1 --full
```

## Estrategia general de busqueda

1. Detectar primero la intencion principal de la consulta
2. Empezar por la fuente mas adecuada para esa intencion
3. Si la pregunta mezcla varios temas, hacer varias busquedas por tipo en vez de una sola busqueda amplia
4. Usar `--full` cuando un resultado parezca claramente el correcto
5. Si hay varias fuentes, priorizar la mas normativa/operativa frente a la mas comercial o editorial

## Playbooks ligeros por intencion

### Soporte funcional

Usar para preguntas tipo:
- "Como hago X?"
- "Donde esta Y?"
- "Que hace esta opcion?"

Buscar primero:
- `help_center`
- `guides` si falta contexto o ejemplos

Cubrir si aplica:
- pasos principales
- requisitos previos
- limitaciones visibles en la documentacion publica
- enlace oficial

No asumir:
- comportamientos no documentados
- datos o estados de una cuenta real

### Tecnica / API

Usar para preguntas tipo:
- "Teneis API?"
- "Como funciona este endpoint?"
- "Hay webhooks?"
- "Como se autentica?"

Buscar primero:
- `api_docs`
- `help_center` si hay setup funcional relacionado
- `integrations` si la pregunta mezcla parte tecnica y ecosistema

Cubrir si aplica:
- autenticacion
- endpoints o capacidades publicas
- webhooks
- setup tecnico documentado
- limites solo si estan publicados

No asumir:
- rate limits no publicados
- capacidades internas o beta
- comportamientos no confirmados por documentacion publica

### Comercial / evaluacion

Usar para preguntas tipo:
- "Cuanto cuesta?"
- "Que incluye cada plan?"
- "Que plan necesito?"
- "Encaja con nuestro stack?"

Buscar primero:
- `prices`
- `integrations`
- `api_docs` si hay componente tecnica
- `legal` si preguntan cumplimiento
- `help_center` o `guides` para matices operativos

Cubrir si aplica:
- modelo de cobro
- funcionalidades relevantes
- integraciones
- API o webhooks
- cumplimiento publico

No asumir:
- SLA
- limites exactos no publicados
- condiciones comerciales no visibles en fuentes publicas

### Legal / compliance

Usar para preguntas tipo:
- "Cumplis RGPD?"
- "Donde tratais los datos?"
- "Que dice vuestra politica?"

Buscar primero:
- `legal`
- `help_center` si hay operativa relacionada

Cubrir si aplica:
- privacidad
- terminos
- cookies
- tratamiento de datos si esta publicado

No asumir:
- certificaciones no expresas
- compromisos contractuales no publicados

### Integraciones / ecosistema

Usar para preguntas tipo:
- "Conectais con Shopify?"
- "Que integraciones teneis?"
- "Como encaja con nuestro stack?"

Buscar primero:
- `integrations`
- `api_docs` si requiere una via tecnica
- `help_center` si hay setup operativo

Cubrir si aplica:
- integracion nativa
- via API, webhook o Zapier si esta publicada
- setup basico documentado
- enlace oficial

No asumir:
- compatibilidades indirectas no documentadas
- conectores "posibles" pero no publicados

### Consultas amplias / mixtas

Usar cuando la pregunta mezcla varios temas:
- precios + funcionalidades
- integraciones + API
- compliance + soporte
- evaluacion global de la herramienta

En este caso:
- hacer varias busquedas por tipo, no una sola busqueda amplia
- responder por bloques
- cubrir solo lo confirmado
- senalar huecos si faltan datos publicos importantes

Fuentes que mas suelen combinarse:
- `prices`
- `integrations`
- `api_docs`
- `legal`
- `help_center`
- `guides`

## Recetas por caso de uso

```bash
# Como hacer algo en el producto
$KB buscar "crear campana" --type help_center --max 5

# Documentacion tecnica de API
$KB buscar "contacts endpoint" --type api_docs --max 5

# Precios
$KB buscar "planes precios" --type prices --max 3

# Integraciones
$KB buscar "shopify" --type integrations --max 5

# Politica o legal
$KB buscar "politica privacidad" --type legal --max 3

# Consulta tecnica / API
$KB buscar "webhooks autenticacion" --type api_docs --max 5

# Consulta comercial amplia
$KB buscar "planes precios funcionalidades" --type prices --max 3
$KB buscar "integraciones" --type integrations --max 5
$KB buscar "API webhooks autenticacion" --type api_docs --max 5
$KB buscar "RGPD privacidad tratamiento datos" --type legal --max 5

# Evaluacion para un caso concreto
$KB buscar "5000 suscriptores precios" --type prices --max 3
$KB buscar "shopify" --type integrations --max 5

# Articulos del blog
$KB buscar "email marketing pymes" --type blog --max 5
$KB buscar "comparativa herramientas email" --type blog --max 5

# Guias
$KB buscar "guia automatizaciones" --type guides --max 5
$KB buscar "ecommerce email marketing" --type guides --max 5

# Contenido completo del mejor resultado
$KB buscar "automatizaciones" --type help_center --max 1 --full
```

## Resultado

Cada resultado incluye:
- **Titulo** y **URL** del contenido original
- **Tipo** de contenido
- **Score** de relevancia (0-1)
- **Snippet** con los primeros 300 caracteres del texto

Para ver el contenido completo de un resultado, usa `--full`.

## Como responder con resultados de la KB

- Sintetizar la informacion, no pegar chunks sin contexto
- Mencionar que la respuesta se basa en contenido publico/documentacion de Easymailing
- Si hay varias fuentes, combinar solo si son coherentes
- Si la documentacion publica no responde claramente, decirlo
- No inventar funcionalidades no respaldadas por resultados

## Estructura sugerida para consultas amplias

Solo cuando la pregunta sea mixta o de evaluacion. No hace falta usar esta estructura en preguntas puntuales.

- resumen breve
- bloque por tema relevante (`precios`, `funcionalidades`, `integraciones`, `API`, `cumplimiento`, etc.)
- que esta claramente confirmado y en que fuente
- que no queda claro en documentacion publica
- siguiente paso o enlace oficial mas util

## Respuesta segura

- Citar como confirmado solo lo que aparezca claramente en resultados publicos
- Si un dato esta disperso o no queda claro, decirlo en vez de inferirlo
- No asumir SLA, limites operativos, rate limits, soporte 24/7, IP dedicada, numero de usuarios, dominios o condiciones comerciales si no estan publicados
- Si falta precision, enlazar la fuente oficial mas cercana y pedir contexto adicional si ayuda a aterrizar la respuesta

## Deteccion de gaps de conocimiento

Considera que hay un gap de KB cuando ocurra cualquiera de estas senales:

- no aparecen resultados relevantes
- los resultados son ambiguos o insuficientes
- falta una dimension importante para responder bien
- la consulta parece recurrente o claramente util para soporte, onboarding o ventas y no esta bien cubierta
- la documentacion publica existente esta desactualizada, incompleta o repartida de forma poco util

## Que hacer cuando detectes un gap

No inventes la respuesta ni intentes resolver el hueco con suposiciones.

Si el gap parece real y valioso:
- responder al usuario solo con lo confirmado
- dejar claro lo que no esta bien documentado publicamente
- dejar constancia del hueco de KB (en OpenClaw, como tarea en Mission Control: ver `references/openclaw.md`)

La tarea deberia incluir, como minimo:
- pregunta original o necesidad detectada
- que buscaste y en que tipos (`help_center`, `api_docs`, `legal`, etc.)
- que faltaba exactamente
- por que ese hueco importa
- propuesta breve de siguiente paso (nuevo articulo, ampliar articulo, aclarar pricing, documentar integracion, etc.)

## Integracion con otras skills

### `easymailing-admin-api`
Usar cuando la pregunta sea sobre datos internos, cuentas reales, campanas reales, soporte operativo o estado de plataforma.

### `email-deliverability`
Usar cuando la pregunta sea sobre autenticacion, reputacion, spam, inbox placement o interpretacion de metricas de envio.

### `mailerq-api`
Usar cuando la pregunta requiera logs SMTP, errores, retries o diagnostico de infraestructura de envio.

## Notas

- Autenticación: la resuelve `em-api openai-kb` (1Password en el Mac, sentinel en OpenClaw). No uses `op read` ni expongas la credencial.
- El contenido esta en espanol.
- Los resultados son chunks de texto markdown. Un mismo articulo puede aparecer varias veces (distintos chunks).
