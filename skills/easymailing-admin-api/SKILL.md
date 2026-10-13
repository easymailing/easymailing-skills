---
name: easymailing-admin-api
description: "Consulta la Admin API interna de Easymailing: dashboard de plataforma, delivery servers y scores, IP blocks, salud/métricas/issues de una app, campañas, sender domains, onboarding, signups, postmaster y búsqueda de cliente por email. Usar cuando pidan datos internos reales de cuentas o plataforma («busca esta cuenta», «cómo está la salud de esta app», «hay IP blocks en Microsoft», «mensajes postmaster sin leer»). Para interpretar métricas combínala con email-deliverability."
---

# Easymailing Admin API

API REST interna para monitoreo y gestion de la plataforma.

## Cuando usar esta skill

Usar esta skill cuando necesites datos internos de Easymailing sobre:
- dashboard global de plataforma
- delivery servers e historial de score
- IP blocks por proveedor o blocklist
- salud, metricas e issues de una app
- campanas, audiencias y sender domains
- onboarding y signups
- actividad reciente de una cuenta
- customer lookup para soporte por email
- mensajes postmaster / abuse

## Cuando NO usarla sola

No usar esta skill sola si:
- el usuario necesita interpretacion de deliverability (usar `email-deliverability`)
- el usuario necesita logs SMTP, retries o stats de MailerQ (usar `mailerq-api`)
- el usuario pregunta por uso funcional del producto o documentacion publica (usar `easymailing-kb`)

## Ejemplos de preguntas que activan esta skill

- "Buscame esta cuenta por email para soporte"
- "Como esta la salud de esta app?"
- "Que issues tiene esta cuenta?"
- "Sacame las campanas enviadas esta semana"
- "Quiero ver el detalle de esta campana"
- "Hay IP blocks activos en Microsoft?"
- "Que sender domains tiene este cliente?"
- "Hay mensajes postmaster sin leer?"
- "Como va el onboarding de esta app?"
- "Que signups recientes hemos tenido?"
- "Dame el dashboard de plataforma"

## Uso

Credencial resuelta por `em-api admin-api` (1Password en el Mac, sentinel en OpenClaw): nunca la pidas ni la imprimas. `SKILL_DIR` = carpeta de esta skill. En OpenClaw, ejecuta los comandos mediante `gateway_exec` (ver `references/openclaw.md`).

```bash
ADMIN="node $SKILL_DIR/scripts/admin.mjs"
$ADMIN list                       # todos los endpoints
$ADMIN search "campaign"          # por palabra
$ADMIN info "/api/admin/issues"   # parámetros y campos de respuesta
$ADMIN get /dashboard_stats       # GET de solo lectura (ruta relativa a /api/admin)
$ADMIN get /ip_blocks --query status=active --query provider=microsoft
```

Equivalente sin script: `em-api admin-api GET /ruta [--query k=v]`. **Consulta `info` antes de llamar a endpoints que no conozcas**: la spec se cachea 1 hora (`ADMIN_API_CACHE` para cambiar el fichero).

**Cuidado**: `GET /signups` es muy lento (~36 s por página, y puede dar 502); úsalo solo si no hay alternativa, una página cada vez.

## Mapa de areas de la API

Referencia rapida de las areas disponibles. Para endpoints y parametros exactos, usar `$ADMIN info`.

| Area | Que cubre | Keywords para buscar |
|---|---|---|
| **Plataforma** | Dashboard stats, issues globales | `dashboard`, `issues` |
| **Delivery infrastructure** | Servidores de envio, scores, historial | `delivery-servers`, `scores` |
| **IP blocks y reputacion** | Bloqueos por proveedor/blocklist, delist, refresh auth | `ip_blocks` |
| **Soporte / customer lookup** | Buscar cliente por email | `support_customers` |
| **Apps** | Health, metricas, issues, actividad, onboarding, audiences, sender domains, affiliates | `apps`, `health`, `metrics`, `onboarding` |
| **Campaigns** | Listado, detalle, pending validation | `campaigns` |
| **Postmaster** | Mensajes abuse/postmaster, read/unread | `postmaster` |
| **Signups** | Registros recientes | `signups` |

## Formato de respuesta (Hydra JSON-LD)

Los endpoints de lista devuelven formato Hydra. Los items estan en `hydra:member`, **no** en la raiz:

```json
{
  "@context": "...",
  "@id": "...",
  "@type": "hydra:Collection",
  "hydra:totalItems": 44,
  "hydra:member": [ ... items aqui ... ]
}
```

Para extraer items con jq: `.["hydra:member"]`, **nunca** `.[]`.

Excepciones: algunos endpoints pueden devolver arrays JSON simples o un objeto raiz directo (ej. dashboard_stats, health). Si `hydra:member` no existe, tratar la respuesta como JSON normal:

```bash
# Patron seguro para ambos casos
jq 'if has("hydra:member") then .["hydra:member"] else . end'
```

## Paginacion

Los endpoints de lista soportan `?page=N` (default: 1). Respuestas Hydra con `hydra:totalItems` y `hydra:view` para navegacion.

## Filtros y parametros importantes

| Area | Parametros | Notas |
|---|---|---|
| **Campaigns** | `status`, `from`, `to`, `page` | `from`/`to` en formato YYYY-MM-DD |
| **Issues** | `type`, `status`, `page` | `status`: open, resolved, etc. |
| **IP blocks** | `ip`, `provider`, `status`, `page` | `provider`: microsoft, gmail, yahoo, spamhaus... |
| **Postmaster** | `status`, `sender`, `subject`, `page`, `itemsPerPage` | `status`: unread, read |
| **Support customer** | `email` | Obligatorio |
| **App metrics** | `months` | Default 12 |

Para parametros exactos de cualquier endpoint, usar `$ADMIN info "/api/admin/..."`.

## Recetas operativas

Rutas relativas a `/api/admin`; las listas devuelven Hydra (`hydra:member`).

```bash
$ADMIN get /dashboard_stats                                   # dashboard global
$ADMIN get /support_customers --query email=cliente@dominio.com
APP=123
$ADMIN get /apps/$APP/health
$ADMIN get /apps/$APP/metrics --query months=12
$ADMIN get /apps/$APP/issues --query status=open
$ADMIN get /apps/$APP/campaigns --query from=2026-03-01 --query to=2026-03-11 --query page=1
$ADMIN get /apps/$APP/campaigns/456                           # detalle de campaña
$ADMIN get /apps/$APP/sender_domains --query page=1
$ADMIN get /ip_blocks --query status=active --query page=1
$ADMIN get /ip_blocks --query provider=microsoft --query status=active
$ADMIN get /postmaster_messages --query status=unread --query itemsPerPage=50
```

## Acciones que modifican estado

Los siguientes endpoints NO son de solo lectura. **Solo con el sí explícito de Sergio (en OpenClaw, tras approval)**. El script `admin` no los expone; se lanzan a mano con `em-api admin-api PATCH /ip_blocks/{id}/resolve`.

### IP blocks
- `PATCH .../ip_blocks/{id}/refresh_auth` — refrescar autenticacion
- `PATCH .../ip_blocks/{id}/request_delist` — solicitar delist
- `PATCH .../ip_blocks/{id}/resolve` — marcar como resuelto

### Postmaster messages
- `PATCH .../postmaster_messages/{id}/read` — marcar como leido
- `PATCH .../postmaster_messages/{id}/unread` — marcar como no leido
- `DELETE .../postmaster_messages/{id}` — eliminar mensaje

Regla: GET = seguro. PATCH/DELETE = accion operativa.

## Integracion con otras skills

### `mailerq-api`
Usar para: logs SMTP, accepted/errors/timeouts, retries, stats por dominio/IP/cliente, codigos 4xx/5xx.

Usar esta skill para: contexto interno de app/campana/soporte, health de cuenta, sender domains, issues de plataforma, customer lookup, postmaster messages, IP blocks gestionados.

### `email-deliverability`
Usar despues de esta skill cuando haga falta interpretar:
- que significa una subida de bounce rate
- si un problema es de reputacion, autenticacion o lista
- como explicar una incidencia al cliente

### `easymailing-kb`
Usar para: documentacion publica, help center, guias de uso del producto, pricing y contenido publico.

## Interpretacion de metricas historicas

### /apps/{id}/metrics — tendencias mensuales

Cada registro tiene: `period`, `sent`, `opens`, `clicks`, `bounces`, `unsubscriptions`, `complaints`, `open_rate`, `click_rate`, `bounce_rate`, `unsubscribe_rate`, `complaint_rate`.

Umbrales de referencia:

| Metrica | Normal | Preocupante | Critico |
|---|---|---|---|
| `bounce_rate` | < 3% | 3-5% | > 5% |
| `complaint_rate` | < 0,05% | 0,05-0,08% | > 0,1% |
| `open_rate` | > 20% | 10-20% | < 10% |

Como leer tendencias:
- Comparar ultimos 3-6 meses, no solo el mes actual
- Spike puntual con historico limpio → probablemente problema de infra, no del cliente
- Deterioro gradual mes a mes → problema real del cliente (lista envejecida, engagement muerto)
- Meses sin actividad (gaps) → cliente irregular, tratar con cautela

### /apps/{id}/campaigns — campanas individuales

Cada campana tiene stats con: `score` (0-100), `delivered_rate`, `open_rate`, `click_rate`, `bounce_rate`, `complaint_rate`, `started_at`, `finished_at`.

Interpretacion del score:
- > 90: campana excelente
- 70-90: aceptable
- < 70: problemas — investigar `bounce_rate` y `complaint_rate` de esa campana
- Score bajo en UNA campana con el resto bien → problema puntual (segmento malo, contenido)
- Score bajo en TODAS → problema sistemico del cliente

### Mapeo tag MailerQ → app_id Admin API

El tag de MailerQ (ej: `sportbetec.easymailing.com`) no contiene el `app_id`. Para obtenerlo:

```bash
# En MailerQ API (skill mailerq-api)
GET /logs?tag=CLIENTE&limit=1
# → campo app_id del registro
```

Con ese `app_id` puedes consultar todos los endpoints `/apps/{id}/...` de esta API.
