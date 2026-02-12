#!/bin/bash
# Build site-kit and copy into Coachlight's node_modules (no symlinks, no npm publish)
set -e

SITE_KIT_DIR="$(cd "$(dirname "$0")" && pwd)"
COACHLIGHT_DIR="/Volumes/Uptrade Media/GitHub/manhattan-development-group/coachlight-nextjs"
TARGET="$COACHLIGHT_DIR/node_modules/@uptrademedia/site-kit"

echo "Building site-kit..."
cd "$SITE_KIT_DIR"
pnpm build

echo "Copying dist → $TARGET/dist"
rm -rf "$TARGET/dist"
cp -r "$SITE_KIT_DIR/dist" "$TARGET/dist"
cp "$SITE_KIT_DIR/package.json" "$TARGET/package.json"

echo "✓ Synced site-kit to Coachlight"
