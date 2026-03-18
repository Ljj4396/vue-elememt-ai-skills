#!/bin/bash

set -e

echo "Starting Go backend build..."

cd "$(dirname "$0")"

echo "Downloading Go dependencies..."
go mod download

echo "Building frontend assets..."
cd ..
npm run build

echo "Copying frontend assets to server-go..."
rm -rf server-go/dist
cp -r dist server-go/dist

cd server-go

echo "Building Go binary..."
go build -ldflags="-s -w" -o ../release/vue-element-ui

# Optional UPX compression is disabled by default because some environments
# block or terminate packed executables.
if [ "$USE_UPX" = "1" ] && command -v upx >/dev/null 2>&1; then
  echo "Compressing executable with UPX..."
  upx --best --lzma ../release/vue-element-ui
elif [ "$USE_UPX" = "1" ]; then
  echo "USE_UPX=1 was set, but upx was not found. Skipping compression."
else
  echo "Skipping UPX compression. Set USE_UPX=1 to enable it explicitly."
fi

echo "Build completed."
echo "Executable output: release/vue-element-ui"
ls -lh ../release/vue-element-ui
