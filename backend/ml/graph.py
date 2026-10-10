"""Knowledge-graph tensors for the GCN. Uses numpy only (no torch needed)."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np

from backend.services.knowledge import Knowledge, get_knowledge

NODE_TYPES = ["drug", "protein", "enzyme", "disease", "pathway", "adverse_effect"]


@dataclass
class GraphData:
    node_ids: List[str]
    node_type_idx: np.ndarray          # (N,)
    kg_edges: np.ndarray               # (2, E) knowledge edges, one direction
    drug_ids: List[str]                # medicine ids, order == drug rows
    drug_nodes: np.ndarray             # (D,) node index for each drug
    positives: List[Tuple[int, int]]   # drug-row index pairs (i < j) with a known interaction

    @property
    def n_nodes(self) -> int:
        return len(self.node_ids)

    @property
    def n_drugs(self) -> int:
        return len(self.drug_ids)


def build_graph(k: Knowledge | None = None) -> GraphData:
    k = k or get_knowledge()
    g = k.graph()
    node_ids = [n["id"] for n in g["nodes"]]
    idx: Dict[str, int] = {nid: i for i, nid in enumerate(node_ids)}
    type_idx = np.array([NODE_TYPES.index(n["type"]) for n in g["nodes"]], dtype=np.int64)
    edges = np.array([[idx[e["source"]], idx[e["target"]]] for e in g["edges"]], dtype=np.int64).T
    drug_ids = sorted(k.medicines.keys())
    drug_nodes = np.array([idx[f"drug:{d}"] for d in drug_ids], dtype=np.int64)
    row = {d: i for i, d in enumerate(drug_ids)}
    positives = sorted({tuple(sorted((row[a], row[b]))) for (a, b) in k.interactions.keys()})
    return GraphData(node_ids, type_idx, edges, drug_ids, drug_nodes, positives)


def normalized_adjacency(data: GraphData, ddi_pairs: List[Tuple[int, int]]) -> np.ndarray:
    """Symmetric-normalised adjacency with self loops: D^-1/2 (A+I) D^-1/2.

    Contains knowledge edges plus ONLY the drug-drug pairs passed in, so that
    validation/test interactions never leak into message passing.
    """
    n = data.n_nodes
    a = np.zeros((n, n), dtype=np.float32)
    s, t = data.kg_edges
    a[s, t] = 1.0
    a[t, s] = 1.0
    for i, j in ddi_pairs:
        u, v = data.drug_nodes[i], data.drug_nodes[j]
        a[u, v] = 1.0
        a[v, u] = 1.0
    a += np.eye(n, dtype=np.float32)
    d = a.sum(1)
    d_inv_sqrt = 1.0 / np.sqrt(d)
    return (a * d_inv_sqrt[:, None]) * d_inv_sqrt[None, :]


def all_candidate_pairs(n_drugs: int) -> List[Tuple[int, int]]:
    return [(i, j) for i in range(n_drugs) for j in range(i + 1, n_drugs)]
