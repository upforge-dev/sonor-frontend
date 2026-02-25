#!/usr/bin/env node
/**
 * Generate PWA icons (192x192 and 512x512 PNG) for the web manifest.
 * Run: node scripts/generate-pwa-icons.mjs
 * Requires: pnpm add -D sharp
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFile } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const THEME_COLOR = { r: 75, g: 191, b: 57 } // #4bbf39

async function main() {
  let sharp
  try {
    const require = createRequire(import.meta.url)
    sharp = require('sharp')
  } catch {
    console.error('Run: pnpm add -D sharp')
    process.exit(1)
  }

  for (const size of [192, 512]) {
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="rgb(${THEME_COLOR.r},${THEME_COLOR.g},${THEME_COLOR.b})"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="white" opacity="0.9"/>
      </svg>
    `
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    const out = join(publicDir, `icon-${size}.png`)
    await writeFile(out, png)
    console.log('Written', out)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
