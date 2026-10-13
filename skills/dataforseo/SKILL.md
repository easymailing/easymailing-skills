---
name: dataforseo
description: Datos SEO de DataForSEO por línea de comandos — volumen y dificultad de keywords, backlinks, SERP, competidores, tendencias, auditorías técnicas y visibilidad en LLMs. Usar cuando pidan keyword research, volumen de búsqueda, backlinks, competencia SEO, link gap, SERP, Google Trends, lighthouse/auditoría on-page, whois o menciones en ChatGPT/Gemini/Perplexity.
---

# DataForSEO — SEO Research CLI

Invocación (desde esta carpeta, `$SKILL_DIR` = directorio de la skill): `node $SKILL_DIR/dist/index.js <comando>`; en los ejemplos de abajo `dataforseo` equivale a eso. Primera vez: `cd $SKILL_DIR && npm install && npm run build`.
Las peticiones van por `em-api dataforseo` (credencial gestionada por em-api; no hay que configurar tokens). En OpenClaw, ejecuta los comandos mediante `gateway_exec`. Detalles de cron y Mission Control: `references/openclaw.md`.

**Cuesta dinero:** DataForSEO cobra por petición. Agrupa keywords en una sola llamada, usa la caché y pide el sí de Sergio antes de lanzar lotes grandes (`llm-coverage`, `llm-sov-cross`, `backlink-list` amplios).

CLI tool for accessing DataForSEO APIs. Returns TSV by default (token-efficient). Results cached 7 days.

## Defaults

- **Location:** Spain (2724)
- **Language:** Spanish (es)
- Override with `-l <code>` and `--language <code>`
- Use `dataforseo locations <search>` and `dataforseo languages <search>` to find codes

## Quick Reference

| User asks for | Command |
|---|---|
| Search volume for keywords | `dataforseo volume "kw1" "kw2"` |
| Related keywords | `dataforseo related "seed keyword"` |
| Keyword ideas | `dataforseo ideas "kw1" "kw2"` |
| Search intent | `dataforseo intent "kw1" "kw2"` |
| Keyword difficulty | `dataforseo difficulty "kw1" "kw2"` |
| Historical volume | `dataforseo history "kw1" "kw2"` |
| Keywords a domain ranks for | `dataforseo competitor domain.com` |
| Who competes for keywords | `dataforseo competitors "kw1" "kw2"` |
| Domain authority overview | `dataforseo domain-rank domain.com` |
| Keyword gap between domains | `dataforseo domain-intersection d1.com d2.com` |
| Google SERP | `dataforseo serp "keyword"` |
| YouTube SERP | `dataforseo serp-youtube "keyword"` |
| Google Maps results | `dataforseo serp-maps "keyword"` |
| Google News results | `dataforseo serp-news "keyword"` |
| Backlink summary | `dataforseo backlinks domain.com` |
| List of backlinks | `dataforseo backlink-list domain.com` |
| Anchor text distribution | `dataforseo backlink-anchors domain.com` |
| Referring domains | `dataforseo referring-domains domain.com` |
| Backlink competitors | `dataforseo backlink-competitors domain.com` |
| Link gap analysis | `dataforseo link-gap d1.com d2.com` |
| Backlink history | `dataforseo backlink-history domain.com` |
| Bulk domain authority | `dataforseo bulk-ranks d1.com d2.com d3.com` |
| Lighthouse audit | `dataforseo lighthouse https://url.com` |
| On-page audit | `dataforseo page-audit https://url.com` |
| Google Trends | `dataforseo trends "kw1" "kw2"` |
| Trending now | `dataforseo trending` |
| Content mentions | `dataforseo mentions "brand name"` |
| Sentiment analysis | `dataforseo sentiment "brand name"` |
| Technology stack | `dataforseo technologies domain.com` |
| WHOIS lookup | `dataforseo whois domain.com` |
| LLM mentions detalladas | `dataforseo llm-mentions "<query>"` |
| Top dominios citados por LLMs | `dataforseo llm-top-domains "<keyword>"` |
| Top páginas citadas por LLMs | `dataforseo llm-top-pages "<keyword>"` |
| Share of Voice agregado (Google AIO) | `dataforseo llm-sov-cross --targets <file>` |
| Métricas agregadas LLM | `dataforseo llm-aggregated "<query>"` |
| Consulta directa a un LLM | `dataforseo llm-ask "<prompt>" --engine <name>` |
| Scrape UI ChatGPT/Gemini | `dataforseo llm-scrape "<kw>" --engine <name>` |
| Volumen búsqueda AI | `dataforseo ai-volume "<kw1>" "<kw2>"` |
| Coverage multi-LLM | `dataforseo llm-coverage <prompts-file> --brands <list>` |
| Google Reviews (async) | `dataforseo reviews "business name"` |
| Google Shopping (async) | `dataforseo shopping "product"` |
| API status / balance | `dataforseo status` |

## Common Options

| Option | Description | Default |
|---|---|---|
| `-l, --location <code>` | Location code | 2724 (Spain) |
| `--language <code>` | Language code | es |
| `-n, --limit <n>` | Max results | 50 |
| `--json` | Output as JSON | |
| `--table` | Output as aligned table | |
| `--no-cache` | Skip cache, force fresh data | |
| `--print-cache` | Show cached entries | |

## Output Formats

- **TSV** (default) — tab-separated, most token-efficient for agents
- **JSON** (`--json`) — structured data, useful for piping
- **Table** (`--table`) — human-readable aligned table

### Contrato de `llm-coverage`

`llm-coverage` no convierte respuestas ausentes en cero. Cada celda prompt/engine es `observed` o `N/D`; cero menciones solo significa que hubo una respuesta observada sin la marca. La cobertura se expresa como `mentions / observed`, nunca sobre prompts solicitados que no respondieron.

Todos los formatos (TSV, JSON, table y Markdown con `--out`) incluyen el mismo metadata: `status`, `requested_prompt_counts`, `observed_prompt_counts`, `failure_count`, `failures`, coste y `machine_summary`. Los estados son:

- `success`: todas las celdas solicitadas fueron observadas.
- `partial`: al menos una celda fue observada y al menos una quedo `N/D`; exit code 0.
- `failed`: no hubo ninguna celda observada o se produjo un fallo fatal de input, auth o categoria desconocida; exit code distinto de 0.

Cada engine se prueba una vez con el primer prompt y cache desactivada. Solo un error determinista especifico del field y engine abre el circuito de ese engine; por ejemplo, el `status_code` observado `40501` para `model_name`. El field documentado no se elimina. Fallos transitorios usan retries acotados; fallos fatales abortan.

La línea `DATAFORSEO_LLM_COVERAGE_SUMMARY` resume el resultado para automatizaciones (cron de OpenClaw/Mission Control: ver `references/openclaw.md`).

No ejecutar probes de pago para validar cambios de formato o control de flujo; usar los tests con transporte inyectado.

## Cache

- Location: `~/.cache/dataforseo/cache.json`
- TTL: 7 days
- `volume` caches per keyword individually
- `related` and `competitor` cross-populate the volume cache
- Use `--no-cache` to force fresh data
- Use `dataforseo --print-cache` to inspect

## Cost Tips

- `volume` makes 2 API calls (search_volume + bulk_difficulty) — batch keywords to save
- `backlinks`, `onpage`, `domain` commands don't need location/language
- `reviews` and `shopping` are async — they create tasks, not instant results
- Cache saves repeated calls for 7 days

## See Also

- `references/use-cases.md` — recipes for common SEO workflows
