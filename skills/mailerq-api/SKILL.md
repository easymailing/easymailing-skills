---
name: mailerq-api
description: "Diagnostica la infraestructura de envío de Easymailing con la API de MailerQ: tasas de entrega, bounces, bloqueos de IP, throttling, logs de envío, clientes que envían y pausas. Usar cuando pregunten por mailerq, delivery stats, bounce rate, IP bloqueada, throttling de Gmail o Microsoft, logs SMTP, entregabilidad, clientes enviando o health check de envío."
---

# MailerQ API — Diagnostico operativo

REST API que monitoriza la infraestructura de envio de Easymailing. Parsea los logs de MailerQ, los almacena en SQLite y expone endpoints para estadisticas, busqueda de logs y alertas. Tambien proxea el API nativo de MailerQ para gestionar pausas, errores y supresiones.

## Que preguntas responde esta skill

- ¿Hay una degradacion real o un falso positivo?
- ¿Gmail esta throttling o solo hay buzones llenos?
- ¿Microsoft esta bloqueando IPs por reputacion?
- ¿Que cliente esta causando el problema?
- ¿Cuanto volumen real esta afectado?
- ¿Es problema de primer intento o de reintentos acumulados?
- ¿La incidencia esta en un proveedor grande o en dominios corporativos?
- ¿Necesito escalar o es ruido?

## Acceso al API

- **Host:** `mailerq.emdlv.net:3100` — **DB:** ~115K registros, retencion 30 dias — **IPs de envio:** 245 en rango 193.3.232.x

### Autenticacion

Todo pasa por `em-api mailerq` (token `Bearer` resuelto solo, nunca lo manejes). El API real está en `https://bridge-agents.easymailing.com/mailerq-api`: un puente que depende del Mac Mini (túnel SSH + ngrok). Si falla con 502/503/504 o sin conexión, `mq` imprime «El puente de MailerQ en el Mac Mini no responde» y sale con 1: avisa a Sergio, no reintentes en bucle.

CLI de lectura (desde la raíz del repo; en OpenClaw, ejecuta los comandos mediante `gateway_exec`):

```bash
node skills/mailerq-api/scripts/mq.mjs check                 # salud del puente y del API
node skills/mailerq-api/scripts/mq.mjs stats [resumen|dominio|ip|tag|diagnostico|ip-dominio|ip-dominio-codigo|cliente-proveedor|campana] --horas 6 --dominio gmail.com
node skills/mailerq-api/scripts/mq.mjs clientes --horas 24
node skills/mailerq-api/scripts/mq.mjs logs --dominio gmail.com --resultado error --codigo 421 --limite 30
node skills/mailerq-api/scripts/mq.mjs alertas bloqueadas|throttled|salud|regresiones --horas 6
node skills/mailerq-api/scripts/mq.mjs intentos <envelope>   # traza de un mensaje
```

Lo que `mq` no cubra se lee con `em-api mailerq GET "<ruta>"`; las recetas de abajo usan esa forma. Salida JSON: filtra con `jq`.

### Autodescubrimiento

```bash
em-api mailerq GET /api-docs | jq .                    # Lista de endpoints (también: mq docs)
em-api mailerq GET /api-docs/{operationId} | jq .      # Detalle de un endpoint (mq docs <operationId>)
```

**Si no recuerdas los parametros de un endpoint, consulta `/api-docs/{operationId}`** en lugar de adivinar.

### Tags y clientes

Los tags identifican el tipo de envio, el cliente y la campana. En `/tags` y `/tags/clients` vienen parseados. En `/logs` el campo `tags` es un JSON string que hay que parsear con `fromjson` en jq.

#### Formato del tag en logs

```
tags: "[\"customer-campaign\",\"motorsan.easymailing.com\",\"Audi Days Marzo2026\"]"
       ^tipo de envio         ^cliente (subdominio)         ^nombre de campana
```

Extraer datos del tag en resultados de `/logs`:

```bash
jq '.tags | fromjson | .[1]'                                           # Extraer el cliente
jq '.tags | fromjson | .[1] | select(endswith(".easymailing.com"))'    # Solo clientes reales
```

#### Tipos de envio

| Tipo | Que es |
|---|---|
| `customer-campaign` | Campana de un cliente |
| `customer-test-campaign` | Envio de prueba |
| `customer-transactional` | Email transaccional (confirmacion, etc.) |
| `customer-automation-campaign` | Campana automatizada |
| `admin-transactional` | Email del sistema (no tiene subdominio en tag[1], tiene el subject) |

### Endpoints

#### Tags y clientes

| Endpoint | Que devuelve |
|---|---|
| `GET /tags?hours=24` | Cada combinacion tipo+cliente+campana con `{type, client, campaign, total, last_seen}` |
| `GET /tags/clients?hours=24` | Clientes unicos con `{client, total, accepted, errors, timeouts, success_rate, campaigns}` |

`/tags/clients` es el punto de entrada para saber que clientes estan enviando y como les va.

#### Estadisticas (`hours` por defecto 24 en todos)

| Endpoint | Que devuelve |
|---|---|
| `GET /stats/summary?hours=24` | Totales globales: `total`, `accepted`, `errors`, `timeouts`, `lost`, `unique_messages`, `first_attempt_errors`, `retry_events`, `success_rate` |
| `GET /stats/by-domain?hours=24` | Top 50 dominios destino con `lost`. Con `&domain=gmail.com`: solo ese dominio |
| `GET /stats/by-ip?hours=24` | Top 50 IPs con `lost`, `unique_messages`, `retry_events`, `success_rate` |
| `GET /stats/by-tag?hours=24` | Sin tag: top 20 clientes con desglose. Con `&tag=cliente.easymailing.com`: stats de ese cliente |
| `GET /stats/diagnostics?hours=24` | Por dominio: desglose por clase de error (`mailbox_full`, `throttled`, `blocked`, `invalid_recipient`, `policy`, `connect_failures`, `other_errors`) + `first_attempt_errors`, `retry_events`. Filtros: `&tag=`, `&ip=` |
| `GET /stats/by-ip-domain?hours=24` | Matriz IP × dominio con totales y success_rate. Filtros: `&tag=`, `&ip=`, `&domain=` |
| `GET /stats/by-ip-domain-code?hours=24` | Drill-down: IP × dominio × codigo SMTP con `error_class`. Filtros: `&ip=`, `&domain=`, `&tag=` |
| `GET /stats/by-client-provider?hours=24` | Matriz cliente × proveedor (gmail, microsoft, yahoo, apple, other). Filtros: `&tag=` |
| `GET /stats/by-campaign?hours=24` | Stats por campana: `unique_messages`, `total_events`, `retry_events`, `delivery_rate`. Filtros: `&app_id=`, `&tag=` |

#### Logs

| Endpoint | Que devuelve |
|---|---|
| `GET /logs?recipient=&domain=&source_ip=&result=&code=&tag=&limit=100&offset=0` | Busqueda con 6 filtros combinables |
| `GET /logs/recent?minutes=30` | Ultimos N minutos (max 200) |

Filtros: `recipient` (LIKE), `domain` (exacto), `source_ip` (exacto), `result` (accepted/error/timeout), `code` (SMTP), `tag` (LIKE en JSON string).

Campos de cada log: `id`, `timestamp`, `state`, `result`, `attempt`, `envelope`, `recipient`, `recipient_domain`, `source_ip`, `dest_ip`, `tags` (JSON string), `code`, `status`, `description`, `msg_type`, `app_id`, `campaign_id`, `contact_id`, `mta`, `is_retry`.

**El campo temporal es `timestamp`** (momento del evento en MailerQ), no `created_at`.

#### Mensajes (nivel mensaje vs nivel evento)

| Endpoint | Que devuelve |
|---|---|
| `GET /messages?hours=24` | Mensajes unicos (envelope+recipient) con `attempts`, `final_result` (delivered/failed/timeout), `first_attempt_at`, `last_attempt_at`. Filtros: `&tag=`, `&ip=`, `&domain=`, `&msg_type=`, `&app_id=`, `&campaign_id=`, `&result=`, `&limit=50` |
| `GET /messages/:envelope/attempts` | Traza completa de intentos de un mensaje: cada `attempt` con `timestamp`, `result`, `code`, `description` |

`/messages` agrupa eventos por mensaje unico — a diferencia de `/logs` que muestra cada evento individual. Usar para entender delivery rate real (sin inflacion por retries).

#### Alertas

| Endpoint | Que devuelve |
|---|---|
| `GET /alerts/blocked-ips?hours=6` | IPs con >=5 errores 550, con `affected_clients` y dominios afectados |
| `GET /alerts/throttled?hours=6` | Dominios con >=3 throttlings (421/452), con first/last_seen |
| `GET /alerts/provider-health?hours=24` | Proveedores con error rate alto. Incluye desglose por clase de error y `status` (OK/WARN/CRITICAL). Params: `&threshold=20`, `&min_volume=100` |
| `GET /alerts/ip-regressions?hours=6` | IPs cuyo error rate empeoro vs baseline. Params: `&baseline_hours=48`, `&min_volume=100`, `&threshold=10` (delta minimo en pp) |

#### MailerQ proxy (gestion directa; GET = lectura, POST/DELETE = escritura solo con el sí de Sergio)

| Endpoint | Que hace |
|---|---|
| `GET /mailerq/pauses` | Ver pausas activas |
| `POST /mailerq/pauses` | Crear pausa (requiere tag, domain opcional) |
| `DELETE /mailerq/pauses` | Eliminar pausa |
| `GET /mailerq/errors` | Ver errores forzados |
| `POST /mailerq/errors` | Crear error forzado (requiere tag) |
| `DELETE /mailerq/errors` | Eliminar error forzado |
| `GET /mailerq/suppressions` | Ver direcciones suprimidas |
| `POST /mailerq/suppressions` | Crear supresion |
| `DELETE /mailerq/suppressions` | Eliminar supresion |

##### POST /mailerq/pauses

Pausa los envios de un cliente. `tag` obligatorio (subdominio del cliente). `domain` opcional para acotar a un dominio destino.

```bash
# Pausar motorsan solo hacia hotmail.com
em-api mailerq POST /mailerq/pauses --data '{"tag": "motorsan.easymailing.com", "domain": "hotmail.com"}'

# Pausar motorsan hacia todo destino
em-api mailerq POST /mailerq/pauses --data '{"tag": "motorsan.easymailing.com"}'
```

No se puede pausar sin tag (evita pausas globales accidentales).

##### POST /mailerq/errors

Fuerza un error SMTP sin intentar la entrega. Caso de uso: bloquear envios de un cliente suspendido.

```bash
em-api mailerq POST /mailerq/errors --data '{"tag": "cliente.easymailing.com", "code": 550, "extended": "5.1.1", "description": "Account suspended"}'
```

Campos: `tag` (obligatorio), `domain` (opcional), `code` (0-599, default 0), `extended`, `description`.

##### DELETE /mailerq/pauses y /mailerq/errors

Eliminar pausa o error forzado. El body identifica cual eliminar (mismo formato que el POST).

```bash
# Despausar motorsan → hotmail.com
em-api mailerq DELETE /mailerq/pauses --data '{"tag": "motorsan.easymailing.com", "domain": "hotmail.com"}'
```

## Modelo mental de interpretacion

### Consistencia de totales

`total = accepted + errors + timeouts + lost`. Si total no cuadra sumando solo accepted+errors+timeouts, revisar el campo `lost`. `lost` son mensajes que MailerQ descarto internamente (sin resultado SMTP).

### Primer intento vs retry

- Priorizar `first_attempt_errors` para alertas reales — son errores en el primer intento, sin ruido de reintentos
- Usar `retry_events` para detectar ruido: un volumen alto de retries infla las metricas de error
- `unique_messages` da el volumen real de mensajes distintos (vs `total` que cuenta cada evento/intento)
- Si un dato parece contradictorio, comparar `first_attempt_errors` vs `errors` — si la diferencia es grande, son retries
- Ejemplo: una IP con success_rate = 0 puede ser falso positivo si solo tiene retries de mailbox_full
- **No asumir que todos los eventos caen en accepted/error/timeout** — revisar `lost` cuando haya diferencias

### Volumen vs ratio

- Un 50% de error sobre 4 envios no es lo mismo que sobre 4.000
- No escalar sin volumen significativo
- Regla: si el volumen total es <50 en la ventana, tratar el ratio con escepticismo

### Niveles de analisis

| Nivel | Que responde | Endpoint tipico |
|---|---|---|
| Panorama | ¿Hay degradacion general? | `/stats/summary`, `/alerts/provider-health` |
| Diagnostico | ¿Que proveedor/dominio esta afectado? | `/stats/diagnostics`, `/stats/by-client-provider` |
| Drill-down | ¿Cual es la causa exacta? | `/stats/by-ip-domain-code`, `/logs` con filtros |
| Impacto | ¿Que clientes estan afectados? | `/alerts/blocked-ips`, `/tags/clients`, `/alerts/ip-regressions` |
| Campana | ¿Como va una campana concreta? | `/stats/by-campaign`, `/messages` |
| Traza | ¿Que paso con un mensaje? | `/messages/:envelope/attempts` |

**Anti-patron:** no usar `/logs` como fuente principal de agregacion cuando ya hay endpoints agregados.

## Taxonomia operativa de errores

| Bucket | Senales tipicas | Prioridad base | No confundir con |
|---|---|---|---|
| `mailbox_full` | 452 OverQuotaTemp, 552 OverQuotaPerm | WARN | throttling (no hay rate limit msg) |
| `throttled` | 421 + rate limit message, 450 "receiving too quickly" | WARN→CRITICAL | mailbox_full (si hay msg explicito del MBP) |
| `blocked` | 550 + block list/S3150, afecta varios dominios del mismo MBP | CRITICAL | invalid_recipient (blocked es sistemico) |
| `invalid_recipient` | 550 + NoSuchUser/unknown user | INFO→WARN | bloqueo reputacional (invalid es por destinatario) |
| `connect_failure` | timeout en state=connect, sin respuesta SMTP | WARN→CRITICAL | throttling (connect_failure es pre-SMTP) |
| `policy` | 550 + policy/compliance/authentication msg | CRITICAL | bloqueo IP (policy es por config del sender) |

Para patrones especificos por proveedor (Gmail, Microsoft, Yahoo, Apple), consultar `references/provider-patterns.md`.

## Flujo de diagnostico

```bash
```

### Paso 1 — Salud global

```bash
em-api mailerq GET "/stats/summary" | jq .
em-api mailerq GET "/alerts/provider-health?hours=6" | jq .
```

### Paso 2 — Proveedor/dominio afectado

```bash
em-api mailerq GET "/stats/diagnostics?hours=6" | jq '[.[] | select(.errors > 0)] | sort_by(-.errors) | .[:10]'
```

### Paso 3 — Bajar a IP + dominio

```bash
em-api mailerq GET "/stats/by-ip-domain?hours=6&domain=hotmail.com" | jq '[.[] | select(.success_rate < 80)]'
em-api mailerq GET "/alerts/blocked-ips" | jq .
em-api mailerq GET "/alerts/ip-regressions?hours=6" | jq .
```

### Paso 4 — Codigo y descripcion exacta

```bash
em-api mailerq GET "/stats/by-ip-domain-code?hours=6&domain=hotmail.com" | jq '.[:20]'
```

### Paso 5 — Cliente afectado

```bash
em-api mailerq GET "/stats/by-client-provider?hours=6" | jq '[.[] | select(.success_rate < 80)]'
em-api mailerq GET "/alerts/blocked-ips" | jq '.[].affected_clients | flatten | unique'
```

### Paso 6 — Conclusion operativa

Redactar usando el formato de respuesta estandar (ver seccion mas abajo).

## Anti-patrones

1. **Confundir mailbox_full con throttling** — mailbox_full no tiene msg de rate limit; throttling si.
2. **Regresiones calculadas sobre retries** — filtrar siempre por primer intento para alertas.
3. **Usar /logs para agregar** — si hay endpoint agregado, usarlo primero.
4. **Mirar solo ratio sin volumen** — 0% success sobre 3 envios no es CRITICAL.
5. **Asumir "bloqueo" por un 550** — revisar siempre la descripcion. NoSuchUser ≠ blocklist.
6. **Escalar sin impacto real** — CRITICAL requiere volumen + persistencia + clientes afectados.

## Formato de respuesta estandar

```
Estado: OK | WARN | CRITICAL
Que pasa: resumen en una linea
Evidencia: proveedor, IP, codigos, volumen, ventana temporal
Interpretacion: mailbox_full | throttled | blocked | invalid_recipient | connect_failure | policy
Impacto: clientes afectados, dominios, volumen
Accion sugerida: siguiente paso concreto
```

## Recetas practicas

### Diagnostico rapido de salud

```bash
em-api mailerq GET "/stats/summary" | jq .                          # Resumen global (incluye lost, unique_messages, first_attempt_errors, retry_events)
em-api mailerq GET "/alerts/provider-health?hours=6" | jq .         # Salud por proveedor con status
em-api mailerq GET "/alerts/blocked-ips" | jq .                     # IPs bloqueadas + clientes
em-api mailerq GET "/alerts/ip-regressions?hours=6" | jq .          # IPs con regresion
```

### Listar clientes activos

```bash
em-api mailerq GET "/tags/clients?hours=24" | jq .                                       # Todos, por volumen
em-api mailerq GET "/tags/clients?hours=24" | jq '[.[] | select(.success_rate < 90)]'    # Con problemas
```

### Diagnostico completo de un cliente

```bash
CLIENTE="motorsan.easymailing.com"
em-api mailerq GET "/stats/by-tag?tag=$CLIENTE&hours=24" | jq .                          # Stats generales
em-api mailerq GET "/stats/by-client-provider?tag=$CLIENTE&hours=24" | jq .               # Desglose por proveedor
em-api mailerq GET "/stats/diagnostics?tag=$CLIENTE&hours=24" | jq '.[:10]'               # Errores por dominio y clase
em-api mailerq GET "/stats/by-campaign?tag=$CLIENTE&hours=24" | jq .                      # Campanas con delivery_rate
em-api mailerq GET "/tags?hours=24" \
  | jq --arg c "$CLIENTE" '[.[] | select(.client == $c) | {campaign, type, sends: .total, last_seen}] | sort_by(-.sends)'
```

### IP bloqueada — investigar

```bash
IP="193.3.232.41"
em-api mailerq GET "/alerts/blocked-ips?hours=24" \
  | jq --arg ip "$IP" '[.[] | select(.source_ip == $ip)]'               # Alerta + affected_clients
em-api mailerq GET "/stats/by-ip?hours=6" \
  | jq --arg ip "$IP" '[.[] | select(.source_ip == $ip)]'               # Stats (incluye lost, unique_messages)
em-api mailerq GET "/stats/by-ip-domain?hours=6&ip=$IP" | jq .     # Desglose por dominio
em-api mailerq GET "/stats/by-ip-domain-code?hours=6&ip=$IP" | jq .  # Codigos exactos por dominio
```

### Dominios problematicos

```bash
em-api mailerq GET "/stats/diagnostics?hours=12" \
  | jq '[.[] | select(.errors > 0)] | sort_by(-.errors) | .[:15]'     # Ya incluye desglose por clase de error
```

### Correlacion IP ↔ cliente

```bash
em-api mailerq GET "/stats/by-ip-domain?hours=24&ip=193.3.232.41" | jq .       # Dominios de una IP (agregado)
em-api mailerq GET "/logs?source_ip=193.3.232.41&limit=200" \
  | jq '[.[] | .tags | fromjson | .[1] | select(endswith(".easymailing.com"))] | unique'    # Clientes de una IP
em-api mailerq GET "/logs?tag=motorsan.easymailing.com&limit=200" \
  | jq '[.[].source_ip] | unique'                                                           # IPs de un cliente
```

### Traza de un mensaje

```bash
# 1. Buscar el mensaje
em-api mailerq GET "/messages?domain=gmail.com&result=failed&tag=motorsan.easymailing.com&limit=5" | jq .
# 2. Ver todos los intentos
ENVELOPE="bounce-c-648-75-26368@em648.motorsan.com"
em-api mailerq GET "/messages/$ENVELOPE/attempts" | jq .
```

### Ciclo de vida de una pausa

```bash
# 1. Detectar IP bloqueada
em-api mailerq GET "/alerts/blocked-ips" | jq .
# 2. Pausar cliente+dominio afectado
em-api mailerq POST /mailerq/pauses --data '{"tag": "motorsan.easymailing.com", "domain": "hotmail.com"}'
# 3. Verificar pausa activa
em-api mailerq GET "/mailerq/pauses" | jq .
# 4. Monitorizar: sigue bloqueada?
em-api mailerq GET "/alerts/blocked-ips?hours=2" \
  | jq '[.[] | select(.source_ip == "193.3.232.41")]'
# 5. Si resuelta: despausar
em-api mailerq DELETE /mailerq/pauses --data '{"tag": "motorsan.easymailing.com", "domain": "hotmail.com"}'
```

## Umbrales, codigos y reglas

### Umbrales de alerta

Referencia para evaluar tasas de error. Los proveedores grandes son mas estrictos.

| Dominio | Normal | Preocupante | Critico |
|---|---|---|---|
| gmail.com | <5% | 5-15% | >15% |
| hotmail/outlook | <3% | 3-10% | >10% |
| yahoo | <5% | 5-12% | >12% |
| corporativos | <2% | 2-8% | >8% |

- **Throttling (421/452):** temporal, MailerQ reintenta. Preocuparse si persiste >6h desde la misma IP.
- **Bloqueo 550:** serio — Microsoft bloquea IPs nuevas o con mala reputacion. Considerar pausar y rotar.
- **Success rate global <85%:** requiere investigacion inmediata.

### Codigos SMTP

| Codigo | Significado | Accion |
|---|---|---|
| 250 | Entregado | OK |
| 421 | Throttling temporal | MailerQ reintenta, monitorizar |
| 452 | Mailbox lleno o throttling | Temporal, similar a 421 |
| 550 | Bloqueo permanente | Revisar reputacion de IP, posible pausa |

### States

`message` (entrega) > `mailfrom` (MAIL FROM) > `rcptto` (RCPT TO) > `connect` (TCP)

### Results

`accepted` (OK) | `error` (bounce permanente) | `timeout` (sin respuesta) | `lost` (descartado por MailerQ sin resultado SMTP)

### Reglas

- **Solo lectura por defecto.** POST/DELETE en `/mailerq/*` modifican estado — confirmar antes de ejecutar.
- **Siempre jq.** Pipear con `| jq .`.
- **Tags en `/logs` requieren `fromjson`.** En `/tags` y `/tags/clients` ya vienen parseados.
- **Usa `/tags/clients`** para ver clientes, no `/stats/by-tag` sin parametro (que devuelve top 20 sin accepted/errors desglosados por dominio).
- **Consulta `/api-docs/{operationId}`** si no recuerdas los parametros exactos.
- **Pausas y errores forzados requieren tag.** No se puede pausar sin especificar cliente. Usar `domain` para acotar.
- **Escrituras solo con el sí explícito de Sergio** (en OpenClaw, tras approval): pausar, error forzado, supresiones y despausar. `mq` no las incluye; se hacen con `em-api mailerq POST|DELETE`.

## Validacion QA del API

Checks rapidos para verificar que el API responde correctamente:

```bash

# 1. summary cuadra con lost
em-api mailerq GET "/stats/summary" \
  | jq 'if .total == (.accepted + .errors + .timeouts + .lost) then "OK: total cuadra" else "FAIL: \(.total) != \(.accepted)+\(.errors)+\(.timeouts)+\(.lost)" end'

# 2. by-ip cuadra con lost
em-api mailerq GET "/stats/by-ip?hours=1" \
  | jq '[.[] | select(.total != (.accepted + .errors + .timeouts + .lost))] | if length == 0 then "OK: todas las IPs cuadran" else "FAIL: \(length) IPs no cuadran" end'

# 3. logs/recent usa timestamp
em-api mailerq GET "/logs/recent?minutes=5" \
  | jq 'if (.[0] | has("timestamp")) then "OK: campo timestamp presente" else "FAIL: campo timestamp no encontrado" end'

# 4. filtros combinados funcionan
em-api mailerq GET "/logs?domain=gmail.com&result=error&limit=1" \
  | jq 'if (.[0].recipient_domain == "gmail.com" and .[0].result == "error") then "OK: filtros combinados" else "FAIL: filtros no aplicados" end'
```

## Cruzar datos con Admin API

Los datos de MailerQ son en tiempo real pero no dan contexto historico. Para investigar un cliente, necesitas cruzar con la Admin API (skill `easymailing-admin-api`):

1. Sacar `app_id`: `/logs?tag=CLIENTE&limit=1` → campo `app_id`
2. Con el `app_id`, consultar en Admin API:
   - `/apps/{id}/metrics` → bounce_rate mensual, tendencia
   - `/apps/{id}/campaigns` → campanas recientes con score
   - `/apps/{id}/health` → estado consolidado
   - `/apps/{id}/issues` → issues activos

### Interpretacion de first_attempt_errors vs retry_events

| Campo | Que es | Senal |
|---|---|---|
| `first_attempt_errors` | Errores en el PRIMER intento | Senal real de problema |
| `retry_events` | Reintentos de MailerQ | Inflan las metricas de error hasta 4x |
| `unique_messages` | Mensajes distintos enviados | Volumen real |

- Si `errors` >> `first_attempt_errors`: son retries, no problema nuevo
- Ejemplo: 1.000 errores pero 0 `first_attempt_errors` = solo retries de buzones llenos

### Metricas reales vs infladas

| Metrica | Usa para | NO uses para |
|---|---|---|
| `first_attempt_errors / unique_messages` | Tasa de error real | - |
| `success_rate` (total) | Vista rapida | Decidir acciones (esta inflada por retries) |
| `mailbox_full` count | Descartar ruido | Escalar (es normal en Gmail) |
| `blocked` count | Detectar IP blocks | - |
