#!/bin/bash
# Genera la URL de preview de un story en draft
# Usage: ./preview-url.sh <full_slug>
# Output: https://easymailing.com/<full_slug>?preview_secret=<TOKEN>
#
# Ejemplos:
#   ./preview-url.sh blog/mi-articulo
#   ./preview-url.sh guides/automatizaciones

set -euo pipefail

SLUG="${1:?Usage: preview-url.sh <full_slug>}"
TOKEN=$(op read "op://Marcos OpenClaw/storyblok-cdn-token/credential")
echo "https://easymailing.com/${SLUG}?preview_secret=${TOKEN}"
