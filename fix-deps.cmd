@echo off
cd /d H:\scheduler
echo Restoring dependencies with pnpm via npx...
npx --yes pnpm@9.15.4 install --no-frozen-lockfile
echo.
echo Installing @radix-ui/react-accordion...
npx --yes pnpm@9.15.4 add @radix-ui/react-accordion
echo.
echo Done! You can now run: npm run dev
pause
