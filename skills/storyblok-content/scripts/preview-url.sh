#!/usr/bin/env bash
# Generates the official, short-lived Visual Editor link, never the CDN credential.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../openclaw-protected-auth/require-secret.sh"
require_openclaw_secret STORYBLOK_MANAGEMENT_TOKEN
python3 "$(dirname "${BASH_SOURCE[0]}")/preview-url.py" "${1:?Usage: preview-url.sh <full_slug>}"
