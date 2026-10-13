---
name: em-chartmogul
description: "ChartMogul de Easymailing en solo lectura: MRR, ARR, ARPA, número de clientes, tasas de bajas (clientes y MRR), LTV, búsqueda de clientes y movimientos (altas, expansiones, contracciones, bajas, reactivaciones). Usar cuando pregunten «¿cómo va el MRR?», «¿cuántos clientes tenemos?», «¿cuántas bajas hubo este mes?», «¿quién se ha dado de baja?», «¿cuánto paga el cliente X?». Fuente prioritaria de ingresos recurrentes."
---

# ChartMogul (solo lectura)

CLI `cm` sobre `em-api chartmogul` (item `chartmogul-api-key`). En OpenClaw, mediante `gateway_exec`.

```bash
CM="node $SKILL_DIR/scripts/cm.mjs"
$CM metricas mrr [--desde AAAA-MM-DD] [--hasta AAAA-MM-DD] [--intervalo month]   # por defecto: últimos 12 meses
$CM metricas todas | arr | arpa | asp | clientes | bajas-clientes | bajas-mrr | ltv
$CM movimientos [--tipo new_biz|expansion|contraction|churn|reactivation] [--desde AAAA-MM-DD] [--max 50]
$CM clientes buscar <email>
$CM cliente <uuid>
```

- **Moneda: USD** (la de la cuenta), importes ya en unidades. No conviertas a euros sin decirlo.
- Al responder cifras: fecha de corte, fuente (ChartMogul) y cómo se calculó; recalcula porcentajes tú mismo.
- Si una cifra cambia algo de `conocimiento/finanzas/metricas.md`, actualiza esa ficha (solo agregados, nunca datos de clientes).
- El MCP de ChartMogul puede usarse si está conectado, pero no es necesario.
