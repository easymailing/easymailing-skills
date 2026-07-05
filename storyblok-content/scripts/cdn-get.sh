#!/bin/bash
# Fetch published story from Storyblok Content Delivery API
# Usage: ./cdn-get.sh <slug> [--draft]
#
# Examples:
#   ./cdn-get.sh blog/mi-articulo          # published version
#   ./cdn-get.sh blog/mi-articulo --draft   # draft version

set -euo pipefail

SLUG="${1:?Usage: cdn-get.sh <slug> [--draft]}"
VERSION="published"

if [[ "${2:-}" == "--draft" ]]; then
  VERSION="draft"
fi

TOKEN=$(op read "op://Easymailing/storyblok-cdn-token/credential")

curl -sfL "https://api.storyblok.com/v2/cdn/stories/${SLUG}?version=${VERSION}&token=${TOKEN}" \
  | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))"
