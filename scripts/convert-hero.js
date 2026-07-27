// Convert newbg.png → 16:9 webp
const sharp = require("sharp");
const fs = require("fs");

const dir = "H:\\scheduler\\public\\images";
const src = dir + "\\newbg.png";
const dst = dir + "\\newbg.webp";

const sz = fs.statSync(src).size;
console.log("Source: " + (sz / 1024 / 1024).toFixed(2) + " MB");

sharp(src)
  .resize({ width: 1920, height: 1080, fit: "cover", position: "centre" })
  .webp({ quality: 80 })
  .toFile(dst)
  .then(() => {
    const ds = fs.statSync(dst).size;
    console.log("Output: " + (ds / 1024 / 1024).toFixed(2) + " MB");
    console.log("Saved: " + ((1 - ds / sz) * 100).toFixed(1) + "% smaller");
    console.log("Done → newbg.webp (1920x1080)");
  })
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
