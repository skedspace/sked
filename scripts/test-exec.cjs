const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// First test: can we execute ANY command?
console.log('=== Testing shell execution ===');
try {
  const out = execSync('echo "Hello from shell"', { shell: true, timeout: 5000 });
  console.log('Shell works:', out.toString().trim());
} catch (e) {
  console.log('Shell test failed:', e.message);
}

// Test: can we run node?
try {
  const out = execSync('node -e "console.log(\'Node works\')"', { shell: true, timeout: 5000 });
  console.log('Node works:', out.toString().trim());
} catch (e) {
  console.log('Node test failed:', e.message);
}

// Test: can we run npx?
try {
  const out = execSync('npx --version', { shell: true, timeout: 10000 });
  console.log('npx version:', out.toString().trim());
} catch (e) {
  console.log('npx test failed:', e.message);
}

// Test: can we run pnpm?
try {
  const out = execSync('pnpm --version', { shell: true, timeout: 10000 });
  console.log('pnpm version:', out.toString().trim());
} catch (e) {
  console.log('pnpm test failed:', e.message);
}
