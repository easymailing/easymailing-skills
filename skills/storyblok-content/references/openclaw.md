# Storyblok en OpenClaw (agentes del Mac Mini)

Específico del Gateway de OpenClaw: credenciales por sentinel (`STORYBLOK_MANAGEMENT_TOKEN`, `STORYBLOK_CDN_TOKEN`), navegador aislado CDP y Mission Control. `em-api` usa el sentinel automáticamente; `sb` funciona igual que en el Mac.

- Publicación: solo tras approval `content_publish` en Mission Control (flujo `seo-workflow`).
- No imprimas ni copies la URL firmada de `sb preview`: para QA usa el helper de navegador de abajo.

## Preview protegido de drafts para QA (navegador OpenClaw)

Para capturas y DOM usa **exclusivamente** este helper mediante `gateway_exec` (o exec propio del Gateway):

```bash
node ./skills/storyblok-content/scripts/preview-browser.mjs blog/mi-articulo
```

Requiere `STORYBLOK_MANAGEMENT_TOKEN` protegido, ligado a `mapi.storyblok.com`. El helper obtiene la firma temporal oficial en memoria, carga HTML draft privado y lo entrega a un contexto aislado del navegador OpenClaw. Devuelve solo `profile`, `targetId`, `cleanUrl`, `fetchedAt`, `expiresAt` y `previewVerified`. No necesita desktop host ni una sesion manual.

- Usa ese `targetId` para `browser` evaluate/screenshot/snapshot. Tambien funciona el CLI de OpenClaw mediante Gateway; ejemplos reales: `openclaw browser --browser-profile openclaw --json evaluate --target-id <targetId> --fn '() => location.href'` y `openclaw browser --browser-profile openclaw --json screenshot <targetId> --full-page`.
- Para evidencia legible de una pagina larga, guarda PNG a resolucion nativa (la salida media de `openclaw browser screenshot` reduce paginas largas). Usa `node ./skills/storyblok-content/scripts/preview-capture.mjs <targetId> /Users/marcos/marcos-vault/contenidos/.../draft-preview-FECHA-HORA.png`; añade `--faq` para una captura separada de la primera FAQ. Verifica y abre la FAQ con browser antes de capturar. El helper exige draft hidratado, URL limpia y salida PNG dentro del vault, sin symlinks. Usa un nombre nuevo: apertura exclusiva 0600, sin sobrescribir archivos. Devuelve dimensiones/hash reales.
- La pestaña contiene una instantanea del draft y caduca como maximo a los 10 minutos. Si cambias el draft, caduca la pestaña o se reinicia el Gateway, ejecuta de nuevo el helper. No navegar a otra pagina: el contexto cierra al cambiar el documento/URL. GET-only; no permite formularios ni escrituras.
- Verifica modo hidratado `window.__NUXT__.state.$sisPreview === true`, DOM del delta y capturas actuales. La URL publica limpia por si sola muestra published; no valida el draft fuera de la pestaña preparada.
- No copies enlaces con `preview_secret`, no uses `op read`, no exportes claves ni guardes firmas en Mission Control, vault o comentarios. En metadata guarda la URL limpia y el modo `protected-browser-snapshot`; conserva informes y capturas del draft.
- `preview-url.sh` queda como primitiva interna para obtener la firma oficial; su salida es una capacidad temporal privada. No imprimirla en un turno de agente ni pasarla a browser.open, CLI, logs o chat. `cdn-get.sh` consulta JSON mediante el sentinel `STORYBLOK_CDN_TOKEN` ligado a `api.storyblok.com`.
- Si falla: informar el error sanitizado y usar un nuevo turno Gateway; no inventar que falta el token o exigir una sesion manual. El helper falla cerrado si no verifica HTTP/HTML draft privado, CDP local o saneado de firmas.

