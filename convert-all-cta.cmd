@echo off
cd /d H:\scheduler
echo Converting cta images to webp...
node scripts/convert-all-cta.js
echo.
pause
