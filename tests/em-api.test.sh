#!/bin/bash
# Tests de bin/em-api y bin/em-secret con op, security y curl simulados. Uso: bash tests/em-api.test.sh
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
T=$(mktemp -d); pass=0; fail=0
ok(){ echo "OK  $1"; pass=$((pass+1)); }; ko(){ echo "FALLO $1"; fail=$((fail+1)); }
mkdir -p "$T/bin"
cat > "$T/bin/security" <<'S'
#!/bin/bash
echo "SA-TOKEN-FAKE"
S
cat > "$T/bin/op" <<'S'
#!/bin/bash
echo "op $* SA=$OP_SERVICE_ACCOUNT_TOKEN" >> "$EMT/op.log"
case "$*" in *username*) echo "agente@easymailing.com";; *) echo "SECRETO-FAKE-123";; esac
S
cat > "$T/bin/curl" <<'S'
#!/bin/bash
printf '%s\n' "$@" > "$EMT/curl.args"; printf '%s\n' "$@" >> "$EMT/curl.all"
hdr=""; prev=""; for a in "$@"; do [ "$prev" = "-D" ] && hdr="$a"; prev="$a"; done
n=$(cat "$EMT/curl.n" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "$EMT/curl.n"
if [ -f "$EMT/curl.resp.$n" ]; then src="$EMT/curl.resp.$n"; else src="$EMT/curl.resp"; fi
if [ -f "$src.hdr" ] && [ -n "$hdr" ]; then cp "$src.hdr" "$hdr"; elif [ -n "$hdr" ]; then : > "$hdr"; fi
cat "$src" 2>/dev/null || printf '{"ok":true}\n200'
S
chmod +x "$T/bin/"*
run(){ (export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" STORYBLOK_SPACE_ID=123; unset STORYBLOK_MANAGEMENT_TOKEN ZENDESK_API_TOKEN; "$@") ; }
mkdir -p "$T/tmp"; rm -f "$T/curl.resp"
# 1
out=$(run "$REPO/bin/em-api" storyblok GET /stories); rc=$?
{ [ $rc = 0 ] && grep -qx 'https://mapi.storyblok.com/v1/spaces/123/stories' "$T/curl.args" && grep -q 'Authorization: SECRETO-FAKE-123' "$T/curl.args"; } && ok "1 url y cabecera" || ko "1 url y cabecera"
# 2
rm -f "$T/curl.args"; run "$REPO/bin/em-api" storyblok GET https://evil.example/x >/dev/null 2>&1; rc=$?
{ [ $rc = 2 ] && [ ! -f "$T/curl.args" ]; } && ok "2 host no permitido" || ko "2 host no permitido"
# 3
rm -f "$T/op.log"; (export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" STORYBLOK_SPACE_ID=123 STORYBLOK_MANAGEMENT_TOKEN=oc-sent-v2-abc; "$REPO/bin/em-api" storyblok GET /stories >/dev/null)
{ [ ! -f "$T/op.log" ] && grep -q 'Authorization: oc-sent-v2-abc' "$T/curl.args"; } && ok "3 sentinel" || ko "3 sentinel"
# 4
rm -rf "$T/tmp"/*; rm -f "$T/op.log"; run "$REPO/bin/em-api" storyblok GET /stories >/dev/null
grep -q 'read op://Marcos OpenClaw/storyblok/credential SA=SA-TOKEN-FAKE' "$T/op.log" && ok "4 op con cuenta de servicio" || ko "4 op con cuenta de servicio"
# 5
printf 'error: token SECRETO-FAKE-123 invalido\n401' > "$T/curl.resp"
all=$(run "$REPO/bin/em-api" storyblok GET /stories 2>&1); rc=$?
{ [ $rc = 1 ] && ! grep -q 'SECRETO-FAKE-123' <<<"$all"; } && ok "5 redacta y exit 1" || ko "5 redacta y exit 1"
rm -f "$T/curl.resp"
# 6
rm -rf "$T/tmp"/*; rm -f "$T/op.log"; run "$REPO/bin/em-api" storyblok GET /a >/dev/null; run "$REPO/bin/em-api" storyblok GET /b >/dev/null
n=$(grep -c 'storyblok/credential' "$T/op.log"); f=$(find "$T/tmp" -type f | head -1); m=$(stat -f %Lp "$f" 2>/dev/null)
{ [ "$n" = 1 ] && [ "$m" = 600 ]; } && ok "6 cache 600" || ko "6 cache 600 (n=$n m=$m)"
# 7
run "$REPO/bin/em-api" zendesk check >/dev/null
{ grep -qx 'https://easymailing.zendesk.com/api/v2/users/me.json' "$T/curl.args" && grep -qx 'agente@easymailing.com/token:SECRETO-FAKE-123' "$T/curl.args"; } && ok "7 zendesk check basic" || ko "7 zendesk check basic"
# 8. redirección: solo se sigue dentro de los hosts permitidos
rm -f "$T/curl.n" "$T/curl.all" "$T"/curl.resp.*
printf '\n301' > "$T/curl.resp.1"; printf 'location: https://api.storyblok.com/v2/cdn/stories/x?cv=1&version=published\r\n' > "$T/curl.resp.1.hdr"
printf '{"story":{"id":1}}\n200' > "$T/curl.resp.2"
out=$(run "$REPO/bin/em-api" storyblok-cdn GET /stories/x --query version=published); rc=$?
{ [ $rc = 0 ] && grep -q '"id":1' <<<"$out" && [ "$(cat "$T/curl.n")" = 2 ]; } && ok "8a sigue redirección permitida" || ko "8a sigue redirección permitida"
rm -f "$T/curl.n" "$T"/curl.resp.*
printf '\n302' > "$T/curl.resp.1"; printf 'location: https://evil.example/robar\r\n' > "$T/curl.resp.1.hdr"
run "$REPO/bin/em-api" storyblok-cdn GET /stories/x >/dev/null 2>&1; rc=$?
{ [ $rc != 0 ] && [ "$(cat "$T/curl.n")" = 1 ]; } && ok "8b no sigue a host ajeno" || ko "8b no sigue a host ajeno"
rm -f "$T/curl.n" "$T"/curl.resp.*
# 9. variables que entran en hosts: solo [a-z0-9-]
rm -f "$T/curl.args" "$T/curl.n"
(export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" ZENDESK_SUBDOMAIN='evil.com x'; "$REPO/bin/em-api" zendesk GET https://evil.com/steal >/dev/null 2>&1); rc=$?
{ [ $rc = 2 ] && [ ! -f "$T/curl.args" ]; } && ok "9 subdominio manipulado" || ko "9 subdominio manipulado"
# 10. token con caracteres especiales en cabecera
rm -f "$T/curl.n"; err=$( (export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" STORYBLOK_SPACE_ID=123 STORYBLOK_MANAGEMENT_TOKEN='oc-sent-a#b&c\d'; "$REPO/bin/em-api" storyblok GET /stories 2>&1 >/dev/null) )
{ grep -qxF 'Authorization: oc-sent-a#b&c\d' "$T/curl.args" && [ -z "$err" ]; } && ok "10 cabecera con caracteres especiales" || ko "10 cabecera con caracteres especiales"
# 11. redacción literal (sin glob)
rm -f "$T/curl.n"; printf 'eco oc-sent-[ab] fin\n500' > "$T/curl.resp"
all=$( (export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" STORYBLOK_SPACE_ID=123 STORYBLOK_MANAGEMENT_TOKEN='oc-sent-[ab]'; "$REPO/bin/em-api" storyblok GET /stories 2>&1) )
! grep -qF 'oc-sent-[ab]' <<<"$all" && ok "11 redacción literal" || ko "11 redacción literal"
rm -f "$T/curl.resp"
# 12. cabeceras extra y formato Basic literal
cat > "$T/serv.json" <<'J'
{"kb":{"base_url":"https://api.openai.com/v1","hosts":["api.openai.com"],"auth":{"tipo":"header","nombre":"Authorization","formato":"Bearer {token}"},"cabeceras":{"OpenAI-Beta":"assistants=v2"},"secreto":{"item":"kb","campo":"credential","env":"KB_TOKEN"}},
 "dfs":{"base_url":"https://api.dataforseo.com/v3","hosts":["api.dataforseo.com"],"auth":{"tipo":"header","nombre":"Authorization","formato":"Basic {token}"},"secreto":{"item":"dataforseo","campo":"credential","env":"DFS_TOKEN"}}}
J
rm -f "$T/curl.n"; (export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" EM_SERVICIOS="$T/serv.json" KB_TOKEN=oc-sent-v2-kb; "$REPO/bin/em-api" kb GET /models >/dev/null)
{ grep -qx 'OpenAI-Beta: assistants=v2' "$T/curl.args" && grep -qx 'Authorization: Bearer oc-sent-v2-kb' "$T/curl.args"; } && ok "12 cabeceras extra" || ko "12 cabeceras extra"
rm -f "$T/curl.n"; (export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" EM_SERVICIOS="$T/serv.json" DFS_TOKEN='oc-sent-v2-QUJDOg=='; "$REPO/bin/em-api" dfs GET /appendix/user_data >/dev/null)
grep -qx 'Authorization: Basic oc-sent-v2-QUJDOg==' "$T/curl.args" && ok "13 Basic literal" || ko "13 Basic literal"
# 14. basic con el token como usuario y contraseña vacía (ChartMogul)
cat > "$T/serv2.json" <<'J'
{"cm":{"base_url":"https://api.chartmogul.com/v1","hosts":["api.chartmogul.com"],"auth":{"tipo":"basic","usuario":"{token}"},"secreto":{"item":"cm","campo":"credential","env":"CM_TOKEN"}}}
J
rm -f "$T/curl.n"; (export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" EM_SERVICIOS="$T/serv2.json" CM_TOKEN=oc-sent-v2-cm; "$REPO/bin/em-api" cm GET /ping >/dev/null)
grep -qx 'oc-sent-v2-cm:' "$T/curl.args" && ok "14 basic token como usuario" || ko "14 basic token como usuario"
# 15b. userinfo en la URL no puede saltar la lista de hosts (api.stripe.com:x@evil.example)
rm -f "$T/curl.args" "$T/curl.n"
(export EMT="$T" PATH="$T/bin:$PATH" TMPDIR="$T/tmp" STRIPE_API_KEY=oc-sent-v2-st; "$REPO/bin/em-api" stripe GET 'https://api.stripe.com:x@evil.example/p' >/dev/null 2>&1); rc=$?
{ [ $rc = 2 ] && [ ! -f "$T/curl.args" ]; } && ok "15b userinfo rechazado" || ko "15b userinfo rechazado"
# 15c. redirección con userinfo no se sigue
rm -f "$T/curl.n" "$T"/curl.resp.*; printf '\n302' > "$T/curl.resp.1"; printf 'location: https://api.storyblok.com:x@evil.example/x\r\n' > "$T/curl.resp.1.hdr"
run "$REPO/bin/em-api" storyblok-cdn GET /stories/x >/dev/null 2>&1; rc=$?
{ [ $rc != 0 ] && [ "$(cat "$T/curl.n" 2>/dev/null)" = 1 ]; } && ok "15c redirección con userinfo" || ko "15c redirección con userinfo"
rm -f "$T/curl.n" "$T"/curl.resp.*
echo "== $pass OK, $fail fallos"; rm -rf "$T"; [ $fail -eq 0 ]
