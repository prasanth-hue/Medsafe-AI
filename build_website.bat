@echo off
cd /d "%~dp0"
echo ========================================================
echo        Building MedSafe AI Production Website
echo ========================================================
echo.

cd frontend
if not exist node_modules (
  echo Installing frontend dependencies...
  call npm install
)
echo Building static web bundle (Vite)...
call npm run build
cd ..

if exist "frontend\dist" (
  echo.
  echo ========================================================
  echo [SUCCESS] Production build created in frontend\dist!
  echo ========================================================
  echo FastAPI is configured to automatically serve this web app.
  echo To start the unified website on http://localhost:8000:
  echo.
  echo   1. call .venv\Scripts\activate
  echo   2. python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
  echo.
  echo You can also run run_backend.bat and open http://localhost:8000.
) else (
  echo.
  echo [ERROR] Build failed. Please make sure Node.js is installed.
)
echo.
pause
