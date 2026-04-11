@echo off
echo ==========================================
echo   Fishing For Islands - Starting Game...
echo ==========================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install it from https://nodejs.org/
    echo Choose the LTS version.
    pause
    exit /b 1
)

echo Starting game server...
echo.
echo Your browser should open automatically.
echo If not, open http://localhost:5173/ manually.
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.
call npx vite --open
