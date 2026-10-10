# MedSafe AI - Start Here (Windows)

Follow these steps in order. Each takes a minute or two.

## 1. Install Python
Download Python 3.10 or newer from https://www.python.org/downloads/ . On the first installer screen tick **"Add python.exe to PATH"**.

## 2. Install Node.js
Download the LTS version from https://nodejs.org/ and install with the defaults.

## 3. Install Tesseract (only needed for reading label photos)
Download the Windows installer from https://github.com/UB-Mannheim/tesseract/wiki and install to the default folder. If you skip this, the scanner still works: you just type the medicine name instead.

## 4. Open a terminal in this folder
Open the project folder in File Explorer, click the address bar, type `cmd` and press Enter.

## 5. Install dependencies
```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd frontend
npm install
cd ..
```
(`torch` is a large download. It is only used to train the model. If you want to skip it for now, remove the `torch` line from requirements.txt; the website still runs.)

## 6. Check everything
Double-click **CHECK_PROJECT.bat**. Do not continue until it says `ALL REQUIRED CHECKS PASSED`.

## 7. Train the model (recommended, takes a few minutes)
Double-click **train_model.bat**. It trains the graph neural network and writes real evaluation metrics to `models/metrics.json`. Until you do this, the Model & Evaluation page says "not trained yet" and the app uses a clearly labelled graph-overlap heuristic instead of the GNN.

## 8. Start the website
Double-click **run_all.bat**. It starts the backend (http://127.0.0.1:8000) and the frontend and opens http://localhost:5173 in your browser.

Or start them separately: `run_backend.bat`, then `run_frontend.bat`.

## Try it
1. Dashboard -> the **Demo Patient** (warfarin, aspirin, omeprazole) is already loaded.
2. Interaction Checker -> "Use Demo Patient's medicines" -> Analyze.
3. Click **Explain this result** to see the graph paths.
4. Scan Medicine -> upload a clear photo of a medicine box.
5. Open the chat button (bottom right) and type `Open scanner`.

## Troubleshooting
| Message | What to do |
|---|---|
| "MedSafe AI backend is unavailable" | Start `run_backend.bat` and keep its window open. |
| "Camera access is unavailable" | Allow camera permission in the browser (use `http://localhost:5173`), or use Upload. |
| "We couldn't confidently read the medicine label" | Retake a straight-on, well-lit photo, or type the name. |
| OCR says Tesseract not installed | Install it (step 3) or set `TESSERACT_CMD` in `.env`. |
| `python` not recognised | Reinstall Python and tick "Add to PATH". |

Run the automated tests any time with **run_tests.bat**.
