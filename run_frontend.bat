@echo off
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Installing frontend dependencies - first run only...
  call npm install
)
echo Starting MedSafe AI frontend on http://localhost:5173
call npm run dev
pause
