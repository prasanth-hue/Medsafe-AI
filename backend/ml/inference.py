"""Numpy-only inference for the trained GCN, with a transparent graph-heuristic fallback."""
from __future__ import annotations

import json
from typing import Dict, Optional, Tuple

import numpy as np

from backend.services.knowledge import ROOT, Knowledge, get_knowledge

MODELS_DIR = ROOT / "models"
SERIOUS_EFFECTS = {"bleeding", "hyperkalemia", "hypokalemia", "serotonin_syndrome", "myopathy", "qt_prolongation",
                   "hypotension", "nephrotoxicity", "hepatotoxicity", "bone_marrow_suppression", "seizures",
                   "lactic_acidosis", "gi_ulcer"}


class Predictor:
    def __init__(self, k: Optional[Knowledge] = None):
        self.k = k or get_knowledge()
        self.trained = False
        self.info: Dict = {}
        self._load()

    def _load(self):
        path = MODELS_DIR / "medsafe_gcn.npz"
        if not path.exists():
            return
        try:
            z = np.load(path, allow_pickle=False)
            self.emb = z["embeddings"]
            self.row = {str(d): i for i, d in enumerate(z["drug_ids"])}
            self.w1, self.b1, self.w2, self.b2 = z["w1"], z["b1"], z["w2"], z["b2"]
            self.threshold = float(z["threshold"])
            self.trained = True
        except Exception:
            self.trained = False

    def metrics(self) -> Optional[dict]:
        path = MODELS_DIR / "metrics.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None

    @property
    def model_name(self) -> str:
        return "GCN link predictor (trained)" if self.trained else "Graph-overlap heuristic (GCN not trained yet)"

    # ----- scoring -----
    def score(self, a: str, b: str) -> Tuple[float, str]:
        if self.trained and a in self.row and b in self.row:
            hu, hv = self.emb[self.row[a]], self.emb[self.row[b]]
            f = np.concatenate([hu * hv, np.abs(hu - hv)])
            hidden = np.maximum(self.w1 @ f + self.b1, 0.0)
            logit = float(self.w2 @ hidden + self.b2)
            return float(1.0 / (1.0 + np.exp(-logit))), "gcn"
        return self.heuristic(a, b), "heuristic"

    def heuristic(self, a: str, b: str) -> float:
        ma, mb = self.k.medicines[a], self.k.medicines[b]
        z = 0.0
        for x, y in ((ma, mb), (mb, ma)):
            z += 1.0 * len(set(x["inhibits"]) & set(y["substrate"]))
            z += 1.0 * len(set(x["induces"]) & set(y["substrate"]))
        z += 0.8 * len((set(ma["adverse"]) & set(mb["adverse"])) & SERIOUS_EFFECTS)
        z += 0.5 * len(set(ma["targets"]) & set(mb["targets"]))
        z += 0.3 * len(set(ma["pathways"]) & set(mb["pathways"]))
        return float(min(0.95, 1.0 - np.exp(-0.9 * z)))


_predictor: Optional[Predictor] = None


def get_predictor(reload: bool = False) -> Predictor:
    global _predictor
    if _predictor is None or reload:
        _predictor = Predictor()
    return _predictor
