// Try to convert using sharp directly (skip npx)
const path = require('path');
const fs = require('fs');

const src = path.resolve('H:\\scheduler\\public\\images\\newbg.png');
const dst = path.resolve('H:\\scheduler\\public\\images\\newbg.webp');

if (!fs.existsSync(src)) {
  console.error('Source not found:', src);
  process.exit(1);
}

const srcSize = fs.statSync(src).size;
console.log('Source:', src, `(${(srcSize / 1024).toFixed(0)} KB)`);

// Approach 1: Check if sharp is already installed
try {
  const sharp = require('sharp');
  console.log('Sharp found, using it directly...');
  sharp(src)
    .webp({ quality: 80 })
    .toFile(dst)
    .then(() => {
      const dstSize = fs.statSync(dst).size;
      const saved = ((1 - dstSize / srcSize) * 100).toFixed(0);
      console.log('Done! newbg.webp created');
      console.log(`  Output: ${(dstSize / 1024).toFixed(0)} KB`);
      console.log(`  Saved: ${saved}%`);
    })
    .catch(err => {
      console.error('Sharp conversion failed:', err.message);
      process.exit(1);
    });
} catch (e) {
  console.log('Sharp not installed, trying child_process...');
}
