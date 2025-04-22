@echo off
echo ===== Starting ContextualIntelligence UAT Environment =====
echo.

rem Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

rem Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
  set NODE_MAJOR=%%a
  set NODE_MINOR=%%b
  set NODE_PATCH=%%c
)
set NODE_MAJOR=%NODE_MAJOR:~1%

if %NODE_MAJOR% LSS 16 (
  echo WARNING: Node.js version should be 16 or higher.
  echo Current version: %NODE_MAJOR%.%NODE_MINOR%.%NODE_PATCH%
  echo.
)

echo Node.js version: %NODE_MAJOR%.%NODE_MINOR%.%NODE_PATCH%
echo.

rem Check if npm packages are installed
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
  )
)

echo.
echo Starting ContextualIntelligence application for UAT...
echo Access the application at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

rem Start the application in dev mode
call npm run dev

rem If we get here, something went wrong
echo.
echo Server stopped unexpectedly.
pause 