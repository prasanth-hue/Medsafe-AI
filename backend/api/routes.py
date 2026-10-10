from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile

from backend.ml.inference import get_predictor
from backend.models.schemas import (
    ChatIn, CheckIn, ElderConfigIn, ExplainIn, LoginIn, PatientIn,
    PatientMedicineIn, RegisterIn, ScheduleIn, SubscriptionIn, TriggerReminderIn
)
from backend.services import db, elder_agent, interactions, ocr
from backend.services.assistant import Assistant
from backend.services.knowledge import DATASET_LABEL, DISCLAIMER, PRESCRIPTION_NOTE, get_knowledge

router = APIRouter(prefix="/api")
k = get_knowledge()
assistant = Assistant(k)


def _clean_list(items):
    return [i.strip() for i in items if i and i.strip()]


def _med_id(text: str) -> str:
    mid = k.resolve(text)
    if not mid:
        raise HTTPException(404, f"'{text}' is not in the supported medicine list. Check the spelling or search Medicine Information.")
    return mid


def _patient_or_404(pid: int) -> dict:
    p = db.get_patient(pid)
    if not p:
        raise HTTPException(404, "Patient not found. It may have been deleted.")
    return p


@router.get("/health")
def health():
    p = get_predictor()
    return {"status": "ok", "model_trained": p.trained, "model": p.model_name, "medicines": len(k.medicines),
            "ocr_available": _tesseract_available()}


def _tesseract_available() -> bool:
    try:
        import pytesseract
        ocr.configure_tesseract(pytesseract)
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        pass
    try:
        import winocr
        return True
    except Exception:
        return False


# ---------- patients ----------
@router.get("/patients")
def patients():
    return db.list_patients()


@router.post("/patients")
def create_patient(body: PatientIn):
    d = body.dict()
    d["allergies"], d["conditions"] = _clean_list(d["allergies"]), _clean_list(d["conditions"])
    return db.create_patient(d)


@router.put("/patients/{pid}")
def update_patient(pid: int, body: PatientIn):
    d = body.dict()
    d["allergies"], d["conditions"] = _clean_list(d["allergies"]), _clean_list(d["conditions"])
    p = db.update_patient(pid, d)
    if not p:
        raise HTTPException(404, "Patient not found.")
    return p


@router.delete("/patients/{pid}")
def delete_patient(pid: int):
    if not db.delete_patient(pid):
        raise HTTPException(404, "Patient not found.")
    return {"deleted": True}


@router.post("/patients/{pid}/medicines")
def add_med(pid: int, body: PatientMedicineIn):
    _patient_or_404(pid)
    db.add_patient_medicine(pid, _med_id(body.medicine))
    return db.get_patient(pid)


@router.delete("/patients/{pid}/medicines/{medicine_id}")
def remove_med(pid: int, medicine_id: str):
    _patient_or_404(pid)
    db.remove_patient_medicine(pid, medicine_id)
    return db.get_patient(pid)


# ---------- schedule ----------
def _sched_view(s: dict) -> dict:
    m = k.medicines.get(s["medicine_id"], {})
    s = dict(s)
    s["medicine_name"] = m.get("name", s["medicine_id"])
    has_instruction = bool(s.get("instruction") or s.get("dose") or s.get("frequency") or (s.get("food") not in (None, "", "Not specified")))
    s["timing_note"] = None if has_instruction else "Prescription timing not provided. Please verify the label/prescription."
    return s


def _sched_payload(body: ScheduleIn) -> dict:
    d = body.dict()
    d["medicine_id"] = _med_id(body.medicine)
    if d["period"] not in db.PERIODS:
        raise HTTPException(422, "Time of day must be Morning, Afternoon, Evening or Bedtime.")
    if d["food"] not in db.FOOD:
        d["food"] = "Other"
    return d


@router.get("/patients/{pid}/schedule")
def schedule(pid: int):
    _patient_or_404(pid)
    return {"items": [_sched_view(s) for s in db.list_schedule(pid)], "periods": db.PERIODS, "food_options": db.FOOD,
            "prescription_note": PRESCRIPTION_NOTE}


@router.post("/patients/{pid}/schedule")
def add_schedule(pid: int, body: ScheduleIn):
    _patient_or_404(pid)
    d = _sched_payload(body)
    db.add_patient_medicine(pid, d["medicine_id"])
    return _sched_view(db.create_schedule(pid, d))


@router.put("/schedule/{sid}")
def edit_schedule(sid: int, body: ScheduleIn):
    s = db.update_schedule(sid, _sched_payload(body))
    if not s:
        raise HTTPException(404, "Schedule entry not found.")
    return _sched_view(s)


@router.delete("/schedule/{sid}")
def remove_schedule(sid: int):
    if not db.delete_schedule(sid):
        raise HTTPException(404, "Schedule entry not found.")
    return {"deleted": True}


# ---------- medicines ----------
@router.get("/medicines")
def medicines(q: str = ""):
    return k.search(q)


@router.get("/medicines/{name}")
def medicine(name: str):
    mid = k.resolve(name)
    if not mid:
        raise HTTPException(404, f"No information found for '{name}'. Check the spelling or browse the supported list.")
    return k.public(mid)


# ---------- scanner ----------
@router.post("/scan")
async def scan(file: UploadFile = File(...), patient_id: Optional[int] = Form(None)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ocr.ALLOWED and not (file.content_type or "").startswith("image/"):
        raise HTTPException(415, "Unsupported file type. Please upload a .jpg, .jpeg, .png or .webp image.")
    data = await file.read()
    if not data:
        raise HTTPException(400, "The uploaded file is empty. Please choose another image.")
    try:
        result = ocr.read_label(data, k)
    except ocr.OCRError as exc:
        raise HTTPException(422, str(exc))
    db.record_scan(patient_id, result["text"], result["detected"]["id"] if result["detected"] else None, result["confident"])
    return result


# ---------- interactions / XAI ----------
@router.post("/interactions/check")
def check(body: CheckIn):
    patient = db.get_patient(body.patient_id) if body.patient_id else None
    result = interactions.check(body.medicines, patient, k)
    if len(result["medicines"]) < 2:
        result["message"] = "Enter at least two supported medicines to analyse combinations."
    return result


@router.post("/interactions/explain")
def explain(body: ExplainIn):
    patient = db.get_patient(body.patient_id) if body.patient_id else None
    a, b = _med_id(body.a), _med_id(body.b)
    if a == b:
        raise HTTPException(422, "Choose two different medicines.")
    return interactions.explain(a, b, patient, k)


# ---------- model ----------
@router.get("/model/info")
def model_info():
    p = get_predictor()
    return {"trained": p.trained, "model": p.model_name, "graph": k.graph_summary(),
            "architecture": ["Knowledge graph (drug, protein, enzyme, disease, pathway, adverse effect)", "Node features (learned embedding + node type)",
                             "GCN layer 1 (A_hat X W1, ReLU, dropout)", "GCN layer 2 (A_hat H W2)",
                             "Pair decoder: [h_u * h_v, |h_u - h_v|] -> MLP -> sigmoid", "Interaction score -> curated risk level + explanation"],
            "dataset_label": DATASET_LABEL, "disclaimer": DISCLAIMER}


@router.get("/model/metrics")
def model_metrics():
    m = get_predictor().metrics()
    if not m:
        return {"available": False, "message": "The GCN has not been trained yet, so no metrics exist. Run 'python -m backend.ml.train' (see START_HERE.md). MedSafe AI never shows made-up metrics."}
    return {"available": True, **m}


@router.get("/graph")
def graph():
    return k.graph()


# ---------- evidence ----------
@router.get("/evidence")
def evidence(drug: str = "", other: str = ""):
    a = k.resolve(drug) if drug else None
    if drug and not a:
        raise HTTPException(404, f"No evidence records for '{drug}'.")
    b = k.resolve(other) if other else None
    if a and b and a != b:
        return {"items": k.evidence_for_pair(a, b)}
    if a:
        return {"items": k.evidence_for_drug(a)}
    items = []
    for mid in sorted(k.medicines):
        items.extend(k.evidence_for_drug(mid)[:1])
    return {"items": items, "note": "Local demonstration summaries. Open a medicine for official-source search links."}


# ---------- assistant & dashboard ----------
@router.post("/chat")
def chat(body: ChatIn):
    patient = db.get_patient(body.patient_id) if body.patient_id else None
    return assistant.reply(body.message, patient)


@router.get("/dashboard/{pid}")
def dashboard(pid: int):
    p = _patient_or_404(pid)
    res = interactions.check(p["medicines"], p, k) if len(p["medicines"]) >= 2 else None
    sched = db.list_schedule(pid)
    scan_row = db.last_scan(pid)
    pr = get_predictor()
    return {
        "patient": p,
        "medicines": [{"id": m, "name": k.medicines[m]["name"]} for m in p["medicines"] if m in k.medicines],
        "alert_counts": res["counts"] if res else {"HIGH": 0, "MODERATE": 0, "LOW": 0, "UNKNOWN": 0},
        "overall_risk": res["overall_risk"] if res else None,
        "top_alerts": [{"a": x["a_name"], "b": x["b_name"], "risk": x["risk"], "summary": x["summary"]} for x in (res["pairs"][:3] if res else [])],
        "schedule_count": len(sched),
        "last_scan": ({"created_at": scan_row["created_at"], "medicine": k.medicines[scan_row["medicine_id"]]["name"]
                       if scan_row["medicine_id"] in k.medicines else None, "confident": bool(scan_row["confident"])} if scan_row else None),
        "model": {"trained": pr.trained, "name": pr.model_name},
        "disclaimer": DISCLAIMER,
    }


# ---------- authentication ----------
@router.post("/auth/login")
def login(body: LoginIn):
    user = db.authenticate_user(body.identifier, body.password)
    if not user:
        raise HTTPException(401, "Invalid email/phone or password. Please try again.")
    return {"status": "ok", "user": user, "token": f"medsafe_token_{user['id']}"}


@router.post("/auth/register")
def register(body: RegisterIn):
    if db.get_user_by_email(body.email):
        raise HTTPException(409, "An account with this email address already exists.")
    user = db.create_user(body.name, body.email, body.phone, body.password, body.role)
    return {"status": "ok", "user": user, "token": f"medsafe_token_{user['id']}"}


@router.get("/auth/demo")
def demo_credentials():
    return {
        "email": "doctor@medsafe.ai",
        "phone": "+1 555-019-2834",
        "password": "medsafe123",
        "role": "Clinician",
        "name": "Dr. Sarah Mitchell",
    }


@router.post("/auth/guest")
def guest_login():
    return {
        "status": "ok",
        "user": {
            "id": 9999,
            "name": "Guest Clinician",
            "email": "guest@medsafe.ai",
            "phone": "+1 555-000-0000",
            "role": "Guest",
            "plan": "trial",
            "plan_name": "3-Day Free Trial",
            "plan_price_inr": 0,
            "days_left": 3,
            "created_at": "2026-10-09T00:00:00",
        },
        "token": "medsafe_guest_token",
    }


# ---------- subscription & plans ----------
SUBSCRIPTION_PLANS = [
    {
        "id": "trial",
        "name": "3-Day Free Trial",
        "price_inr": 0,
        "price_display": "₹0",
        "billing": "Free for 3 days",
        "badge": "No Card Required",
        "description": "Full access to all Pro features for 3 days to test MedSafe AI.",
        "features": [
            "Unlimited Drug Interaction Checks",
            "Full GCN Neural Prediction",
            "Interactive Explainable AI Bio-Graph",
            "Prescription Label Photo Scanner (OCR)",
            "Patient Profiles & Medication Schedule",
            "Full AI Clinical Assistant",
        ],
        "button_text": "Start 3-Day Free Trial",
    },
    {
        "id": "beginner",
        "name": "Beginner Level",
        "price_inr": 199,
        "price_display": "₹199 / month",
        "billing": "Billed monthly (₹199)",
        "badge": "Starter",
        "description": "Ideal for individual practitioners, nursing staff, clinics, and medical students.",
        "features": [
            "Unlimited Drug-Drug Interaction Checks",
            "Standard Biomedical Knowledge Graph Access",
            "Prescription Label Photo Scanner (OCR)",
            "Up to 10 Patient Profiles & Daily Timetables",
            "Curated Pharmacology Mechanism Explanations",
            "Email & Community Decision-Support",
        ],
        "button_text": "Choose Beginner (₹199/mo)",
    },
    {
        "id": "pro",
        "name": "Pro Level",
        "price_inr": 399,
        "price_display": "₹399 / month",
        "billing": "Billed monthly (₹399)",
        "badge": "Most Popular",
        "popular": True,
        "description": "Advanced clinical decision-support with deep neural network reasoning for hospitals and doctors.",
        "features": [
            "Everything in Beginner, plus:",
            "Full 2-Layer GCN Neural Network Deep Reasoning",
            "Unlimited Patient Profiles & Timetables",
            "Priority High-Accuracy OCR & Label Reading",
            "Multi-Drug Complex Polypharmacy Attributions",
            "AI Assistant with Patient Contextual Guidance",
            "Export Safety Records & Clinical PDF Summaries",
            "24/7 Priority Support",
        ],
        "button_text": "Upgrade to Pro (₹399/mo)",
    },
]


@router.get("/subscription/plans")
def get_plans():
    return {"plans": SUBSCRIPTION_PLANS}


@router.post("/subscription/subscribe")
def subscribe(body: SubscriptionIn):
    if body.plan not in ("trial", "beginner", "pro"):
        raise HTTPException(422, "Invalid plan selected. Choose 'trial', 'beginner', or 'pro'.")
    user = db.update_subscription(body.user_id, body.plan)
    if not user:
        raise HTTPException(404, "User not found.")
    return {
        "status": "ok",
        "message": f"Successfully activated {user['plan_name']}!",
        "user": user,
    }


@router.get("/subscription/status/{uid}")
def subscription_status(uid: int):
    user = db.get_user_by_id(uid)
    if not user:
        raise HTTPException(404, "User not found.")
    return {
        "plan": user["plan"],
        "plan_name": user["plan_name"],
        "plan_price_inr": user["plan_price_inr"],
        "days_left": user["days_left"],
        "status": user["subscription_status"],
        "expires_at": user["plan_expires_at"],
    }


# ---------- elder agent (voice calls & sms for non-smartphone users) ----------
@router.get("/elder-agent/status/{pid}")
def elder_status(pid: int, lang: Optional[str] = None, period: Optional[str] = None):
    _patient_or_404(pid)
    try:
        return elder_agent.get_patient_elder_status(pid, lang=lang, period=period)
    except Exception as exc:
        raise HTTPException(400, str(exc))


@router.post("/elder-agent/config")
def save_elder_config(body: ElderConfigIn):
    _patient_or_404(body.patient_id)
    updated = db.update_elder_config(
        body.patient_id,
        body.elder_phone,
        body.elder_lang,
        body.reminder_channel,
        body.elder_enabled,
        body.elder_salutation,
    )
    if not updated:
        raise HTTPException(404, "Patient not found.")
    return {"status": "ok", "message": "Elderly phone reminder settings saved.", "patient": updated}


@router.post("/elder-agent/call")
def trigger_call(body: TriggerReminderIn):
    _patient_or_404(body.patient_id)
    try:
        return elder_agent.send_voice_call(body.patient_id, body.period, lang=body.lang, test=True)
    except Exception as exc:
        raise HTTPException(400, str(exc))


@router.post("/elder-agent/sms")
def trigger_sms(body: TriggerReminderIn):
    _patient_or_404(body.patient_id)
    try:
        return elder_agent.send_sms(body.patient_id, body.period, lang=body.lang, test=True)
    except Exception as exc:
        raise HTTPException(400, str(exc))


@router.get("/elder-agent/logs")
def get_reminder_logs(patient_id: Optional[int] = None, limit: int = 50):
    return {"logs": db.list_reminder_logs(patient_id=patient_id, limit=limit)}


@router.post("/elder-agent/confirm/{log_id}")
def confirm_reminder(log_id: int):
    log = db.confirm_reminder_log(log_id, status="confirmed")
    if not log:
        raise HTTPException(404, "Log record not found.")
    return {"status": "ok", "message": "Medicine consumption confirmed by elder via keypad/voice.", "log": log}


@router.get("/elder-agent/tts")
def stream_elder_tts(text: str, lang: str = "te"):
    if not text or not text.strip():
        raise HTTPException(400, "Text parameter is required.")
    try:
        audio = elder_agent.synthesize_speech_audio(text.strip(), lang=lang.strip())
        if not audio:
            raise HTTPException(500, "Audio synthesis produced empty output.")
        return Response(content=audio, media_type="audio/mpeg", headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": 'inline; filename="elder_reminder.mp3"',
        })
    except Exception as exc:
        raise HTTPException(500, str(exc))
