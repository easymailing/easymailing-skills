---
name: em-zendesk-support
description: "Tickets de soporte de Easymailing en Zendesk (lectura): tickets abiertos o pendientes, detalle de un ticket con su conversación, búsqueda y métricas de la cola. Usar cuando pregunten «¿qué tickets hay abiertos?», «¿cómo va soporte?», «¿qué dijo el cliente X?», «busca tickets sobre …», o antes de responder sobre incidencias de clientes. Responder tickets solo con el sí explícito de Sergio."
---

# Zendesk Support (tickets)

CLI `zs` sobre `em-api zendesk` (cuenta principal `easymailing`). En OpenClaw, ejecútalo mediante `gateway_exec`.

`zs` **no es un comando instalado**: invócalo siempre con `node` y la ruta del script (`SKILL_DIR` = carpeta de esta skill; en OpenClaw, `~/easymailing-skills/skills/zendesk-support`).

```bash
ZS="node $SKILL_DIR/scripts/zs.mjs"
$ZS metricas                                   # tickets por estado y abiertos con más de 7 días
$ZS tickets [--estado abiertos|pendientes|nuevos|espera|resueltos] [--desde AAAA-MM-DD] [--max 25]
$ZS ticket <id>                                # ticket + conversación completa
$ZS buscar "texto"                             # búsqueda en tickets
$ZS responder <id> --interno|--publico --texto "..." --confirmado   # ESCRIBE: solo con el sí de Sergio
```

- La salida incluye datos de clientes: úsalos para responder a Sergio, **nunca** los copies al repo de conocimiento ni a ficheros (solo agregados).
- Para métricas históricas o informes de satisfacción, di que esta skill no los cubre.
- Los artículos de ayuda no están aquí: usa `em-help-center`.
