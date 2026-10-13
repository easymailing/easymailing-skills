# DataForSEO — Recetas por Caso de Uso

## Keyword Research para Brief de Contenido

```bash
# 1. Volumen de las keywords objetivo
dataforseo volume "email marketing" "newsletter" "automatizacion email"

# 2. Expandir con keywords relacionadas
dataforseo related "email marketing" -n 20

# 3. Ideas adicionales por categoria
dataforseo ideas "email marketing" "newsletter" -n 30

# 4. Clasificar intent
dataforseo intent "email marketing" "newsletter" "como hacer newsletter"

# 5. Dificultad para priorizar
dataforseo difficulty "email marketing" "newsletter" "automatizacion email"

# 6. Tendencia historica
dataforseo history "email marketing" "newsletter"
```

## Competitor Analysis Completo

```bash
# 1. Keywords que rankea un competidor
dataforseo competitor mailchimp.com -n 20

# 2. Overview de autoridad del dominio
dataforseo domain-rank mailchimp.com

# 3. Quienes compiten por las mismas keywords
dataforseo competitors "email marketing" "newsletter tool"

# 4. Keyword gap: que tiene el competidor que nosotros no
dataforseo domain-intersection easymailing.com mailchimp.com -n 20

# 5. Stack tecnologico
dataforseo technologies mailchimp.com
```

## Backlink Audit para Outreach

```bash
# 1. Resumen de backlinks
dataforseo backlinks easymailing.com

# 2. Lista de backlinks (uno por dominio)
dataforseo backlink-list easymailing.com --mode one_per_domain -n 30

# 3. Distribucion de anchor texts
dataforseo backlink-anchors easymailing.com -n 20

# 4. Dominios que nos enlazan
dataforseo referring-domains easymailing.com -n 20

# 5. Competidores por perfil de backlinks
dataforseo backlink-competitors easymailing.com -n 10

# 6. Link gap: dominios que enlazan a competidores pero no a nosotros
dataforseo link-gap mailchimp.com easymailing.com -n 20

# 7. Autoridad de dominios candidatos a outreach
dataforseo bulk-ranks target1.com target2.com target3.com
```

## Technical SEO Audit

```bash
# 1. Lighthouse (performance, accessibility, best practices, SEO)
dataforseo lighthouse https://easymailing.com

# 2. Analisis on-page (title, h1, word count, links)
dataforseo page-audit https://easymailing.com

# 3. Auditar paginas clave
dataforseo page-audit https://easymailing.com/features
dataforseo page-audit https://easymailing.com/pricing
```

## Keyword Gap Analysis

```bash
# Comparar 2-3 dominios
dataforseo domain-intersection easymailing.com mailchimp.com -n 30

# Ver que rankea cada uno por separado
dataforseo competitor easymailing.com -n 15
dataforseo competitor mailchimp.com -n 15

# Comparar autoridad
dataforseo bulk-ranks easymailing.com mailchimp.com sendinblue.com
```

## Trend Monitoring

```bash
# Google Trends para keywords del sector
dataforseo trends "email marketing" "marketing automation" "newsletter"

# Tendencias actuales
dataforseo trending

# Volumen historico mensual
dataforseo history "email marketing" "newsletter"
```

## LLM Visibility Tracking

### Share of Voice agregado (1 call, sólido en ES con 2.5M responses)

```bash
# 1. Preparar targets.md con las brands a comparar
cat > /tmp/targets.md <<EOF
| key | keyword_or_domain | type |
|---|---|---|
| easymailing | easymailing | keyword |
| mailchimp | mailchimp | keyword |
| mailerlite | mailerlite | keyword |
| brevo | brevo | keyword |
| acumbamail | acumbamail | keyword |
EOF

dataforseo llm-sov-cross --targets /tmp/targets.md \
  --out "${SEO_VAULT:-./seo}"/reportes/2026-W20-research-llm-mentions.md
```

### Dominios y páginas que LLMs citan (input link-building)

```bash
dataforseo llm-top-domains "email marketing" \
  --out "${SEO_VAULT:-./seo}"/research/dominios-citados-llms.md

dataforseo llm-top-pages "email marketing" --items-limit 20 --table
```

### Coverage real de los 4 LLMs en español

```bash
dataforseo llm-coverage \
  "${SEO_VAULT:-./seo}"/estrategia_seo/prompts-geo-objetivo.md \
  --brands "easymailing,mailchimp,mailerlite,brevo,acumbamail" \
  --engines chatgpt,claude,gemini,perplexity \
  --yes --out /tmp/coverage.md
```

Interpretacion del informe:

- `observed` indica que el engine devolvio una respuesta para esa celda.
- `N/D` indica que no existe respuesta; no equivale a cero menciones.
- `0 / N` significa cero menciones en `N` respuestas observadas.
- `requested_prompt_counts` y `observed_prompt_counts` permiten auditar el denominador por engine.
- `status: success` requiere todas las celdas; `partial` combina celdas observadas y ausentes; `failed` significa cero observadas o un fallo fatal.

`partial` mantiene exit code 0 para conservar el artefacto util; `failed` usa exit code distinto de 0. Los detalles de fallo incluyen fase (`probe` o `cell`), categoria, intentos, HTTP status, `dataforseo_status_code`, field, engine y modelo.

Para automatizar con cron (OpenClaw / Mission Control), ver `references/openclaw.md`.

### Inspección detallada

```bash
# Qué dice Google AIO sobre nuestra keyword
dataforseo llm-mentions "alternativas a mailchimp"

# Cómo responde directamente cada LLM
dataforseo llm-ask "qué herramienta de email marketing recomiendas para PYMES" --engine chatgpt
dataforseo llm-ask "qué herramienta de email marketing recomiendas para PYMES" --engine perplexity

# Métricas agregadas en todas las dimensiones
dataforseo llm-aggregated "easymailing" --table

# UI real de ChatGPT en modo búsqueda
dataforseo llm-scrape "alternativas a mailchimp" --engine chatgpt --force-web-search
```

### Volumen AI-search para priorizar prompts

```bash
dataforseo ai-volume "email marketing" "newsletter" "automatizacion email" "marketing automation"
```

**Coste típico semanal del cron**: 1 sov-cross + 1 top-domains + 1 top-pages + 30 prompts × 4 engines en coverage ≈ $5/semana ≈ $20/mes.

## Multi-Keyword Batch Analysis

```bash
# Batch de keywords del plan SEO
dataforseo volume "email marketing" "newsletter tool" "automatizacion email" "campanas email" "email marketing gratis"

# Exportar como JSON para procesamiento
dataforseo volume "email marketing" "newsletter tool" "automatizacion email" --json

# Intent de todas
dataforseo intent "email marketing" "newsletter tool" "automatizacion email" "campanas email"
```

## SERP Analysis

```bash
# Quien domina las SERPs para nuestras keywords
dataforseo serp "email marketing"
dataforseo serp "newsletter tool"

# YouTube — oportunidades de video
dataforseo serp-youtube "como hacer email marketing"

# Google News — cobertura mediatica
dataforseo serp-news "email marketing"

# Google Maps — negocios locales
dataforseo serp-maps "agencia email marketing madrid"
```
