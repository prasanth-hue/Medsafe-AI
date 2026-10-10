@echo off
cd /d "%~dp0"
echo ========================================================
echo             Push MedSafe AI to GitHub
echo ========================================================
echo.

REM Automatically detect portable Git if installed in user profile
if exist "%USERPROFILE%\.mingit\cmd\git.exe" (
    set "PATH=%USERPROFILE%\.mingit\cmd;%PATH%"
)

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
echo Target Repository: %REPO_URL%
echo.

if not exist ".git" (
    echo Initializing local git repository...
    git init
    git branch -M main
)

git config user.name "prasanth-hue"
git config user.email "prasanth-hue@users.noreply.github.com"

echo.
echo Staging project files...
git add .

echo.
echo Creating commit...
git commit -m "Initial commit: MedSafe AI application with Preymaker cinematic UI and GCN model"

git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo ========================================================
echo Pushing to GitHub (main branch)...
echo If a GitHub Sign-In window appears, please authorize it.
echo ========================================================
git push -u origin main

echo.
if errorlevel 1 (
    echo.
    echo [NOTE] Push requires GitHub authentication.
    echo If using a Personal Access Token (classic with 'repo' scope), run:
    echo     git push https://YOUR_TOKEN@github.com/prasanth-hue/Medsafe-AI.git main
) else (
    echo [SUCCESS] Project successfully pushed to https://github.com/prasanth-hue/Medsafe-AI!
)
echo.
pause
