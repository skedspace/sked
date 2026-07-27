@echo off
cd /d H:\scheduler
echo Converting newbg.png to newbg.webp...
node scripts/convert-hero.js
echo.
pause
