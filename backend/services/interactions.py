"""Pairwise interaction analysis, explanation and patient-context factors."""
from __future__ import annotations

from itertools import combinations
from typing import Dict, List, Optional

from backend.ml.inference import SERIOUS_EFFECTS, get_predictor
from backend.services.knowledge import DISCLAIMER, RELATION_TEXT, Knowledge, get_knowledge, pretty

ADVICE = {
    "HIGH": "Discuss this combination with a qualified healthcare professional promptly. Do not stop or change prescribed medicines on your own.",
    "MODERATE": "Discuss this combination with a qualified healthcare professional or pharmacist, who can advise whether monitoring or changes are appropriate.",
    "LOW": "Usually a minor or well-managed concern. Mention it to your pharmacist or doctor at your next review.",
    "UNKNOWN": "No interaction is recorded in this demonstration database. That is not proof of safety. Verify with a pharmacist or the official label.",
}
CONDITION_MAP = {
    "kidney": ["nephrotoxicity", "hyperkalemia"], "renal": ["nephrotoxicity", "hyperkalemia"],
    "liver": ["hepatotoxicity"], "hepat": ["hepatotoxicity"],
    "ulcer": ["gi_ulcer", "bleeding"], "gastr": ["gi_ulcer", "bleeding"], "bleed": ["bleeding"],
    "heart": ["qt_prolongation", "hypotension", "hypokalemia"], "arrhythmia": ["qt_prolongation"],
    "hypertension": ["hypotension", "nephrotoxicity"], "diabetes": ["lactic_acidosis"],
    "epilep": ["seizures"], "seizure": ["seizures"],
}


def _band(conf: float) -> str:
    return "high" if conf >= 0.8 else "medium" if conf >= 0.6 else "low"


def _graph_overlap(k: Knowledge, a: str, b: str) -> List[dict]:
    """Mechanistic links between two drugs found in the knowledge graph, with relative importance."""
    ma, mb = k.medicines[a], k.medicines[b]
    links = []
    for x, y, xi, yi in ((a, b, ma, mb), (b, a, mb, ma)):
        for rel_field, rel in (("inhibits", "inhibits"), ("induces", "induces")):
            for e in set(xi[rel_field]) & set(yi["substrate"]):
                kind = "enzyme" if k.entity_types.get(e) == "Enzyme" else "protein"
                links.append({"node": f"{kind}:{e}", "label": pretty(e), "type": kind, "weight": 1.0,
                              "edges": [(x, rel, f"{kind}:{e}"), (y, "metabolized_by", f"{kind}:{e}")],
                              "text": f"{k.medicines[x]['name']} {RELATION_TEXT[rel]} {pretty(e)}, which processes {k.medicines[y]['name']}."})
    for e in sorted((set(ma["adverse"]) & set(mb["adverse"]))):
        w = 0.9 if e in SERIOUS_EFFECTS else 0.4
        links.append({"node": f"adverse_effect:{e}", "label": pretty(e), "type": "adverse_effect", "weight": w,
                      "edges": [(a, "may_cause", f"adverse_effect:{e}"), (b, "may_cause", f"adverse_effect:{e}")],
                      "text": f"Both medicines may contribute to {pretty(e).lower()}."})
    for e in sorted(set(ma["targets"]) & set(mb["targets"])):
        kind = "enzyme" if k.entity_types.get(e) == "Enzyme" else "protein"
        links.append({"node": f"{kind}:{e}", "label": pretty(e), "type": kind, "weight": 0.6,
                      "edges": [(a, "targets", f"{kind}:{e}"), (b, "targets", f"{kind}:{e}")],
                      "text": f"Both medicines act on {pretty(e)}."})
    for e in sorted(set(ma["pathways"]) & set(mb["pathways"])):
        links.append({"node": f"pathway:{e}", "label": pretty(e), "type": "pathway", "weight": 0.7,
                      "edges": [(a, "acts_on_pathway", f"pathway:{e}"), (b, "acts_on_pathway", f"pathway:{e}")],
                      "text": f"Both medicines influence the {pretty(e).lower()} pathway."})
    links.sort(key=lambda l: -l["weight"])
    return links


def patient_factors(k: Knowledge, a: str, b: str, patient: Optional[dict], others: Optional[List[str]] = None) -> List[str]:
    if not patient:
        return ["No patient selected: analysis uses medicine information only."]
    out: List[str] = []
    age = patient.get("age")
    effects = set(k.medicines[a]["adverse"]) | set(k.medicines[b]["adverse"])
    if isinstance(age, int):
        if age >= 65:
            out.append(f"Age {age}: older adults can be more sensitive to some medicine effects (for example bleeding or low blood pressure).")
        elif age < 18:
            out.append(f"Age {age}: medicine safety in children and teenagers differs; use professional guidance.")
        else:
            out.append(f"Age {age}: no age-specific flag in this demonstration rule set.")
    for cond in patient.get("conditions", []):
        hits = {e for key, es in CONDITION_MAP.items() if key in cond.lower() for e in es} & effects
        if hits:
            out.append(f"Recorded condition '{cond}' may be relevant to: {', '.join(pretty(h).lower() for h in sorted(hits))}.")
        else:
            out.append(f"Recorded condition '{cond}' was considered; no specific flag in this rule set.")
    for al in patient.get("allergies", []):
        low = al.lower()
        if low in ("none", "none recorded", "nkda", ""):
            continue
        for mid in (a, b):
            m = k.medicines[mid]
            if low in m["name"].lower() or low in m["cls"].lower() or low in [x.lower() for x in m["aliases"]]:
                out.append(f"Recorded allergy '{al}' may relate to {m['name']} - verify with a clinician before use.")
    if not patient.get("allergies") or all(x.lower() in ("none", "none recorded") for x in patient["allergies"]):
        out.append("No allergies recorded.")
    extra = [x for x in (others or []) if x not in (a, b)]
    if extra:
        out.append("Other current medicines also considered for pair checks: " + ", ".join(k.medicines[x]["name"] for x in extra) + ".")
    out.append("Patient context is used as decision-support context and does not replace professional clinical judgment.")
    return out


def analyze_pair(a: str, b: str, patient: Optional[dict] = None, others: Optional[List[str]] = None, k: Optional[Knowledge] = None) -> dict:
    k = k or get_knowledge()
    pred = get_predictor()
    p, src = pred.score(a, b)
    conf = max(p, 1 - p)
    cur = k.interactions.get(tuple(sorted((a, b))))
    links = _graph_overlap(k, a, b)
    if cur:
        risk, source = cur["severity"], "curated"
        summary, mechanism, concern = cur["summary"], cur["mechanism"], cur["concern"]
        note = ("This pair was part of the model's training knowledge graph, so the model score below is not a test of generalisation."
                if src == "gcn" else None)
    else:
        risk, source = "UNKNOWN", "model"
        predicted = p >= 0.6
        summary = ("The model flags a possible interaction that is not in the curated database. Treat as unverified."
                   if predicted else "No interaction is recorded in the demonstration database for this pair.")
        mechanism = links[0]["text"] if links else "No shared mechanism was found in the knowledge graph."
        concern = "Unknown. Absence of a record is not evidence of safety."
        note = "Prediction only: not a verified interaction." if predicted else None
    name_a, name_b = k.medicines[a]["name"], k.medicines[b]["name"]
    return {
        "a": a, "b": b, "a_name": name_a, "b_name": name_b, "risk": risk, "source": source,
        "summary": summary, "mechanism": mechanism, "concern": concern, "note": note,
        "model": {"name": pred.model_name, "score": round(p, 3), "confidence": round(conf, 3),
                  "confidence_band": _band(conf), "engine": src},
        "mechanism_links": [l["text"] for l in links[:4]],
        "evidence": k.evidence_for_pair(a, b),
        "advice": ADVICE[risk],
        "patient_factors": patient_factors(k, a, b, patient, others),
        "disclaimer": DISCLAIMER,
    }


def check(names: List[str], patient: Optional[dict] = None, k: Optional[Knowledge] = None) -> dict:
    k = k or get_knowledge()
    resolved, unresolved = [], []
    for n in names:
        mid = k.resolve(n)
        if mid and mid not in [r["id"] for r in resolved]:
            resolved.append({"id": mid, "name": k.medicines[mid]["name"], "input": n})
        elif not mid and n.strip():
            unresolved.append(n)
    ids = [r["id"] for r in resolved]
    pairs = [analyze_pair(a, b, patient, ids, k) for a, b in combinations(ids, 2)]
    order = {"HIGH": 0, "MODERATE": 1, "UNKNOWN": 2, "LOW": 3}
    pairs.sort(key=lambda x: order[x["risk"]])
    counts = {r: sum(1 for p in pairs if p["risk"] == r) for r in ("HIGH", "MODERATE", "LOW", "UNKNOWN")}
    overall = next((r for r in ("HIGH", "MODERATE", "UNKNOWN", "LOW") if counts[r]), None)
    return {"medicines": resolved, "unresolved": unresolved, "pairs": pairs, "counts": counts,
            "overall_risk": overall, "disclaimer": DISCLAIMER,
            "emergency": "If you experience severe bleeding, chest pain, difficulty breathing, fainting, seizures or confusion, seek urgent medical care."}


def explain(a: str, b: str, patient: Optional[dict] = None, k: Optional[Knowledge] = None) -> dict:
    k = k or get_knowledge()
    res = analyze_pair(a, b, patient, None, k)
    links = _graph_overlap(k, a, b)[:6]
    nodes = {f"drug:{a}": {"id": f"drug:{a}", "label": res["a_name"], "type": "drug", "importance": 1.0},
             f"drug:{b}": {"id": f"drug:{b}", "label": res["b_name"], "type": "drug", "importance": 1.0}}
    edges = []
    top = max([l["weight"] for l in links], default=1.0)
    for l in links:
        nodes[l["node"]] = {"id": l["node"], "label": l["label"], "type": l["type"], "importance": round(l["weight"] / top, 2)}
        for s, rel, t in l["edges"]:
            edges.append({"source": f"drug:{s}" if not s.count(":") else s, "target": t, "relation": rel,
                          "relation_text": RELATION_TEXT[rel], "importance": round(l["weight"] / top, 2)})
    res["graph"] = {"nodes": list(nodes.values()), "edges": edges}
    res["important_nodes"] = [{"label": l["label"], "type": l["type"], "importance": round(l["weight"] / top, 2)} for l in links]
    res["important_relationships"] = [l["text"] for l in links]
    res["attribution_method"] = ("Path-based attribution over the knowledge graph: shared enzymes, targets, pathways and adverse effects "
                                 "between the two drugs, ranked by mechanistic relevance (enzyme inhibition/induction > shared serious "
                                 "adverse effect > shared pathway > shared target). It explains the graph evidence behind the result; "
                                 "it is not a gradient attribution of the neural network.")
    return res
