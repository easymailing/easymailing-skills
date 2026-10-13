# Patrones conocidos por proveedor

Referencia de senales SMTP especificas de cada MBP para clasificar errores correctamente.
Consultar esta referencia cuando el flujo de diagnostico (paso 4) necesite confirmar la causa exacta por proveedor.

## Gmail

| Senal | Interpretacion | Bucket | Prioridad |
|---|---|---|---|
| 452 + OverQuotaTemp | Buzon lleno temporal | mailbox_full | WARN |
| 552 + OverQuotaPerm | Buzon lleno permanente/inactivo | mailbox_full | WARN |
| 421 + UnsolicitedRateLimitError | Throttling real, menciona dominio DKIM | throttled | CRITICAL |
| 450 + "receiving too quickly" | Rate limiting por volumen | throttled | WARN |
| 550 + NoSuchUser | Destinatario invalido | invalid_recipient | INFO |

## Microsoft (hotmail.com/es, outlook.com/es, live.com, msn.com)

| Senal | Interpretacion | Bucket | Prioridad |
|---|---|---|---|
| 550 + S3150 / "block list" | Bloqueo reputacional | blocked | CRITICAL |
| 550 + 5.7.515 | Auth insuficiente (>=5K/dia) | policy | CRITICAL |
| 421 + "temporarily deferred" | Throttling temporal | throttled | WARN |

> Si S3150 aparece en varios dominios Microsoft simultaneamente, el problema es de IP/reputacion, no de destinatario individual.

## Yahoo/AOL

| Senal | Interpretacion | Bucket | Prioridad |
|---|---|---|---|
| 421 + "temporarily deferred" | Throttling — distinguir puntual de estructural | throttled | WARN |
| 553 + "not accepted" | Rechazo por politica | policy | WARN→CRITICAL |

## Apple (icloud.com, me.com, mac.com)

| Senal | Interpretacion | Bucket | Prioridad |
|---|---|---|---|
| timeout en connect | Problema de conexion | connect_failure | WARN |
| 452 + mailbox full | Buzon lleno real | mailbox_full | WARN |
| 550 + unknown | Destinatario invalido | invalid_recipient | INFO |

---

## Playbook A — Gmail throttling

**Objetivo:** confirmar si Gmail esta rate limiting.

1. Buscar errores 421 en gmail.com:
   ```bash
   em-api mailerq GET "/logs?domain=gmail.com&result=error&code=421&limit=30" \
     | jq '.[] | {desc: .description[:120], ip: .source_ip}'
   ```
2. Buscar `UnsolicitedRateLimitError` en las descripciones
3. Si aparece: es throttling real. Buscar dominio DKIM mencionado en el mensaje
4. Si NO aparece y hay 452 con OverQuotaTemp: es mailbox_full, no throttling
5. Verificar volumen: ¿cuantos 421 vs total de envios a Gmail?
6. Conclusion con formato estandar

## Playbook B — Microsoft blocklist

**Objetivo:** confirmar bloqueo reputacional en ecosistema Microsoft.

1. Buscar errores 550 con "S3150" o "block list":
   ```bash
   em-api mailerq GET "/logs?result=error&code=550&limit=50" \
     | jq '[.[] | select(.description | test("S3150|block list"; "i")) | {domain: .recipient_domain, ip: .source_ip}]'
   ```
2. Verificar si afecta a multiples dominios MS (hotmail, outlook, live, msn)
3. Si multi-dominio: problema de IP/reputacion confirmado
4. Listar IPs afectadas y cruzar con `/alerts/blocked-ips`
5. Identificar clientes impactados
6. Conclusion con formato estandar — prioridad CRITICAL

## Playbook C — mailbox_full masivo

**Objetivo:** distinguir problema de calidad de lista de problema reputacional.

1. Buscar 452/552 en el dominio afectado
2. Verificar que NO hay mensajes de rate limiting en las descripciones
3. Evaluar volumen: ¿que % del total son mailbox_full?
4. Si <5% del total → ruido normal, no escalar
5. Si >10% y concentrado en un cliente → problema de lista/higiene → WARN
6. Si acompana a otros errores (550 blocked) → problema mixto → investigar mas

## Playbook D — Anomalias de timeout/connect

**Objetivo:** detectar problemas de conexion.

1. Buscar timeouts en logs recientes:
   ```bash
   em-api mailerq GET "/logs?result=timeout&limit=50" \
     | jq '[.[] | .recipient_domain] | group_by(.) | map({domain: .[0], count: length}) | sort_by(-.count)'
   ```
2. Si concentrado en 1-2 dominios → probable problema del servidor remoto
3. Si distribuido → posible problema de red/infra propia
4. Verificar duracion: ¿es puntual o persistente (>2h)?
5. Conclusion con formato estandar
