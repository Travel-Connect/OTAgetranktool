@echo off
echo ========================================
echo OTA Getrank Tool - Starting...
echo ========================================
echo.

:: Change directory to project root
echo [1/4] Changing directory...
cd /d "%~dp0"
if errorlevel 1 (
    echo       ERROR: Could not change directory!
    pause
    exit /b 1
)
echo       Current: %cd%
echo       Done.
echo.

:: Kill process using port 4500
echo [2/4] Checking for existing process on port 4500...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4500.*LISTENING"') do (
    echo       Found process PID: %%a - killing...
    taskkill /PID %%a /F >nul 2>&1
)
echo       Done.
echo.

:: Clean up Next.js dev lock (stale lock from previous crash)
echo [3/4] Cleaning up Next.js lock...
if exist "apps\web\.next\dev\lock" (
    del /f /q "apps\web\.next\dev\lock" >nul 2>&1
    echo       Removed stale lock file.
) else (
    echo       No stale lock.
)
echo       Done.
echo.

:: Check node_modules
echo [4/4] Checking node_modules...
if not exist "node_modules" (
    echo       ERROR: node_modules not found!
    echo       Please run 'pnpm install' first.
    pause
    exit /b 1
)
if not exist "apps\web\node_modules" (
    echo       ERROR: apps\web\node_modules not found!
    echo       Please run 'pnpm install' first.
    pause
    exit /b 1
)
echo       Found node_modules.
echo       Done.
echo.

:: Open browser after delay
echo Opening browser in 8 seconds...
echo WScript.Sleep 8000 > "%temp%\openOtaGetrank.vbs"
echo CreateObject("WScript.Shell").Run "http://localhost:4500", 1, False >> "%temp%\openOtaGetrank.vbs"
start "" wscript //nologo "%temp%\openOtaGetrank.vbs"
echo       Browser will open automatically.
echo.

echo ========================================
echo Web UI:  http://localhost:4500
echo Press Ctrl+C to stop the web server
echo ========================================
echo.

cd /d "%~dp0apps\web"
call npx next dev -p 4500

echo.
echo ========================================
echo Web server stopped.
echo ========================================
pause
