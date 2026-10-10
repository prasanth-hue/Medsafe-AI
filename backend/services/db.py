"""SQLite persistence (stdlib). All SQL lives here so another backend (PostgreSQL) can replace it later."""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.services.knowledge import ROOT

DB_PATH = os.environ.get("MEDSAFE_DB", str(ROOT / "data" / "medsafe.db"))
PERIODS = ["Morning", "Afternoon", "Evening", "Bedtime"]
FOOD = ["Before breakfast", "After breakfast", "Before lunch", "After lunch", "Before dinner", "After dinner",
        "With food", "Empty stomach", "Bedtime", "Other", "Not specified"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS patients(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, age INTEGER, gender TEXT DEFAULT '',
  allergies TEXT DEFAULT '[]', conditions TEXT DEFAULT '[]', notes TEXT DEFAULT '',
  is_demo INTEGER DEFAULT 0,
  elder_phone TEXT DEFAULT '', elder_lang TEXT DEFAULT 'en', reminder_channel TEXT DEFAULT 'both',
  elder_enabled INTEGER DEFAULT 1, elder_salutation TEXT DEFAULT '',
  created_at TEXT);
CREATE TABLE IF NOT EXISTS patient_medicines(
  id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, medicine_id TEXT NOT NULL, added_at TEXT,
  UNIQUE(patient_id, medicine_id));
CREATE TABLE IF NOT EXISTS schedule(
  id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL, medicine_id TEXT NOT NULL,
  dose TEXT DEFAULT '', frequency TEXT DEFAULT '', period TEXT DEFAULT 'Morning', time TEXT DEFAULT '',
  food TEXT DEFAULT 'Not specified', instruction TEXT DEFAULT '', notes TEXT DEFAULT '', created_at TEXT);
CREATE TABLE IF NOT EXISTS scans(
  id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER, text TEXT, medicine_id TEXT, confident INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT DEFAULT 'Clinician',
  plan TEXT DEFAULT 'trial', trial_ends_at TEXT, plan_expires_at TEXT, subscription_status TEXT DEFAULT 'active',
  created_at TEXT);
CREATE TABLE IF NOT EXISTS reminder_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  channel TEXT NOT NULL,
  period TEXT DEFAULT 'Morning',
  medicines TEXT DEFAULT '[]',
  message_text TEXT NOT NULL,
  audio_script TEXT,
  status TEXT DEFAULT 'delivered',
  call_duration_sec INTEGER DEFAULT 0,
  confirmed_at TEXT,
  created_at TEXT);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _days_from_now(days: int) -> str:
    from datetime import timedelta
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat(timespec="seconds")


def _hash_pw(password: str) -> str:
    import hashlib
    return hashlib.sha256(("medsafe_salt_" + password).encode("utf-8")).hexdigest()


@contextmanager
def conn():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init_db(seed_demo: bool = True) -> None:
    with conn() as c:
        c.executescript(SCHEMA)
        # Migrate columns for users table if upgrading
        cols = [r["name"] for r in c.execute("PRAGMA table_info(users)").fetchall()]
        if "plan" not in cols:
            c.execute("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'trial'")
        if "trial_ends_at" not in cols:
            c.execute("ALTER TABLE users ADD COLUMN trial_ends_at TEXT")
        if "plan_expires_at" not in cols:
            c.execute("ALTER TABLE users ADD COLUMN plan_expires_at TEXT")
        if "subscription_status" not in cols:
            c.execute("ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'active'")

        # Migrate columns for patients table (Elder care feature phone support)
        p_cols = [r["name"] for r in c.execute("PRAGMA table_info(patients)").fetchall()]
        if "elder_phone" not in p_cols:
            c.execute("ALTER TABLE patients ADD COLUMN elder_phone TEXT DEFAULT ''")
        if "elder_lang" not in p_cols:
            c.execute("ALTER TABLE patients ADD COLUMN elder_lang TEXT DEFAULT 'en'")
        if "reminder_channel" not in p_cols:
            c.execute("ALTER TABLE patients ADD COLUMN reminder_channel TEXT DEFAULT 'both'")
        if "elder_enabled" not in p_cols:
            c.execute("ALTER TABLE patients ADD COLUMN elder_enabled INTEGER DEFAULT 1")
        if "elder_salutation" not in p_cols:
            c.execute("ALTER TABLE patients ADD COLUMN elder_salutation TEXT DEFAULT ''")

        # Ensure reminder_logs table exists
        c.execute("""
        CREATE TABLE IF NOT EXISTS reminder_logs(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER NOT NULL,
          patient_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          channel TEXT NOT NULL,
          period TEXT DEFAULT 'Morning',
          medicines TEXT DEFAULT '[]',
          message_text TEXT NOT NULL,
          audio_script TEXT,
          status TEXT DEFAULT 'delivered',
          call_duration_sec INTEGER DEFAULT 0,
          confirmed_at TEXT,
          created_at TEXT);
        """)

        if seed_demo and c.execute("SELECT COUNT(*) FROM patients").fetchone()[0] == 0:
            cur = c.execute(
                "INSERT INTO patients(name,age,gender,allergies,conditions,notes,elder_phone,elder_lang,reminder_channel,elder_enabled,elder_salutation,is_demo,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,1,?)",
                ("Demo Patient", 72, "Not specified", json.dumps(["None recorded"]), json.dumps(["Hypertension", "Acid Reflux"]),
                 "DEMO DATA for testing only. Non-smartphone elder test profile.",
                 "+91 98765 43210", "en", "both", 1, "Grandfather Sharma", _now()))
            pid = cur.lastrowid
            for mid in ("warfarin", "aspirin", "omeprazole"):
                c.execute("INSERT INTO patient_medicines(patient_id,medicine_id,added_at) VALUES(?,?,?)", (pid, mid, _now()))
        else:
            # Ensure demo patient has elder phone and sample schedule if missing
            demo_p = c.execute("SELECT id, elder_phone FROM patients WHERE id=1").fetchone()
            if demo_p and not demo_p["elder_phone"]:
                c.execute("UPDATE patients SET elder_phone='+91 98765 43210', elder_salutation='Grandfather Sharma', age=72 WHERE id=1")

        # Seed sample schedule items for demo patient if empty
        if c.execute("SELECT COUNT(*) FROM schedule WHERE patient_id=1").fetchone()[0] == 0:
            c.execute(
                "INSERT INTO schedule(patient_id,medicine_id,dose,frequency,period,time,food,instruction,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (1, "omeprazole", "20 mg (1 capsule)", "Once daily", "Morning", "08:00 AM", "Before breakfast",
                 "Take 30 minutes before breakfast with a full glass of water. Swallow whole.", "Avoid lying down for 30 mins", _now())
            )
            c.execute(
                "INSERT INTO schedule(patient_id,medicine_id,dose,frequency,period,time,food,instruction,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (1, "aspirin", "75 mg (1 tablet)", "Once daily", "Afternoon", "01:00 PM", "After lunch",
                 "Take immediately after lunch with water to protect stomach lining.", "Do not take on an empty stomach", _now())
            )
            c.execute(
                "INSERT INTO schedule(patient_id,medicine_id,dose,frequency,period,time,food,instruction,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (1, "warfarin", "5 mg (1 tablet)", "Once daily", "Bedtime", "09:30 PM", "Bedtime",
                 "Take at bedtime with water. Maintain consistent green vegetable intake.", "Monitor for bruising", _now())
            )

        if c.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
            c.execute(
                "INSERT INTO users(name,email,phone,password_hash,role,plan,trial_ends_at,plan_expires_at,subscription_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                ("Dr. Sarah Mitchell", "doctor@medsafe.ai", "+15550192834", _hash_pw("medsafe123"), "Clinician", "pro", None, _days_from_now(30), "active", _now()))
        else:
            # Ensure demo user has pro plan set
            c.execute("UPDATE users SET plan='pro', plan_expires_at=?, subscription_status='active' WHERE email='doctor@medsafe.ai' AND (plan IS NULL OR plan='')",
                      (_days_from_now(30),))


def _patient(row: sqlite3.Row, c: sqlite3.Connection) -> Dict[str, Any]:
    keys = row.keys()
    meds = [r["medicine_id"] for r in c.execute(
        "SELECT medicine_id FROM patient_medicines WHERE patient_id=? ORDER BY id", (row["id"],))]
    return {
        "id": row["id"],
        "name": row["name"],
        "age": row["age"],
        "gender": row["gender"],
        "allergies": json.loads(row["allergies"] or "[]"),
        "conditions": json.loads(row["conditions"] or "[]"),
        "notes": row["notes"],
        "is_demo": bool(row["is_demo"]),
        "medicines": meds,
        "elder_phone": row["elder_phone"] if "elder_phone" in keys else "",
        "elder_lang": row["elder_lang"] if "elder_lang" in keys else "en",
        "reminder_channel": row["reminder_channel"] if "reminder_channel" in keys else "both",
        "elder_enabled": bool(row["elder_enabled"]) if "elder_enabled" in keys else True,
        "elder_salutation": row["elder_salutation"] if "elder_salutation" in keys else "",
    }


def list_patients() -> List[dict]:
    with conn() as c:
        return [_patient(r, c) for r in c.execute("SELECT * FROM patients ORDER BY id")]


def get_patient(pid: int) -> Optional[dict]:
    with conn() as c:
        r = c.execute("SELECT * FROM patients WHERE id=?", (pid,)).fetchone()
        return _patient(r, c) if r else None


def create_patient(d: dict) -> dict:
    with conn() as c:
        cur = c.execute(
            "INSERT INTO patients(name,age,gender,allergies,conditions,notes,elder_phone,elder_lang,reminder_channel,elder_enabled,elder_salutation,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (d["name"].strip(), d.get("age"), d.get("gender", ""), json.dumps(d.get("allergies", [])),
             json.dumps(d.get("conditions", [])), d.get("notes", ""), d.get("elder_phone", ""),
             d.get("elder_lang", "en"), d.get("reminder_channel", "both"), int(d.get("elder_enabled", 1)),
             d.get("elder_salutation", ""), _now()))
        pid = cur.lastrowid
    return get_patient(pid)


def update_patient(pid: int, d: dict) -> Optional[dict]:
    with conn() as c:
        if not c.execute("SELECT 1 FROM patients WHERE id=?", (pid,)).fetchone():
            return None
        c.execute(
            "UPDATE patients SET name=?,age=?,gender=?,allergies=?,conditions=?,notes=?,elder_phone=?,elder_lang=?,reminder_channel=?,elder_enabled=?,elder_salutation=? WHERE id=?",
            (d["name"].strip(), d.get("age"), d.get("gender", ""), json.dumps(d.get("allergies", [])),
             json.dumps(d.get("conditions", [])), d.get("notes", ""), d.get("elder_phone", ""),
             d.get("elder_lang", "en"), d.get("reminder_channel", "both"), int(d.get("elder_enabled", 1)),
             d.get("elder_salutation", ""), pid))
    return get_patient(pid)


def update_elder_config(pid: int, elder_phone: str, elder_lang: str = "en", reminder_channel: str = "both",
                        elder_enabled: bool = True, elder_salutation: str = "") -> Optional[dict]:
    with conn() as c:
        if not c.execute("SELECT 1 FROM patients WHERE id=?", (pid,)).fetchone():
            return None
        c.execute(
            "UPDATE patients SET elder_phone=?, elder_lang=?, reminder_channel=?, elder_enabled=?, elder_salutation=? WHERE id=?",
            (elder_phone.strip(), elder_lang, reminder_channel, int(elder_enabled), elder_salutation.strip(), pid))
    return get_patient(pid)


def record_reminder_log(
    patient_id: int,
    patient_name: str,
    phone: str,
    channel: str,
    period: str,
    medicines: List[str],
    message_text: str,
    audio_script: str = "",
    status: str = "delivered",
    call_duration_sec: int = 0
) -> dict:
    with conn() as c:
        cur = c.execute(
            """INSERT INTO reminder_logs(patient_id, patient_name, phone, channel, period, medicines, message_text, audio_script, status, call_duration_sec, created_at)
               VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (patient_id, patient_name, phone.strip(), channel, period, json.dumps(medicines), message_text,
             audio_script, status, call_duration_sec, _now())
        )
        log_id = cur.lastrowid
        r = c.execute("SELECT * FROM reminder_logs WHERE id=?", (log_id,)).fetchone()
        d = {k: r[k] for k in r.keys()}
        try:
            d["medicines"] = json.loads(d["medicines"] or "[]")
        except Exception:
            d["medicines"] = []
        return d


def list_reminder_logs(patient_id: Optional[int] = None, limit: int = 50) -> List[dict]:
    with conn() as c:
        if patient_id:
            rows = c.execute("SELECT * FROM reminder_logs WHERE patient_id=? ORDER BY id DESC LIMIT ?", (patient_id, limit)).fetchall()
        else:
            rows = c.execute("SELECT * FROM reminder_logs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        result = []
        for r in rows:
            d = {k: r[k] for k in r.keys()}
            try:
                d["medicines"] = json.loads(d["medicines"] or "[]")
            except Exception:
                d["medicines"] = []
            result.append(d)
        return result


def confirm_reminder_log(log_id: int, status: str = "confirmed") -> Optional[dict]:
    with conn() as c:
        c.execute("UPDATE reminder_logs SET status=?, confirmed_at=? WHERE id=?", (status, _now(), log_id))
        r = c.execute("SELECT * FROM reminder_logs WHERE id=?", (log_id,)).fetchone()
        if not r:
            return None
        d = {k: r[k] for k in r.keys()}
        try:
            d["medicines"] = json.loads(d["medicines"] or "[]")
        except Exception:
            d["medicines"] = []
        return d


def delete_patient(pid: int) -> bool:
    with conn() as c:
        if not c.execute("SELECT 1 FROM patients WHERE id=?", (pid,)).fetchone():
            return False
        for t in ("patient_medicines", "schedule", "scans"):
            c.execute(f"DELETE FROM {t} WHERE patient_id=?", (pid,))
        c.execute("DELETE FROM patients WHERE id=?", (pid,))
    return True


def add_patient_medicine(pid: int, medicine_id: str) -> None:
    with conn() as c:
        c.execute("INSERT OR IGNORE INTO patient_medicines(patient_id,medicine_id,added_at) VALUES(?,?,?)", (pid, medicine_id, _now()))


def remove_patient_medicine(pid: int, medicine_id: str) -> None:
    with conn() as c:
        c.execute("DELETE FROM patient_medicines WHERE patient_id=? AND medicine_id=?", (pid, medicine_id))


def _sched(r: sqlite3.Row) -> dict:
    return {k: r[k] for k in r.keys()}


def list_schedule(pid: int) -> List[dict]:
    with conn() as c:
        return [_sched(r) for r in c.execute("SELECT * FROM schedule WHERE patient_id=? ORDER BY time, id", (pid,))]


def get_schedule(sid: int) -> Optional[dict]:
    with conn() as c:
        r = c.execute("SELECT * FROM schedule WHERE id=?", (sid,)).fetchone()
        return _sched(r) if r else None


def create_schedule(pid: int, d: dict) -> dict:
    with conn() as c:
        cur = c.execute(
            "INSERT INTO schedule(patient_id,medicine_id,dose,frequency,period,time,food,instruction,notes,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            (pid, d["medicine_id"], d.get("dose", ""), d.get("frequency", ""), d.get("period", "Morning"), d.get("time", ""),
             d.get("food", "Not specified"), d.get("instruction", ""), d.get("notes", ""), _now()))
        sid = cur.lastrowid
    return get_schedule(sid)


def update_schedule(sid: int, d: dict) -> Optional[dict]:
    with conn() as c:
        if not c.execute("SELECT 1 FROM schedule WHERE id=?", (sid,)).fetchone():
            return None
        c.execute("UPDATE schedule SET medicine_id=?,dose=?,frequency=?,period=?,time=?,food=?,instruction=?,notes=? WHERE id=?",
                  (d["medicine_id"], d.get("dose", ""), d.get("frequency", ""), d.get("period", "Morning"), d.get("time", ""),
                   d.get("food", "Not specified"), d.get("instruction", ""), d.get("notes", ""), sid))
    return get_schedule(sid)


def delete_schedule(sid: int) -> bool:
    with conn() as c:
        cur = c.execute("DELETE FROM schedule WHERE id=?", (sid,))
        return cur.rowcount > 0


def record_scan(pid: Optional[int], text: str, medicine_id: Optional[str], confident: bool) -> None:
    with conn() as c:
        c.execute("INSERT INTO scans(patient_id,text,medicine_id,confident,created_at) VALUES(?,?,?,?,?)",
                  (pid, text[:2000], medicine_id, int(confident), _now()))


def last_scan(pid: int) -> Optional[dict]:
    with conn() as c:
        r = c.execute("SELECT * FROM scans WHERE patient_id=? ORDER BY id DESC LIMIT 1", (pid,)).fetchone()
        return {k: r[k] for k in r.keys()} if r else None


def _user(r: sqlite3.Row) -> dict:
    keys = r.keys()
    plan = r["plan"] if "plan" in keys and r["plan"] else "trial"
    exp = r["plan_expires_at"] if "plan_expires_at" in keys else None
    days_left = 3
    if exp:
        try:
            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            days_left = max(0, (exp_dt - now_dt).days + 1)
        except Exception:
            days_left = 3
    return {
        "id": r["id"],
        "name": r["name"],
        "email": r["email"],
        "phone": r["phone"],
        "role": r["role"],
        "plan": plan,
        "plan_name": "3-Day Free Trial" if plan == "trial" else ("Beginner Plan (₹199/mo)" if plan == "beginner" else "Pro Plan (₹399/mo)"),
        "plan_price_inr": 0 if plan == "trial" else (199 if plan == "beginner" else 399),
        "days_left": days_left,
        "trial_ends_at": r["trial_ends_at"] if "trial_ends_at" in keys else None,
        "plan_expires_at": exp,
        "subscription_status": r["subscription_status"] if "subscription_status" in keys else "active",
        "created_at": r["created_at"],
    }


def create_user(name: str, email: str, phone: str, password: str, role: str = "Clinician", plan: str = "trial") -> dict:
    clean_email = email.strip().lower()
    clean_phone = phone.strip()
    days = 3 if plan == "trial" else 30
    exp = _days_from_now(days)
    trial_ends = _days_from_now(3) if plan == "trial" else None
    with conn() as c:
        cur = c.execute(
            "INSERT INTO users(name, email, phone, password_hash, role, plan, trial_ends_at, plan_expires_at, subscription_status, created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            (name.strip(), clean_email, clean_phone, _hash_pw(password), role, plan, trial_ends, exp, "active", _now()))
        uid = cur.lastrowid
    return get_user_by_id(uid)


def update_subscription(uid: int, plan: str) -> Optional[dict]:
    days = 3 if plan == "trial" else 30
    exp = _days_from_now(days)
    trial_ends = _days_from_now(3) if plan == "trial" else None
    with conn() as c:
        c.execute(
            "UPDATE users SET plan=?, plan_expires_at=?, trial_ends_at=?, subscription_status='active' WHERE id=?",
            (plan, exp, trial_ends, uid))
    return get_user_by_id(uid)


def get_user_by_id(uid: int) -> Optional[dict]:
    with conn() as c:
        r = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        return _user(r) if r else None


def get_user_by_email(email: str) -> Optional[dict]:
    with conn() as c:
        r = c.execute("SELECT * FROM users WHERE LOWER(email)=LOWER(?)", (email.strip(),)).fetchone()
        return _user(r) if r else None


def authenticate_user(identifier: str, password: str) -> Optional[dict]:
    import re
    ident = identifier.strip()
    pw_hash = _hash_pw(password)
    with conn() as c:
        r = c.execute("SELECT * FROM users WHERE LOWER(email)=LOWER(?) AND password_hash=?", (ident, pw_hash)).fetchone()
        if r:
            return _user(r)
        clean = re.sub(r"[^\d+]", "", ident)
        for row in c.execute("SELECT * FROM users WHERE password_hash=?", (pw_hash,)):
            stored_clean = re.sub(r"[^\d+]", "", row["phone"])
            if stored_clean and clean and (stored_clean == clean or row["phone"] == ident):
                return _user(row)
        return None
