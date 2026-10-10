@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
echo Starting MedSafe AI backend on http://127.0.0.1:8000  (API docs: /docs)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
