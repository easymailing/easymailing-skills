#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../openclaw-protected-auth/require-secret.sh"
require_openclaw_secret STORYBLOK_CDN_TOKEN
python3 "$(dirname "${BASH_SOURCE[0]}")/cdn-get.py" "$@"
