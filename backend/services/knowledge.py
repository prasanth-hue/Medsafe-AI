"""Local biomedical knowledge base (demonstration dataset).

Loads data/medicines.json and data/interactions.json and exposes lookup,
fuzzy name resolution, knowledge-graph construction and evidence records.
Pure standard library so it works without any optional dependency.
"""
from __future__ import annotations

import difflib
import json
import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote_plus

ROOT = Path(os.environ.get("MEDSAFE_ROOT", Path(__file__).resolve().parents[2]))
DATA_DIR = ROOT / "data"

DISCLAIMER = (
    "MedSafe AI is an educational and clinical decision-support prototype. It does not diagnose "
    "conditions, prescribe medicines, or replace a qualified healthcare professional."
)
PRESCRIPTION_NOTE = (
    "Follow the prescription or label instruction for your specific treatment. "
    "If the instruction is unclear, verify with a doctor or pharmacist."
)
DATASET_LABEL = (
    "Demonstration knowledge base: hand-curated educational summaries of widely documented "
    "pharmacology. It is not DrugBank or any licensed dataset and it is not exhaustive."
)

RELATIONS = {
    "substrate": "metabolized_by",
    "inhibits": "inhibits",
    "induces": "induces",
    "targets": "targets",
    "pathways": "acts_on_pathway",
    "adverse": "may_cause",
    "indications": "indicated_for",
}
RELATION_TEXT = {
    "metabolized_by": "is processed by",
    "inhibits": "inhibits",
    "induces": "induces",
    "targets": "acts on",
    "acts_on_pathway": "influences",
    "may_cause": "may cause",
    "indicated_for": "is used for",
}


def pretty(identifier: str) -> str:
    special = {"COX1": "COX-1", "COX2": "COX-2", "PGP": "P-glycoprotein", "NAKATPASE": "Na+/K+ ATPase",
               "L_CA_CHANNEL": "L-type calcium channel", "GYRASE": "DNA gyrase", "MOR": "Mu-opioid receptor",
               "MR": "Mineralocorticoid receptor", "AT1R": "AT1 receptor", "SERT": "Serotonin transporter",
               "HMGCR": "HMG-CoA reductase", "PDE5": "PDE5", "ACE": "ACE", "DHFR": "DHFR",
               "NKCC2": "NKCC2 transporter", "OCT2": "OCT2 transporter", "VKORC1": "VKORC1",
               "P2Y12": "P2Y12 receptor", "PROTON_PUMP": "Proton pump (H+/K+ ATPase)",
               "BACT_RIBOSOME": "Bacterial ribosome", "THYROID_RECEPTOR": "Thyroid hormone receptor",
               "CYP51": "CYP51", "no_cgmp_signaling": "NO-cGMP signalling", "raas": "Renin-angiotensin system",
               "gi_ulcer": "Stomach ulcer", "qt_prolongation": "QT prolongation"}
    if identifier in special:
        return special[identifier]
    if identifier.startswith("CYP"):
        return identifier
    return identifier.replace("_", " ").capitalize()


class Knowledge:
    def __init__(self, data_dir: Path = DATA_DIR):
        raw = json.loads((data_dir / "medicines.json").read_text(encoding="utf-8"))
        self.meta = raw["_meta"]
        self.entity_types: Dict[str, str] = raw["_meta"]["entities"]
        self.medicines: Dict[str, dict] = {m["id"]: m for m in raw["medicines"]}
        inter = json.loads((data_dir / "interactions.json").read_text(encoding="utf-8"))
        self.interaction_meta = inter["_meta"]
        self.interactions: Dict[Tuple[str, str], dict] = {}
        for a, b, sev, summary, mechanism, concern in inter["interactions"]:
            key = tuple(sorted((a, b)))
            self.interactions[key] = {
                "a": a, "b": b, "severity": sev, "summary": summary,
                "mechanism": mechanism, "concern": concern,
            }
        self._alias: Dict[str, str] = {}
        for mid, m in self.medicines.items():
            self._alias[mid] = mid
            self._alias[m["name"].lower()] = mid
            for alias in m.get("aliases", []):
                self._alias[alias.lower()] = mid
            plain = re.sub(r"\(.*?\)", "", m["name"]).strip().lower()
            self._alias[plain] = mid

    # ---------- lookup ----------
    def all_names(self) -> List[str]:
        return sorted(self._alias.keys())

    def resolve(self, text: str, cutoff: float = 0.84) -> Optional[str]:
        """Resolve free text (generic or brand name) to a medicine id."""
        if not text:
            return None
        t = re.sub(r"\s+", " ", text.strip().lower())
        t = re.sub(r"\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu)\b", "", t).strip()
        if t in self._alias:
            return self._alias[t]
        close = difflib.get_close_matches(t, list(self._alias.keys()), n=1, cutoff=cutoff)
        return self._alias[close[0]] if close else None

    def get(self, medicine_id: str) -> Optional[dict]:
        return self.medicines.get(medicine_id)

    def public(self, medicine_id: str) -> Optional[dict]:
        m = self.medicines.get(medicine_id)
        if not m:
            return None
        known = []
        for (a, b), it in self.interactions.items():
            if medicine_id in (a, b):
                other = b if a == medicine_id else a
                known.append({"with": other, "with_name": self.medicines[other]["name"],
                              "severity": it["severity"], "summary": it["summary"]})
        order = {"HIGH": 0, "MODERATE": 1, "LOW": 2}
        known.sort(key=lambda x: order.get(x["severity"], 3))
        return {
            "id": m["id"], "name": m["name"], "brands": [a.title() for a in m.get("aliases", [])],
            "drug_class": m["cls"], "general_use": m["use"], "general_administration": m["admin"],
            "warnings": m["warnings"], "known_interactions": known,
            "mechanism_profile": {
                "metabolized_by": [pretty(x) for x in m["substrate"]],
                "inhibits": [pretty(x) for x in m["inhibits"]],
                "induces": [pretty(x) for x in m["induces"]],
                "targets": [pretty(x) for x in m["targets"]],
                "pathways": [pretty(x) for x in m["pathways"]],
                "possible_adverse_effects": [pretty(x) for x in m["adverse"]],
            },
            "prescription_note": PRESCRIPTION_NOTE,
            "evidence": self.evidence_for_drug(medicine_id),
            "disclaimer": DISCLAIMER,
        }

    def search(self, query: str, limit: int = 30) -> List[dict]:
        q = (query or "").strip().lower()
        out = []
        for mid, m in self.medicines.items():
            hay = " ".join([m["name"], m["cls"], *m.get("aliases", [])]).lower()
            if not q or q in hay:
                out.append(mid)
        if q and not out:
            r = self.resolve(q, cutoff=0.7)
            if r:
                out.append(r)
        return [{"id": i, "name": self.medicines[i]["name"], "drug_class": self.medicines[i]["cls"],
                 "general_use": self.medicines[i]["use"]} for i in sorted(out)[:limit]]

    # ---------- knowledge graph ----------
    @lru_cache(maxsize=1)
    def graph(self) -> dict:
        nodes: Dict[str, dict] = {}
        edges: List[dict] = []

        def add_node(nid: str, ntype: str, label: str):
            if nid not in nodes:
                nodes[nid] = {"id": nid, "type": ntype, "label": label}

        for mid, m in self.medicines.items():
            add_node(f"drug:{mid}", "drug", m["name"])
            for field, rel in RELATIONS.items():
                for target in m.get(field, []):
                    if field in ("substrate", "inhibits", "induces", "targets"):
                        ntype = "enzyme" if self.entity_types.get(target) == "Enzyme" else "protein"
                        nid = f"{ntype}:{target}"
                    elif field == "pathways":
                        ntype, nid = "pathway", f"pathway:{target}"
                    elif field == "adverse":
                        ntype, nid = "adverse_effect", f"adverse_effect:{target}"
                    else:
                        ntype, nid = "disease", f"disease:{target}"
                    add_node(nid, ntype, pretty(target))
                    edges.append({"source": f"drug:{mid}", "target": nid, "relation": rel})
        return {"nodes": list(nodes.values()), "edges": edges}

    def graph_summary(self) -> dict:
        g = self.graph()
        counts: Dict[str, int] = {}
        for n in g["nodes"]:
            counts[n["type"]] = counts.get(n["type"], 0) + 1
        rel_counts: Dict[str, int] = {}
        for e in g["edges"]:
            rel_counts[e["relation"]] = rel_counts.get(e["relation"], 0) + 1
        return {"node_counts": counts, "total_nodes": len(g["nodes"]), "relation_counts": rel_counts,
                "knowledge_edges": len(g["edges"]), "known_interaction_pairs": len(self.interactions),
                "drugs": len(self.medicines), "label": DATASET_LABEL}

    # ---------- evidence ----------
    def evidence_for_drug(self, medicine_id: str) -> List[dict]:
        m = self.medicines[medicine_id]
        name = m["name"].split("(")[0].strip()
        q = quote_plus(name)
        return [
            {"source": "Local demo knowledge base", "title": f"{name}: summary used by MedSafe AI",
             "evidence": f"{m['use']} Class: {m['cls']}.", "link": None, "kind": "local-demo"},
            {"source": "MedlinePlus (search link)", "title": f"MedlinePlus drug information: {name}",
             "evidence": "Patient-friendly medicine information from the U.S. National Library of Medicine. Opens a search for this medicine.",
             "link": f"https://vsearch.nlm.nih.gov/vivisimo/cgi-bin/query-meta?v%3Aproject=medlineplus&query={q}",
             "kind": "search-link"},
            {"source": "DailyMed (search link)", "title": f"DailyMed labels: {name}",
             "evidence": "Official FDA-submitted drug labelling. Opens a search for this medicine.",
             "link": f"https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query={q}",
             "kind": "search-link"},
        ]

    def evidence_for_pair(self, a: str, b: str) -> List[dict]:
        na = self.medicines[a]["name"].split("(")[0].strip()
        nb = self.medicines[b]["name"].split("(")[0].strip()
        it = self.interactions.get(tuple(sorted((a, b))))
        out = []
        if it:
            out.append({"source": "Local demo knowledge base", "title": f"{na} + {nb}: curated interaction record",
                        "evidence": f"{it['summary']} {it['mechanism']}", "link": None, "kind": "local-demo"})
        out.append({"source": "PubMed (search link)", "title": f"Literature search: {na} and {nb} interaction",
                    "evidence": "Opens a PubMed search for published studies. Search results are not curated by MedSafe AI.",
                    "link": f"https://pubmed.ncbi.nlm.nih.gov/?term={quote_plus(na)}+{quote_plus(nb)}+drug+interaction",
                    "kind": "search-link"})
        for mid in (a, b):
            n = self.medicines[mid]["name"].split("(")[0].strip()
            out.append({"source": "DailyMed (search link)", "title": f"Official labelling for {n}",
                        "evidence": "Check the 'Drug Interactions' section of the current label.",
                        "link": f"https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query={quote_plus(n)}",
                        "kind": "search-link"})
        return out


_instance: Optional[Knowledge] = None


def get_knowledge() -> Knowledge:
    global _instance
    if _instance is None:
        _instance = Knowledge()
    return _instance
