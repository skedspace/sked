// Check Node.js environment and try conversion
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());

const src = path.resolve('H:\\scheduler\\public\\images\\newbg.png');
const dst = path.resolve('H:\\scheduler\\public\\images\\newbg.webp');

if (!fs.existsSync(src)) {
  console.error('Source not found:', src);
  process.exit(1);
}

const srcSize = fs.statSync(src).size;
console.log('Source size:', (srcSize / 1024).toFixed(0), 'KB');

// Try to locate node/npx/pnpm
['node', 'npx', 'pnpm', 'where node', 'where npx', 'where pnpm'].forEach(cmd => {
  try {
    const out = execSync(cmd, { shell: true, timeout: 5000 });
    console.log(`${cmd} available:`, out.toString().trim());
  } catch {
    console.log(`${cmd}: not found`);
  }
});
