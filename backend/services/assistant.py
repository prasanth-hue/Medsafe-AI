"""Ask MedSafe AI: local intent-based assistant with optional external LLM enrichment.

Works fully offline. If ANTHROPIC_API_KEY is set, general (non-navigation, non-database) questions may be
answered by the Claude API using a strict safety system prompt; any failure silently falls back to local answers.
"""
from __future__ import annotations

import json
import os
import re
import urllib.request
from typing import List, Optional

from backend.ml.inference import get_predictor
from backend.services import interactions
from backend.services.knowledge import DISCLAIMER, PRESCRIPTION_NOTE, Knowledge, get_knowledge

EMERGENCY = re.compile(r"chest pain|can'?t breathe|cannot breathe|difficulty breathing|overdose|suicid|severe bleeding|"
                       r"unconscious|seizure|anaphyla|swelling of (the )?(face|lips|throat)|vomiting blood|black stool", re.I)
DOSE = re.compile(r"\b(how (much|many)|what dose|dosage|should i take|can i take|when (should|do) i take|what time)\b", re.I)
NAV = [
    ("scanner", r"\b(scan|scanner|camera|upload (a )?(photo|image)|read (the )?label)\b", "Medicine Scanner"),
    ("schedule", r"\b(schedule|timetable|reminder|medication plan)\b", "Medication Schedule"),
    ("checker", r"\b(interaction checker|check interactions?|checker)\b", "Interaction Checker"),
    ("explain", r"\b(explainable|explain (my|the|this) (result|prediction)|why did the model)\b", "Explainable AI"),
    ("patients", r"\b(patient profiles?|patients|add (a )?patient|switch patient)\b", "Patient Profiles"),
    ("model", r"\b(model (and|&) evaluation|evaluation|metrics|accuracy|roc|performance)\b", "Model & Evaluation"),
    ("evidence", r"\b(evidence|sources?|references?)\b", "Evidence & Sources"),
    ("medicines", r"\b(medicine information|medicine search|search medicines?)\b", "Medicine Information"),
    ("dashboard", r"\b(dashboard|home)\b", "Dashboard"),
    ("settings", r"\b(settings|about)\b", "Settings & About"),
]
OPEN = re.compile(r"\b(open|go to|show|take me to|navigate|launch|switch to|view)\b", re.I)


class Assistant:
    def __init__(self, k: Optional[Knowledge] = None):
        self.k = k or get_knowledge()

    def _find_meds(self, text: str) -> List[str]:
        low = text.lower()
        found, spans = [], []
        for name in sorted(self.k.all_names(), key=len, reverse=True):
            if len(name) < 4:
                continue
            m = re.search(rf"\b{re.escape(name)}\b", low)
            if m and not any(s <= m.start() < e for s, e in spans):
                mid = self.k._alias[name]
                if mid not in found:
                    found.append(mid)
                spans.append((m.start(), m.end()))
        return found

    def _llm(self, message: str, context: str) -> Optional[str]:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            return None
        system = ("You are MedSafe AI, an educational medication-safety assistant. Never diagnose, never prescribe, never give patient-specific "
                  "doses or timing. For personal medical decisions tell the user to consult a doctor or pharmacist. For emergencies say to seek "
                  "urgent medical care. Keep answers under 120 words. Context from the app:\n" + context)
        body = json.dumps({"model": os.environ.get("MEDSAFE_LLM_MODEL", "claude-sonnet-4-6"), "max_tokens": 400, "system": system,
                           "messages": [{"role": "user", "content": message}]}).encode()
        req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
            "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                data = json.loads(r.read())
            return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text") or None
        except Exception:
            return None

    def reply(self, message: str, patient: Optional[dict] = None) -> dict:
        msg = (message or "").strip()
        if not msg:
            return {"reply": "Please type a question, for example: \"What is warfarin used for?\" or \"Check aspirin and warfarin.\"",
                    "intent": "empty", "action": None}
        k = self.k
        meds = self._find_meds(msg)
        low = msg.lower()

        if EMERGENCY.search(msg):
            return {"reply": "Seek urgent medical care now: call your local emergency number or go to the nearest emergency department. "
                             "MedSafe AI cannot help with emergencies.", "intent": "emergency", "action": None}

        # patient medicines
        if re.search(r"(what|which) medicines?.*(taking|current|on)|current medicines|patient.*medicines", low):
            if not patient:
                return {"reply": "No patient is selected. Open Patient Profiles to choose or add one.", "intent": "patient_navigation",
                        "action": {"type": "navigate", "page": "patients"}}
            names = [k.medicines[m]["name"] for m in patient["medicines"] if m in k.medicines]
            text = (f"{patient['name']} currently has {len(names)} recorded medicine(s): {', '.join(names)}." if names
                    else f"{patient['name']} has no recorded medicines yet. Use Scan Medicine or Patient Profiles to add some.")
            return {"reply": text, "intent": "patient_medicines", "action": None}

        # how does the GNN work
        if re.search(r"\b(gnn|gcn|graph neural|how does the (model|ai) work|how does medsafe work)\b", low):
            p = get_predictor()
            status = "A trained GCN is loaded." if p.trained else "The GCN has not been trained yet, so a transparent graph-overlap heuristic is used."
            return {"reply": ("MedSafe AI builds a biomedical knowledge graph of drugs, proteins, enzymes, diseases, pathways and adverse effects. "
                              "A 2-layer graph convolutional network (GCN) learns drug embeddings by passing messages along the graph, and a small "
                              "decoder scores each drug pair for interaction likelihood. Curated records give the risk level; the model score and "
                              "graph paths explain why. " + status), "intent": "model_information",
                    "action": {"type": "navigate", "page": "model"}}

        # interaction check from text
        if len(meds) >= 2 and re.search(r"\b(check|interact|together|combine|combination|and|with|mix|safe)\b", low):
            result = interactions.check([m for m in meds], patient, k)
            lines = [f"{p['a_name']} + {p['b_name']}: {p['risk']} risk. {p['summary']}" for p in result["pairs"]]
            return {"reply": "\n".join(lines) + "\n\nDiscuss this with a qualified healthcare professional. " + DISCLAIMER,
                    "intent": "interaction_check",
                    "action": {"type": "navigate", "page": "checker", "params": {"medicines": [k.medicines[m]["name"] for m in meds]}}}

        if DOSE.search(msg):
            extra = f" General information about {k.medicines[meds[0]]['name']} is on the Medicine Information page." if meds else ""
            return {"reply": "I can't recommend doses or timing for you. " + PRESCRIPTION_NOTE + extra, "intent": "dose_refusal", "action": None}

        # navigation
        if OPEN.search(low) or len(low.split()) <= 4:
            for page, pattern, label in NAV:
                if re.search(pattern, low):
                    return {"reply": f"Opening {label}.", "intent": f"{page}_navigation", "action": {"type": "navigate", "page": page}}

        # medicine information
        if meds:
            m = k.medicines[meds[0]]
            if re.search(r"\b(interact|interaction)s?\b", low):
                known = k.public(meds[0])["known_interactions"][:5]
                text = ", ".join(f"{x['with_name']} ({x['severity']})" for x in known) or "none recorded in the demo database"
                return {"reply": f"Known interaction examples for {m['name']}: {text}.", "intent": "medicine_information",
                        "action": {"type": "navigate", "page": "medicines", "params": {"medicine": meds[0]}}}
            if re.search(r"\b(warning|side effect|risk)s?\b", low):
                return {"reply": f"{m['name']} warnings: " + " ".join(m["warnings"]), "intent": "medicine_information", "action": None}
            return {"reply": f"{m['name']} ({m['cls']}): {m['use']} {PRESCRIPTION_NOTE}", "intent": "medicine_information",
                    "action": {"type": "navigate", "page": "medicines", "params": {"medicine": meds[0]}}}

        ctx = f"Patient: {patient['name']}, age {patient['age']}" if patient else "No patient selected."
        llm = self._llm(msg, ctx)
        if llm:
            return {"reply": llm, "intent": "llm", "action": None}
        return {"reply": ("I can answer from the local medicine database and open any part of the app. Try: \"What is warfarin used for?\", "
                          "\"Check aspirin and warfarin\", \"Open scanner\", \"Open medication schedule\" or \"How does the GNN work?\""),
                "intent": "fallback", "action": None}
