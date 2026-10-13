---
name: em-stripe
description: "Stripe de Easymailing en solo lectura: cobros (y cobros fallidos), facturas, suscripciones, clientes y disputas. Usar cuando pregunten «¿cuánto se ha cobrado este mes?», «¿qué cobros han fallado?», «¿tiene X la suscripción activa?», «¿hay disputas abiertas?», o para revisar la facturación de un cliente. Para MRR y bajas usa em-chartmogul."
---

# Stripe (solo lectura)

CLI `st` sobre `em-api stripe` con una **clave restringida de solo lectura** (item `stripe-api-key`). En OpenClaw, mediante `gateway_exec`.

`st` **no es un comando instalado**: invócalo siempre con `node` y la ruta del script (`SKILL_DIR` = carpeta de esta skill; en OpenClaw, `~/easymailing-skills/skills/stripe`).

```bash
ST="node $SKILL_DIR/scripts/st.mjs"
$ST check                                           # responde y comprueba que la clave es restringida
$ST cobros [--desde AAAA-MM-DD] [--estado succeeded|failed] [--cliente cus_…] [--max 25]
$ST facturas [--estado paid|open|uncollectible] [--cliente cus_…] [--desde AAAA-MM-DD]
$ST suscripciones [--estado active|past_due|canceled|all] [--cliente cus_…]
$ST cliente <email|cus_…>
$ST disputas [--desde AAAA-MM-DD]
```

- Importes en unidades (euros, no céntimos), con su moneda. Las listas devuelven como máximo `--max` resultados: si necesitas totales de un periodo largo, dilo y pagina con `--desde`.
- **Ninguna operación escribe** (reembolsos, cancelaciones o cambios se hacen en el dashboard de Stripe, por Sergio).
- Contiene datos de clientes: úsalos para responder, no los copies al repo de conocimiento (solo agregados).
