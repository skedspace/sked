#!/usr/bin/env node
/**
 * Multi-strategy PNG → WebP converter
 * 
 * Run: node scripts/convert-universal.cjs
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = 'H:\\scheduler';
const SRC = path.join(ROOT, 'public', 'images', 'newbg.png');
const DST = path.join(ROOT, 'public', 'images', 'newbg.webp');

if (!fs.existsSync(SRC)) {
  console.error(`✗ Source not found: ${SRC}`);
  process.exit(1);
}

const srcSize = fs.statSync(SRC).size;
console.log(`Source: ${(srcSize / 1024 / 1024).toFixed(2)} MB — ${SRC}\n`);

const strategies = [
  // Strategy 1: npx sharp-cli
  async () => {
    console.log('▶ Strategy 1: npx -y sharp-cli');
    execSync(`npx -y sharp-cli -i "${SRC}" -o "${DST}" --quality 80`, {
      cwd: ROOT, stdio: 'pipe', timeout: 120000, shell: true
    });
  },
  // Strategy 2: pnpm dlx sharp-cli
  async () => {
    console.log('▶ Strategy 2: pnpm dlx sharp-cli');
    execSync(`pnpm dlx sharp-cli -i "${SRC}" -o "${DST}" --quality 80`, {
      cwd: ROOT, stdio: 'pipe', timeout: 120000, shell: true
    });
  },
  // Strategy 3: install sharp + use it
  async () => {
    console.log('▶ Strategy 3: pnpm add sharp + require("sharp")');
    execSync('pnpm add sharp', { cwd: ROOT, stdio: 'pipe', timeout: 120000, shell: true });
    const sharp = require('sharp');
    await sharp(SRC).webp({ quality: 80 }).toFile(DST);
    execSync('pnpm remove sharp', { cwd: ROOT, stdio: 'pipe', timeout: 60000, shell: true });
  },
  // Strategy 4: try cwebp if available
  async () => {
    console.log('▶ Strategy 4: cwebp');
    execSync(`cwebp -q 80 "${SRC}" -o "${DST}"`, {
      stdio: 'pipe', timeout: 60000, shell: true
    });
  },
  // Strategy 5: try ffmpeg
  async () => {
    console.log('▶ Strategy 5: ffmpeg');
    execSync(`ffmpeg -i "${SRC}" -q:v 80 "${DST}" -y`, {
      stdio: 'pipe', timeout: 60000, shell: true
    });
  },
  // Strategy 6: try ImageMagick
  async () => {
    console.log('▶ Strategy 6: magick/convert');
    execSync(`magick convert "${SRC}" -quality 80 "${DST}"`, {
      stdio: 'pipe', timeout: 60000, shell: true
    });
  },
  // Strategy 7: try npx imagemin
  async () => {
    console.log('▶ Strategy 7: npx imagemin');
    execSync(`npx -y imagemin "${SRC}" --plugin=imagemin-webp > "${DST}"`, {
      cwd: ROOT, stdio: 'pipe', timeout: 120000, shell: true
    });
  },
];

for (let i = 0; i < strategies.length; i++) {
  try {
    await strategies[i]();
    if (fs.existsSync(DST) && fs.statSync(DST).size > 0) {
      const dstSize = fs.statSync(DST).size;
      const saved = ((1 - dstSize / srcSize) * 100).toFixed(1);
      console.log(`\n✓ SUCCESS using strategy ${i + 1}!`);
      console.log(`  Output: ${(dstSize / 1024).toFixed(0)} KB (${(dstSize / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`  Saved: ${saved}%`);
      process.exit(0);
    }
  } catch (err) {
    console.log(`  ✗ Failed: ${err.message.substring(0, 150)}`);
  }
}

console.error('\n✗ All 7 strategies failed.');
process.exit(1);
