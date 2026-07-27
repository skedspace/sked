/**
 * Convert newbg.png → newbg.webp
 * Run: node scripts/convert-to-webp.js
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const src = path.resolve(__dirname, "..", "public", "images", "newbg.png");
const dst = path.resolve(__dirname, "..", "public", "images", "newbg.webp");

if (!fs.existsSync(src)) {
  console.error("Source not found:", src);
  process.exit(1);
}

const srcSize = fs.statSync(src).size;
console.log("Source:", src, `(${(srcSize / 1024).toFixed(0)} KB)`);

// Use npx to run sharp-cli (auto-installs if needed)
const cmd = `npx -y sharp-cli -i "${src}" -o "${dst}" --quality 80`;

console.log("Running:", cmd);
execSync(cmd, { stdio: "inherit", cwd: path.resolve(__dirname, "..") });

if (fs.existsSync(dst)) {
  const dstSize = fs.statSync(dst).size;
  const saved = ((1 - dstSize / srcSize) * 100).toFixed(0);
  console.log(`Done! newbg.webp created (${(dstSize / 1024).toFixed(0)} KB, saved ${saved}%)`);
} else {
  console.error("Conversion failed — output not found.");
  process.exit(1);
}
