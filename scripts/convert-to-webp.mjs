// Try to convert PNG to WebP using Node.js native + npx sharp-cli
import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';

const src = 'H:\\scheduler\\public\\images\\newbg.png';
const dst = 'H:\\scheduler\\public\\images\\newbg.webp';

if (!existsSync(src)) {
  console.error(`Source not found: ${src}`);
  process.exit(1);
}

const srcSize = statSync(src).size;
console.log(`Source: ${src} (${(srcSize / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Target: ${dst}`);

// Try multiple approaches
const approaches = [
  () => execSync(`npx -y sharp-cli -i "${src}" -o "${dst}" --quality 80`, { stdio: 'pipe', cwd: 'H:\\scheduler', timeout: 60000 }),
  () => execSync(`pnpm dlx sharp-cli -i "${src}" -o "${dst}" --quality 80`, { stdio: 'pipe', cwd: 'H:\\scheduler', timeout: 60000 }),
];

for (const approach of approaches) {
  try {
    console.log('Attempting conversion...');
    const output = approach();
    console.log(output?.toString() || '');
    
    if (existsSync(dst)) {
      const dstSize = statSync(dst).size;
      const savings = ((1 - dstSize / srcSize) * 100).toFixed(1);
      console.log(`\n✅ Success!`);
      console.log(`   Source: ${(srcSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Output: ${(dstSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Saved: ${savings}%`);
      process.exit(0);
    }
  } catch (err) {
    console.log(`   Failed: ${err.message}`);
  }
}

console.error('❌ Could not convert using any approach.');
process.exit(1);
