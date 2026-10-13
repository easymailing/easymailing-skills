# MailerQ en OpenClaw (agentes del Mac Mini)

- Ejecuta `mq` y `em-api mailerq …` mediante `gateway_exec`. `MAILERQ_API_TOKEN` llega como sentinel ligado a `bridge-agents.easymailing.com`; `em-api` lo usa solo. No uses `op read`, no exportes ni copies la credencial y no envíes el token a HTTP:3100.
- El puente (túnel SSH restringido a `localhost:3100` de MailerQ + ngrok) corre en este mismo Mac Mini: si `mq check` dice que el puente no responde, el fallo es de ese túnel o de ngrok; informa del error sin reintentar en bucle.
- Pausar, error forzado, supresiones y despausar (`em-api mailerq POST|DELETE /mailerq/…`) solo tras approval en Mission Control.
