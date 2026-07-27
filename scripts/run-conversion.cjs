// Wrapper to run the conversion script
const { execSync } = require('child_process');
const path = require('path');

const script = path.resolve(__dirname, 'convert-to-webp.js');
console.log('Running:', script);

try {
  const result = execSync(`node "${script}"`, { 
    cwd: path.resolve(__dirname, '..'), 
    stdio: 'inherit',
    timeout: 120000,
    shell: process.platform === 'win32' ? 'cmd.exe' : true
  });
  console.log('Command completed with:', result?.toString() || '');
} catch (err) {
  console.error('Failed:', err.message);
  process.exit(1);
}
