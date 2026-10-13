#!/bin/bash
# Falla si alguna skill del repo no aparece en el catálogo (sección «## Skills») del AGENTS.md del workspace.
# Uso: bash tests/catalogo.test.sh   (CATALOGO=/ruta/AGENTS.md para otra ubicación)
REPO="$(cd "$(dirname "$0")/.." && pwd)"
CAT="${CATALOGO:-$REPO/../AGENTS.md}"
[ -f "$CAT" ] || { echo "== catálogo no encontrado ($CAT): se omite"; exit 0; }
sec=$(awk '/^## Skills/{f=1;next} /^## /{f=0} f' "$CAT")
fail=0
for s in "$REPO"/skills/*/SKILL.md; do
  n=$(awk '/^name:/{sub(/^name:[ ]*/,""); gsub(/"/,""); print; exit}' "$s")
  grep -qF "\`$n\`" <<<"$sec" || { echo "FALTA en el catálogo: $n"; fail=1; }
done
[ $fail = 0 ] && echo "== catálogo OK" ; exit $fail
