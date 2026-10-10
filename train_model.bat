@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\activate.bat" call ".venv\Scripts\activate.bat"
echo Training the GCN and computing real evaluation metrics...
python -m backend.ml.train --epochs 300 --seed 42
pause
