/**
 * One-shot PNG → WebP converter
 * 
 * Run this from the project root (H:\scheduler):
 *   node scripts\convert.cjs
 * 
 * Or if using pnpm:
 *   pnpm node scripts\convert.cjs
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'images', 'newbg.png');
const DST = path.join(ROOT, 'public', 'images', 'newbg.webp');

if (!fs.existsSync(SRC)) {
  console.error(`✗ Source not found: ${SRC}`);
  process.exit(1);
}

const srcSize = fs.statSync(SRC).size;
console.log(`Converting: ${path.basename(SRC)} (${(srcSize / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Output:     ${path.basename(DST)}`);

// Prefer using npx sharp-cli (auto-installs, no permanent deps)
console.log('\n→ Running npx sharp-cli ...');
execSync(`npx -y sharp-cli -i "${SRC}" -o "${DST}" --quality 80`, {
  cwd: ROOT,
  stdio: 'inherit',
  timeout: 120000,
  shell: true,
});

if (fs.existsSync(DST)) {
  const dstSize = fs.statSync(DST).size;
  const saved = ((1 - dstSize / srcSize) * 100).toFixed(1);
  console.log(`\n✓ Done! (${(dstSize / 1024).toFixed(0)} KB, saved ${saved}%)`);
} else {
  console.error('\n✗ Output not found — conversion may have failed.');
  process.exit(1);
}
