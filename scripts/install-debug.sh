#!/usr/bin/env bash
# Instala o APK debug universal no aparelho/emulador conectado. Uso: ./scripts/install-debug.sh
set -euo pipefail
cd "$(dirname "$0")/.."
APK="app/build/outputs/apk/debug/app-universal-debug.apk"
if [ ! -f "$APK" ]; then
  echo "APK não encontrado, compilando…"
  ./scripts/build.sh
fi
adb install -r "$APK"
