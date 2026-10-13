#!/bin/bash
# Test de bin/install con HOME temporal. Uso: bash tests/install.test.sh
set -u
REPO="$(cd "$(dirname "$0")/.." && pwd)"
T=$(mktemp -d); pass=0; fail=0
ok(){ echo "OK  $1"; pass=$((pass+1)); }; ko(){ echo "FALLO $1"; fail=$((fail+1)); }
mkdir -p "$T/.agents/skills" "$T/.claude/skills" "$T/.codex/skills"
ln -s /ruta/antigua/x "$T/.agents/skills/em-newsletter"
HOME="$T" EM_INSTALL_SKIP_NPM=1 bash "$REPO/bin/install" >/dev/null
[ "$(readlink "$T/.agents/skills/em-newsletter")" = "$REPO/skills/newsletter" ] && ok "repunta enlace antiguo" || ko "repunta enlace antiguo"
[ "$(readlink "$T/.agents/skills/storyblok-content")" = "$REPO/skills/storyblok-content" ] && ok "enlaza por name" || ko "enlaza por name"
[ "$(readlink "$T/.claude/skills/em-newsletter")" = "../../.agents/skills/em-newsletter" ] && ok "enlace Claude" || ko "enlace Claude"
[ "$(readlink "$T/.codex/skills/storyblok-content")" = "../../.agents/skills/storyblok-content" ] && ok "enlace Codex" || ko "enlace Codex"
grep -q "$REPO/bin" "$T/.zshrc" && ok "PATH en zshrc" || ko "PATH en zshrc"
HOME="$T" EM_INSTALL_SKIP_NPM=1 bash "$REPO/bin/install" >/dev/null; [ "$(grep -c "$REPO/bin" "$T/.zshrc")" = 1 ] && ok "idempotente" || ko "idempotente"
echo "== $pass OK, $fail fallos"; rm -rf "$T"; [ $fail -eq 0 ]
