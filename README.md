# MedSafe AI
**Explainable AI for Personalized Medication Safety**

An educational and clinical decision-support prototype. It does **not** diagnose, prescribe, or replace a healthcare professional.

## What it does
- Reads medicine names from photos (camera or upload, Tesseract OCR) and asks you to confirm; manual entry always available.
- Maintains patient profiles with allergies, conditions, medicines and a prescription-based schedule.
- Checks every pair among multiple medicines: risk level (HIGH / MODERATE / LOW / UNKNOWN), mechanism, clinical concern, model score, evidence.
- Explains *why* with a knowledge-graph path diagram (drug -> enzyme/pathway/adverse effect <- drug).
- Chat assistant (works offline, optional Claude API) that answers from the local database and navigates the app.
- Model & Evaluation page that shows only metrics produced by the training script.

## Architecture
```
frontend/ (React + TS + Vite + Tailwind)  --/api-->  backend/ (FastAPI)
                                                      |- services/  knowledge, interactions, ocr, assistant, db (SQLite)
                                                      |- ml/        graph, model (PyTorch GCN), train, inference (numpy)
data/ medicines.json, interactions.json      models/ medsafe_gcn.npz, metrics.json (created by training)
```
**Pipeline:** medicine input -> identification -> knowledge graph (drug, protein, enzyme, disease, pathway, adverse effect nodes) -> 2-layer GCN + pair decoder -> risk assessment -> graph-path explanation -> evidence -> patient-context notes.

### How risk is decided (be precise about this)
- **Risk level** for a pair comes from the curated record in `data/interactions.json`.
- **Model score** is the GCN's interaction probability, shown beside it. For pairs *not* in the database the risk is `UNKNOWN`; if the model scores them >= 0.6 they are flagged "possible, unverified". The app never labels an unrecorded pair "safe".
- Curated pairs were in the training graph, so their model scores do not demonstrate generalisation. Held-out metrics do.
- Explanations are **path-based attribution over the knowledge graph** (shared enzymes, targets, pathways, adverse effects). They are not gradient attributions of the network, and the UI says so.

### Model and honesty notes
- The GCN is a dense implementation (`A_hat X W`), mathematically what PyTorch Geometric's `GCNConv` computes at this size; PyG is not required.
- Training uses leakage-safe link prediction: validation/test pairs are removed from the adjacency, and part of the training positives is hidden each epoch.
- `train.py` reports a held-out test split **and** 5-fold cross-validation. With only 45 positive pairs both are noisy; the UI says so.
- The dataset is a small, hand-curated **demonstration** knowledge base. It is not DrugBank or any licensed dataset and is not exhaustive.
- Evidence entries are either local demo summaries or **search links** to MedlinePlus, DailyMed and PubMed. No article is cited as saying anything specific.

## Run
See **START_HERE.md**. Short version: `pip install -r requirements.txt`, `cd frontend && npm install`, then `run_all.bat` (optionally `train_model.bat` first).

Manual: `python -m uvicorn backend.main:app --port 8000` and `npm --prefix frontend run dev`. Interactive API docs at http://127.0.0.1:8000/docs.

## Tests
`python -m unittest discover -s tests -v`  (core logic runs with numpy/Pillow only; API tests need fastapi + httpx).

## Configuration
See `.env.example`. Nothing is required. `ANTHROPIC_API_KEY` is optional and only used for general chat questions.

## Limits
Not exhaustive (28 medicines, 45 interaction pairs). OCR reads printed text, not pills. Doses and timing are never inferred. Always verify with a pharmacist or the official label.
