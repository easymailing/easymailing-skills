---
name: snds
description: "Consulta Microsoft SNDS (Smart Network Data Services) para ver la reputación de nuestras IPs en Outlook/Hotmail: estado del listing y datos por IP (filtro GREEN/YELLOW/RED, quejas, spam traps). Usar cuando pregunten por SNDS, la reputación de una IP en Microsoft, si una IP está listada, un bloqueo de Outlook/Hotmail, o necesiten evidencia para un delist o para responder a Microsoft."
---

# SNDS — Microsoft Smart Network Data Services

Datos de Automated Data Access del portal nuevo (`substrate.office.com/ip-domain-management-snds`) vía `em-api snds`: la clave va en la query y la añade `em-api`; nunca la veas, pidas ni escribas. En OpenClaw, ejecuta los comandos mediante `gateway_exec` (ver `references/openclaw.md`).

Para el procedimiento de delist en el portal OLC, skill `deliverability-ops`.

## Uso

```bash
node skills/snds/scripts/snds.mjs estado                          # ¿hay IPs listadas? (IpStatusKey)
node skills/snds/scripts/snds.mjs datos                           # último día disponible (DataKey)
node skills/snds/scripts/snds.mjs datos --fecha 071426 --ip 193.3.232.38   # fecha MMDDYY (hora del Pacífico) y/o IP
```

`datos` devuelve JSON: `filas` (13 columnas del CSV ya mapeadas: ip, inicio, fin, rcpt, data, destinatarios, filtro, quejas, trap_*, helo, mail_from) y `resumen_por_ip` (totales, peor filtro, quejas máximas, trap hits). Formato del CSV en `references/csv-format.md`. Todo es lectura; no hay escrituras.

## El 404 (cómo distinguirlo)

Las claves del portal nuevo **caducan a los 30 días**. Un `404` es ambiguo y `snds` lo desambigua solo con `DataKey`:

| Caso | Mensaje de `snds` | Exit |
|---|---|---|
| `estado` 404 y `DataKey` 200 | «sin listing hoy» (normal: ninguna IP listada) | 0 |
| `estado`/`datos` 404 y `DataKey` 404 | «clave caducada: renovar en el portal SNDS, cuenta marcos@, cada 30 días» | 1 |
| `datos --fecha` 404 y `DataKey` 200 | «sin datos para esa fecha/IP» (clave válida; prueba otro día) | 1 |
| 400 | clave inválida o fecha mal formada (MMDDYY) | 1 |

Con la clave caducada, avisa a Sergio (renovarla: portal SNDS → «Automated Data Access», desactivar y reactivar, y actualizar el item `snds-key` de 1Password) y sigue los procedimientos SIN datos SNDS. **Nunca menciones este fallo en emails a Microsoft**: es interno, no evidencia.

Los datos tienen 1-2 días de retraso y solo salen IPs con muestra suficiente (~100+ mensajes/día): que una IP no aparezca no la declara limpia. Los hosts antiguos (`sendersupport.olc.protection.outlook.com`, `postmaster.live.com`) están muertos desde jun 2026.

## Bloqueo SNDS != bloqueo de entrega (EOP/OLC)

SNDS refleja la reputación (filtro, quejas, spam traps) y su propia lista de IPs. Los rechazos `550 5.7.x` de Outlook (`S3150`, `S3140`, `OU-002`, `OUR-002`…) los aplica EOP/OLC, **otro sistema**: una IP puede salir GREEN, sin listing, con quejas bajas y 0 trap hits y aun así recibir 550. No es una contradicción; es la evidencia que se presenta a Microsoft cuando deniega la mitigación (datos SNDS limpios + rechazos reales), y el delist se pide igual por el portal OLC.

Señales de problema real de reputación: IP en `estado`, filtro RED/YELLOW, quejas `0.1% - 1%` o `> 1%`, trap hits no nulos (cada uno deprime la reputación semanas; suele delatar una lista vieja o comprada de algún cliente de la IP).

Cruza con MailerQ (skill `mailerq-api`: `alertas bloqueadas`, `stats ip-dominio-codigo`) para confirmar rechazos reales.

## Referencias

- `references/csv-format.md`: columnas, valores y cómo resumir una IP en 3-4 líneas.
- `references/openclaw.md`: renovación de la clave en el portal con el navegador de OpenClaw.
