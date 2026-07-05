#!/bin/bash

# Regenera tipos TypeScript de los componentes de Storyblok.
# Requiere: storyblok CLI (npm i -g storyblok)
# Uso: ./generate-types.sh

SPACE_ID=310467
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_PATH="$SCRIPT_DIR/reference/storyblok.d.ts"
TEMP_JSON="$SCRIPT_DIR/components.$SPACE_ID.json"

# Descargar componentes
storyblok pull-components --space $SPACE_ID --path "$SCRIPT_DIR"

# Generar tipos
storyblok generate-typescript-typedefs --sourceFilePaths "$TEMP_JSON" --destinationFilePath "$OUTPUT_PATH"

# Limpiar JSON temporal
rm -f "$TEMP_JSON"

echo "Tipos generados en $OUTPUT_PATH"
