"""Environment and project self-check. Exit code 0 only if every REQUIRED check passes."""
import importlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
results = []  # (status, name, detail)


def record(ok, name, detail="", required=True):
    results.append(("PASS" if ok else ("FAIL" if required else "WARN"), name, detail))


record(sys.version_info >= (3, 10), "Python 3.10+", sys.version.split()[0])
for mod, req in [("fastapi", True), ("uvicorn", True), ("multipart", True), ("pydantic", True), ("PIL", True), ("numpy", True),
                 ("pytesseract", True), ("sklearn", False), ("torch", False), ("httpx", False)]:
    try:
        m = importlib.import_module(mod)
        record(True, f"package {mod}", getattr(m, "__version__", ""), req)
    except Exception as e:
        record(False, f"package {mod}", "missing" + ("" if req else " (only needed for training/tests)"), req)

record(shutil.which("tesseract") is not None or any(os.path.exists(p) for p in (r"C:\Program Files\Tesseract-OCR\tesseract.exe",)) or bool(os.environ.get("TESSERACT_CMD")),
       "Tesseract OCR program", "found" if shutil.which("tesseract") else "not on PATH (OCR will fall back to manual entry)", required=False)

for rel in ["backend/main.py", "backend/api/routes.py", "backend/services/knowledge.py", "backend/services/interactions.py", "backend/services/ocr.py",
            "backend/services/assistant.py", "backend/services/db.py", "backend/ml/train.py", "backend/ml/inference.py", "data/medicines.json",
            "data/interactions.json", "frontend/package.json", "frontend/src/App.tsx", "frontend/src/pages/Scanner.tsx", "requirements.txt", "START_HERE.md"]:
    record((ROOT / rel).exists(), f"file {rel}")

record((ROOT / "frontend" / "node_modules").exists(), "frontend dependencies installed", "run: cd frontend && npm install")
record(shutil.which("node") is not None, "Node.js available", subprocess.run(["node", "--version"], capture_output=True, text=True, shell=os.name == "nt").stdout.strip() if shutil.which("node") else "missing")

try:
    importlib.import_module("backend.services.knowledge")
    importlib.import_module("backend.services.interactions")
    importlib.import_module("backend.services.ocr")
    importlib.import_module("backend.services.assistant")
    record(True, "backend core imports")
except Exception as e:
    record(False, "backend core imports", repr(e))
try:
    importlib.import_module("backend.main")
    record(True, "backend.main (FastAPI app) imports")
except Exception as e:
    record(False, "backend.main (FastAPI app) imports", repr(e))

record((ROOT / "models" / "medsafe_gcn.npz").exists(), "trained GCN model", "run train_model.bat (website still works with a labelled heuristic)", required=False)

width = max(len(r[1]) for r in results)
for status, name, detail in results:
    print(f"[{status}] {name.ljust(width)}  {detail}")
failed = [r for r in results if r[0] == "FAIL"]
print()
print("ALL REQUIRED CHECKS PASSED" if not failed else f"{len(failed)} REQUIRED CHECK(S) FAILED - see above")
sys.exit(1 if failed else 0)
