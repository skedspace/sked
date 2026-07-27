// Convert cta.png, cta2.png, cta3.png → cta.webp, cta2.webp, cta3.webp
const sharp = require("sharp");
const fs = require("fs");

const dir = "H:\\scheduler\\public\\images";
const files = ["cta.png", "cta2.png", "cta3.png"];

(async () => {
  for (const file of files) {
    const src = dir + "\\" + file;
    const dst = dir + "\\" + file.replace(".png", ".webp");
    const sz = fs.statSync(src).size;
    console.log("─── " + file + " (" + (sz / 1024 / 1024).toFixed(2) + " MB) ───");
    try {
      const out = await sharp(src).webp({ quality: 80 }).toFile(dst);
      const ds = fs.statSync(dst).size;
      console.log("  → " + file.replace(".png", ".webp") + " (" + (ds / 1024 / 1024).toFixed(2) + " MB, " + ((1 - ds / sz) * 100).toFixed(1) + "% smaller)");
    } catch (e) {
      console.error("  Error:", e.message);
    }
  }
  console.log("\nDone! All three converted.");
})();
