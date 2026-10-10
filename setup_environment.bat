@echo off
cd /d "%~dp0"
echo ========================================================
echo         MedSafe AI - Automated Environment Setup
echo ========================================================
echo.

:: 1. Check Python
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python was not found in PATH!
    echo Please install Python 3.10+ and make sure to check "Add python.exe to PATH".
    goto done
)

:: 2. Setup Python Virtual Environment
echo [1/4] Setting up Python virtual environment (.venv)...
if not exist ".venv\Scripts\activate.bat" (
    python -m venv .venv
)
call ".venv\Scripts\activate.bat"

echo [2/4] Installing Python requirements from requirements.txt...
python -m pip install --upgrade pip
pip install -r requirements.txt

:: 3. Check Node.js and setup frontend
echo.
echo [3/4] Checking Node.js and setting up frontend...
where node >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js is not found on your system!
    echo To install Node.js automatically, run:
    echo     winget install OpenJS.NodeJS.LTS --source winget
    echo or download from https://nodejs.org/
    echo Once installed, restart your terminal and run this script again.
) else (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

:: 4. Run Self-Check
echo.
echo [4/4] Running project verification check...
python check_project.py
echo.
echo Setup completed. Read PROJECT_PROBLEMS_AND_STEPS.md for next steps.

:done
pause
