const { execSync } = require('child_process');
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
console.log('Target:', dst);
console.log('Node:', process.version);
console.log('');

// Method 1: Use npx sharp-cli
console.log('=== Method 1: npx sharp-cli ===');
try {
  const cmd = `npx -y sharp-cli -i "${src}" -o "${dst}" --quality 80`;
  console.log('Running:', cmd);
  execSync(cmd, { 
    cwd: 'H:\\scheduler', 
    stdio: 'inherit',
    timeout: 120000,
    shell: true 
  });
  if (fs.existsSync(dst)) {
    const sz = fs.statSync(dst).size;
    console.log('\nSUCCESS! Output:', (sz / 1024).toFixed(0), 'KB');
    process.exit(0);
  }
} catch (e) {
  console.log('Method 1 failed:', e.message.substring(0, 200));
}

// Method 2: Try pnpm dlx with sharp-cli
console.log('\n=== Method 2: pnpm dlx sharp-cli ===');
try {
  const cmd = `pnpm dlx sharp-cli -i "${src}" -o "${dst}" --quality 80`;
  console.log('Running:', cmd);
  execSync(cmd, { 
    cwd: 'H:\\scheduler', 
    stdio: 'inherit',
    timeout: 120000,
    shell: true 
  });
  if (fs.existsSync(dst)) {
    const sz = fs.statSync(dst).size;
    console.log('\nSUCCESS! Output:', (sz / 1024).toFixed(0), 'KB');
    process.exit(0);
  }
} catch (e) {
  console.log('Method 2 failed:', e.message.substring(0, 200));
}

// Method 3: Install sharp then use it
console.log('\n=== Method 3: Install sharp temporarily ===');
try {
  console.log('Installing sharp...');
  execSync('pnpm add sharp', { cwd: 'H:\\scheduler', stdio: 'inherit', timeout: 120000, shell: true });
  
  try {
    const sharp = require('sharp');
    console.log('Converting with sharp...');
    
    sharp(src)
      .webp({ quality: 80 })
      .toFile(dst)
      .then(() => {
        const dstSize = fs.statSync(dst).size;
        const saved = ((1 - dstSize / srcSize) * 100).toFixed(1);
        console.log(`\nSUCCESS!`);
        console.log(`  Output: ${(dstSize / 1024).toFixed(0)} KB`);
        console.log(`  Saved: ${saved}%`);
        
        console.log('\nRemoving sharp...');
        execSync('pnpm remove sharp', { cwd: 'H:\\scheduler', stdio: 'inherit', timeout: 60000, shell: true });
        
        process.exit(0);
      })
      .catch(err => {
        console.error('Sharp error:', err.message);
        process.exit(1);
      });
  } catch (e) {
    console.log('Require sharp failed:', e.message);
    process.exit(1);
  }
} catch (e) {
  console.log('Method 3 failed:', e.message.substring(0, 200));
}

console.error('\nAll methods failed!');
process.exit(1);
