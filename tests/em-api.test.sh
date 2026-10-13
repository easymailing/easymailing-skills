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
printf '%s\n' "$@" > "$EMT/curl.args"
cat "$EMT/curl.resp" 2>/dev/null || printf '{"ok":true}\n200'
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
grep -q 'read op://Marcos OpenClaw/storyblok-management-token/credential SA=SA-TOKEN-FAKE' "$T/op.log" && ok "4 op con cuenta de servicio" || ko "4 op con cuenta de servicio"
# 5
printf 'error: token SECRETO-FAKE-123 invalido\n401' > "$T/curl.resp"
all=$(run "$REPO/bin/em-api" storyblok GET /stories 2>&1); rc=$?
{ [ $rc = 1 ] && ! grep -q 'SECRETO-FAKE-123' <<<"$all"; } && ok "5 redacta y exit 1" || ko "5 redacta y exit 1"
rm -f "$T/curl.resp"
# 6
rm -rf "$T/tmp"/*; rm -f "$T/op.log"; run "$REPO/bin/em-api" storyblok GET /a >/dev/null; run "$REPO/bin/em-api" storyblok GET /b >/dev/null
n=$(grep -c storyblok-management-token "$T/op.log"); f=$(find "$T/tmp" -type f | head -1); m=$(stat -f %Lp "$f" 2>/dev/null)
{ [ "$n" = 1 ] && [ "$m" = 600 ]; } && ok "6 cache 600" || ko "6 cache 600 (n=$n m=$m)"
# 7
run "$REPO/bin/em-api" zendesk check >/dev/null
{ grep -qx 'https://easymailing.zendesk.com/api/v2/users/me.json' "$T/curl.args" && grep -qx 'agente@easymailing.com/token:SECRETO-FAKE-123' "$T/curl.args"; } && ok "7 zendesk check basic" || ko "7 zendesk check basic"
echo "== $pass OK, $fail fallos"; rm -rf "$T"; [ $fail -eq 0 ]
