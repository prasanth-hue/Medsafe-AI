@echo off
cd /d "%~dp0"
echo ========================================================
echo             Push MedSafe AI to GitHub
echo ========================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH!
    echo.
    echo To install Git, run:
    echo     winget install Git.Git --source winget
    echo.
    echo After installing Git, restart this window and run push_to_github.bat again.
    echo.
    pause
    exit /b
)

set REPO_URL=https://github.com/prasanth-hue/Medsafe-AI.git
echo Repository URL: %REPO_URL%


if not exist ".git" (
    echo.
    echo Initializing local git repository...
    git init
    git branch -M main
)

echo.
echo Staging project files...
git add .

echo.
echo Creating commit...
git commit -m "Initial commit: MedSafe AI application"

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo Pushing to GitHub (main branch)...
git push -u origin main

echo.
if errorlevel 1 (
    echo [NOTE] If git requested credentials, log in with your GitHub account.
) else (
    echo [SUCCESS] Project successfully pushed to GitHub!
)
echo.
pause
