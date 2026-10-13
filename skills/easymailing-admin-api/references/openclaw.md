# easymailing-admin-api en OpenClaw

- Ejecuta `node <skills>/easymailing-admin-api/scripts/admin.mjs ...` (y cualquier `em-api admin-api ...`) mediante `gateway_exec` (Gateway de OpenClaw, Codex) con el proxy de secretos habilitado. `EASYMAILING_ADMIN_API_TOKEN` es un sentinel ligado a `admin-api.easymailing.com`; shell nativo, ACP, sandbox y nodos remotos no lo reciben. No uses `op read` ni exportes/imprimas la credencial; si falta el sentinel, informa del bloqueo de configuración.
- Los PATCH/DELETE (IP blocks, postmaster) requieren approval antes de ejecutarse.
