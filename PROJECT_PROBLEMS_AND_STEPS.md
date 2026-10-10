# MedSafe AI - Project Audit, Problems, and Setup Steps

This document contains a complete diagnostic summary of the MedSafe AI project, all identified problems/blockers, and step-by-step instructions to get everything running.

---

## 1. Project Overview

- **Name**: MedSafe AI (Explainable AI for Personalized Medication Safety)
- **Architecture**:
  - **Backend**: FastAPI (`backend/main.py`), SQLite (`data/medsafe.db`), custom biomedical knowledge graph (`data/medicines.json`, `data/interactions.json`).
  - **Machine Learning**: 2-layer Graph Convolutional Network (GCN) link predictor (`backend/ml/`). Lightweight numpy inference (`backend/ml/inference.py`).
  - **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts (`frontend/`).
  - **OCR**: Label text extraction using Tesseract OCR & Pillow (`backend/services/ocr.py`).
  - **Assistant**: Rule-based intent parsing with optional Claude API enrichment (`backend/services/assistant.py`).

---

## 2. Identified Problems & Missing Components

When `check_project.py` and system checks were run on this machine, the following issues were found:

### Problem 1: Node.js Is Not Installed (Critical Blocker)
- **Status**: Neither `node` nor `npm` are installed or found on the system `PATH`.
- **Consequence**: The frontend cannot install dependencies (`cd frontend && npm install`), and the Vite dev server cannot run (`run_frontend.bat` fails).

### Problem 2: Python Virtual Environment & Dependencies Missing (Critical Blocker)
- **Status**: Python 3.13 is installed, but no `.venv` virtual environment exists in the project root.
- **Consequence**: Core libraries (`fastapi`, `uvicorn`, `pydantic`, `numpy`, `Pillow`, `pytesseract`, `torch`, `scikit-learn`, `httpx`) are not installed. `check_project.py` fails with 11 failed checks, and `test_core.py` fails on import.

### Problem 3: GCN Model Not Trained Yet (High Priority)
- **Status**: `models/medsafe_gcn.npz` and `models/metrics.json` do not exist.
- **Consequence**: The application falls back to a transparent graph-overlap heuristic instead of the Graph Neural Network, and the **Model & Evaluation** page displays "Not trained yet".

### Problem 4: Tesseract OCR Engine Missing (Functional Limitation)
- **Status**: `tesseract.exe` is not installed on PATH or in standard program directories.
- **Consequence**: Image label scanning will warn that Tesseract is not installed and fallback to manual medicine name entry.

### Problem 5: Missing `.env` Configuration File (Minor)
- **Status**: Only `.env.example` exists.
- **Consequence**: Custom Tesseract paths or optional API keys (such as `ANTHROPIC_API_KEY` for general chat queries) are not loaded unless `.env` is created.

---

## 3. Step-by-Step Resolution

### Step 1: Install Node.js (LTS)
Open PowerShell or Command Prompt and run:
```powershell
winget install OpenJS.NodeJS.LTS --source winget
```
*Restart your terminal after installation so that `node` and `npm` are recognized.*

---

### Step 2: Set Up Python Virtual Environment
From the project root (`medsafe-ai`):
```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```
*(Note: `torch` is ~125MB. If you want to skip it initially, remove `torch` from `requirements.txt`; the app runs with the heuristic).*

---

### Step 3: Install Frontend Packages
```powershell
cd frontend
npm install
cd ..
```

---

### Step 4: (Optional) Install Tesseract OCR
To enable label photo reading:
```powershell
winget install UB-Mannheim.TesseractOCR --source winget
```

---

### Step 5: Train the GCN Model
Train the graph neural network and generate `models/medsafe_gcn.npz` and `models/metrics.json`:
```powershell
.venv\Scripts\activate
python -m backend.ml.train --epochs 300 --seed 42
```
*(Or double-click `train_model.bat`)*.

---

### Step 6: Verify Everything
Run the self-check script:
```powershell
.venv\Scripts\activate
python check_project.py
```
Or double-click `CHECK_PROJECT.bat`. You should see:
```
ALL REQUIRED CHECKS PASSED
```

Run automated tests:
```powershell
python -m unittest discover -s tests -v
```
*(Or double-click `run_tests.bat`)*.

---

### Step 7: Run the Application
Start both backend and frontend:
- Double-click **`run_all.bat`**, **OR**
- Run separately:
  - Backend: `run_backend.bat` (accessible at http://127.0.0.1:8000, docs at http://127.0.0.1:8000/docs)
  - Frontend: `run_frontend.bat` (accessible at http://localhost:5173)

---

## 4. Subscription & Free Trial System

MedSafe AI includes a complete subscription and free trial engine:

| Plan | Price (INR) | Duration | Features |
| :--- | :--- | :--- | :--- |
| **3-Day Free Trial** | **₹0** (No card required) | 3 Days | Full access to GCN predictions, OCR scanner, AI assistant, patient profiles. |
| **Beginner Level** | **₹199 / month** | Monthly | Standard knowledge graph rules, up to 10 patients, label OCR, timetable scheduler. |
| **Pro Level** | **₹399 / month** | Monthly | Full 2-layer GCN neural reasoning, unlimited patients, priority OCR, complex polypharmacy reasoning, 24/7 support. |

- **Sign-Up Flow**: Every new user automatically starts with the **3-Day Free Trial**.
- **Pricing & Upgrade Page**: Available at `http://localhost:5173/#subscription` or via **Pricing & Plans** in the sidebar.
- **Active Plan Badge**: Displays directly in the bottom-left of the sidebar with countdown days remaining.
- **Payment Simulation**: Interactive checkout modal supports simulated UPI (GPay/PhonePe/Paytm), Card, and Net Banking for instant activation.

---

## 5. Elderly Care Voice Call & SMS Agent (For Non-Smartphone Users)

Designed specifically for elderly patients who use basic keypad mobile phones (Nokia, Samsung Guru, feature phones) or landlines without internet or touchscreen apps:

- **Elder Phone Configuration**: Enter the senior citizen's simple phone number (e.g. `+91 98765 43210`), respectful salutation (e.g. `Grandfather Sharma`, `Mrs. Savitri`), and language (**Telugu**, **Hindi**, or **English**).
- **Multilingual Call Agent & SMS Agent**:
  - **Telugu (తెలుగు)**: Speaks natural Telugu voice with proper respectful salutations (`గారు`), localized meal timings (అల్పాహారానికి ముందు, భోజనం తర్వాత), and dispatches Telugu feature phone SMS.
  - **Hindi (हिन्दी)**: Speaks authentic Hindi voice with respectful salutations (`जी`), meal timings (नाश्ते से पहले, खाने के बाद), and dispatches Hindi feature phone SMS.
  - **English**: Clear, slow Indian English cadence at 0.88x speed with clear speech audio.
- **Meal-Time & Tablet Reminders**: The agent reads the patient's schedule and announces exact tablets:
  - **Morning**: e.g., Omeprazole 20mg (1 capsule) — *30 minutes BEFORE breakfast with water*.
  - **Afternoon**: e.g., Aspirin 75mg (1 tablet) — *Immediately AFTER lunch with food*.
  - **Bedtime**: e.g., Warfarin 5mg (1 tablet) — *At bedtime with water*.
- **Interactive Call Agent Simulator**: A live feature phone simulator with realistic incoming call screen, telephone ringtone synthesizer, high-definition native Telugu (`te`), Hindi (`hi`), and English (`en`) audio speech synthesis streaming via `/api/elder-agent/tts`, scrollable native script transcript, and keypad `1` press to record medicine taken confirmation.
- **In-Simulator Language & Meal Period Switcher**:
  - Switch live between **Telugu (తెలుగు)**, **Hindi (हिन्दी)**, and **English** right inside the Voice Call Simulator and SMS Simulator with instant text and genuine regional audio speech updates.
  - Switch between meal times (**Morning / Before Breakfast**, **Lunch / After Lunch**, **Evening**, **Bedtime**) directly inside the simulator without having to re-open modals.
- **Feature Phone SMS Agent & Interactive Reply**:
  - Generates clean, high-contrast, GSM 7-bit compatible text messages formatted for basic monochrome screens (under 160 characters) in Telugu, Hindi, or English.
  - Interactive senior SMS reply simulator allows testing replies (`1` or `YES`) from basic phones, which instantly records elder confirmation in the audit log.
- **Dispatch History & Caregiver Audit Log**: Real-time table tracking all automated calls and SMS sent, delivery status, and elder confirmation timestamps.
- **Direct Link**: Accessible in the sidebar via **Elder Call & SMS Agent** or at `http://localhost:5173/#elder-agent`.
