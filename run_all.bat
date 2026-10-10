@echo off
cd /d "%~dp0"
start "MedSafe AI backend" cmd /k "%~dp0run_backend.bat"
timeout /t 4 /nobreak >nul
start "MedSafe AI frontend" cmd /k "%~dp0run_frontend.bat"
timeout /t 8 /nobreak >nul
start "" http://localhost:5173
