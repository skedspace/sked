@echo off
cd /d "%~dp0"
echo ========================================
echo  Clearing Next.js build cache
echo ========================================
echo.

if exist ".next" (
    echo Deleting .next folder...
    rmdir /s /q ".next"
    echo Done — stale build cache removed.
) else (
    echo No .next folder found — nothing to clean.
)

echo.
echo ========================================
echo  Next step: Run "pnpm dev" to restart
echo  the dev server with a fresh build.
echo ========================================
pause
