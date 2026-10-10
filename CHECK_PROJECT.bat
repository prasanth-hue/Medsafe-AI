@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
python check_project.py
if errorlevel 1 (
  echo.
  echo CHECK FAILED. Fix the items marked FAIL, then run this again.
) else (
  echo.
  echo Python-side checks passed. Run run_tests.bat for the automated tests.
)
pause
