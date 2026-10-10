"""Train and honestly evaluate the GCN drug-drug interaction model.

Usage (from the project root):
    python -m backend.ml.train --epochs 300 --seed 42

Writes models/medsafe_gcn.npz (embeddings + decoder for numpy inference) and
models/metrics.json (REAL metrics computed on held-out pairs). Nothing here is
hard-coded: if you never run this script, the website shows "not trained yet".
"""
from __future__ import annotations

import argparse
import copy
import json
import random
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from backend.ml.graph import NODE_TYPES, all_candidate_pairs, build_graph, normalized_adjacency
from backend.services.knowledge import DATASET_LABEL, ROOT

MODELS_DIR = ROOT / "models"


def sample_negatives(rng, n_drugs, forbidden: set, count: int, exclude: set | None = None):
    exclude = exclude or set()
    pool = [p for p in all_candidate_pairs(n_drugs) if p not in forbidden and p not in exclude]
    rng.shuffle(pool)
    return pool[:count]


def metrics_from_scores(y_true, y_score, threshold):
    from sklearn.metrics import (accuracy_score, average_precision_score, f1_score, precision_score,
                                 recall_score, roc_auc_score)
    y_pred = (np.asarray(y_score) >= threshold).astype(int)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_score)),
        "average_precision": float(average_precision_score(y_true, y_score)),
        "threshold": float(threshold),
        "n_eval_pairs": int(len(y_true)),
    }


def best_threshold(y_true, y_score):
    from sklearn.metrics import f1_score
    best_t, best_f = 0.5, -1.0
    for t in np.linspace(0.1, 0.9, 33):
        f = f1_score(y_true, (np.asarray(y_score) >= t).astype(int), zero_division=0)
        if f > best_f:
            best_t, best_f = float(t), f
    return best_t


def run_experiment(data, train_pos, val_pos, test_pos, seed, epochs, lr, dim, hidden, dropout, verbose=True):
    import torch
    import torch.nn.functional as F
    from backend.ml.model import GCNLinkPredictor

    torch.manual_seed(seed)
    rng = random.Random(seed)
    all_pos = set(data.positives)
    train_set = set(train_pos)

    # Fixed evaluation negatives (never a known positive), disjoint between val and test.
    val_neg = sample_negatives(rng, data.n_drugs, all_pos, len(val_pos))
    test_neg = sample_negatives(rng, data.n_drugs, all_pos, len(test_pos), exclude=set(val_neg))

    model = GCNLinkPredictor(data.n_nodes, len(NODE_TYPES), data.node_type_idx, dim, hidden, dropout)
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)
    a_full_train = torch.tensor(normalized_adjacency(data, list(train_pos)))
    drug_nodes = torch.as_tensor(data.drug_nodes)

    def score_pairs(pairs):
        model.eval()
        with torch.no_grad():
            h = model.encode(a_full_train)
            u = drug_nodes[[p[0] for p in pairs]]
            v = drug_nodes[[p[1] for p in pairs]]
            return torch.sigmoid(model.decode(h, u, v)).numpy()

    best_state, best_ap, best_epoch, history = None, -1.0, 0, []
    from sklearn.metrics import average_precision_score
    patience, since_best = 60, 0
    for epoch in range(1, epochs + 1):
        model.train()
        # Hold out a random 30% of training positives from message passing and use them as targets,
        # so the model cannot simply read the answer from the adjacency matrix.
        shuffled = list(train_pos)
        rng.shuffle(shuffled)
        k = max(1, int(0.3 * len(shuffled)))
        targets, message = shuffled[:k], shuffled[k:]
        a_hat = torch.tensor(normalized_adjacency(data, message))
        negs = sample_negatives(rng, data.n_drugs, train_set, len(targets))
        pairs = targets + negs
        labels = torch.tensor([1.0] * len(targets) + [0.0] * len(negs))
        u = drug_nodes[[p[0] for p in pairs]]
        v = drug_nodes[[p[1] for p in pairs]]
        h = model.encode(a_hat)
        loss = F.binary_cross_entropy_with_logits(model.decode(h, u, v), labels)
        opt.zero_grad()
        loss.backward()
        opt.step()
        if epoch % 5 == 0 or epoch == 1:
            vs = score_pairs(val_pos + val_neg)
            vy = [1] * len(val_pos) + [0] * len(val_neg)
            ap = float(average_precision_score(vy, vs))
            history.append({"epoch": epoch, "loss": float(loss.item()), "val_average_precision": ap})
            if ap > best_ap:
                best_ap, best_epoch, since_best = ap, epoch, 0
                best_state = copy.deepcopy(model.state_dict())
            else:
                since_best += 5
            if verbose and epoch % 50 == 0:
                print(f"  epoch {epoch:4d}  loss {loss.item():.4f}  val AP {ap:.3f}")
            if since_best >= patience:
                break
    model.load_state_dict(best_state)

    vy = [1] * len(val_pos) + [0] * len(val_neg)
    vs = score_pairs(val_pos + val_neg)
    thr = best_threshold(vy, vs)
    ty = [1] * len(test_pos) + [0] * len(test_neg)
    ts = score_pairs(test_pos + test_neg)
    result = {
        "validation": metrics_from_scores(vy, vs, thr),
        "test": metrics_from_scores(ty, ts, thr),
        "best_epoch": best_epoch,
        "history": history,
        "test_y": ty, "test_s": [float(x) for x in ts],
    }
    return model, result, thr, a_full_train


def split_positives(positives, seed, val_frac=0.15, test_frac=0.15):
    rng = random.Random(seed)
    pos = list(positives)
    rng.shuffle(pos)
    n_test = max(2, round(len(pos) * test_frac))
    n_val = max(2, round(len(pos) * val_frac))
    return pos[n_test + n_val:], pos[n_test:n_test + n_val], pos[:n_test]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=300)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--lr", type=float, default=0.01)
    ap.add_argument("--dim", type=int, default=32)
    ap.add_argument("--hidden", type=int, default=32)
    ap.add_argument("--dropout", type=float, default=0.3)
    ap.add_argument("--folds", type=int, default=5)
    args = ap.parse_args()

    import sklearn
    import torch
    from sklearn.metrics import precision_recall_curve, roc_curve

    data = build_graph()
    print(f"Graph: {data.n_nodes} nodes, {data.kg_edges.shape[1]} knowledge edges, "
          f"{data.n_drugs} drugs, {len(data.positives)} interaction pairs")
    t0 = time.time()
    train_pos, val_pos, test_pos = split_positives(data.positives, args.seed)
    print(f"Main split -> train {len(train_pos)} / val {len(val_pos)} / test {len(test_pos)} positive pairs")
    model, res, thr, a_train = run_experiment(data, train_pos, val_pos, test_pos, args.seed, args.epochs,
                                              args.lr, args.dim, args.hidden, args.dropout)
    print("Test metrics:", {k: round(v, 3) for k, v in res["test"].items() if isinstance(v, float)})

    # k-fold cross-validation over positive pairs (more trustworthy than one tiny test split)
    rng = random.Random(args.seed)
    pos = list(data.positives)
    rng.shuffle(pos)
    folds = [pos[i::args.folds] for i in range(args.folds)]
    cv = []
    for f in range(args.folds):
        test_f, val_f = folds[f], folds[(f + 1) % args.folds]
        train_f = [p for i, fold in enumerate(folds) if i not in (f, (f + 1) % args.folds) for p in fold]
        print(f"CV fold {f + 1}/{args.folds}")
        _, r, _, _ = run_experiment(data, train_f, val_f, test_f, args.seed + f + 1, args.epochs,
                                    args.lr, args.dim, args.hidden, args.dropout, verbose=False)
        cv.append(r["test"])
    keys = ["accuracy", "precision", "recall", "f1", "roc_auc", "average_precision"]
    cv_mean = {k: float(np.mean([c[k] for c in cv])) for k in keys}
    cv_std = {k: float(np.std([c[k] for c in cv])) for k in keys}

    # Persist deployable artefacts (numpy only, so the API does not need torch)
    model.eval()
    with torch.no_grad():
        h = model.encode(a_train).numpy()
        sd = {k: v.numpy() for k, v in model.state_dict().items()}
    MODELS_DIR.mkdir(exist_ok=True)
    np.savez(MODELS_DIR / "medsafe_gcn.npz",
             embeddings=h[data.drug_nodes], drug_ids=np.array(data.drug_ids),
             w1=sd["dec1.weight"], b1=sd["dec1.bias"], w2=sd["dec2.weight"], b2=sd["dec2.bias"],
             threshold=np.array(res["test"]["threshold"]))

    fpr, tpr, _ = roc_curve(res["test_y"], res["test_s"])
    prec, rec, _ = precision_recall_curve(res["test_y"], res["test_s"])
    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "dataset": {"name": "MedSafe demonstration knowledge graph", "label": DATASET_LABEL,
                    "drug_nodes": data.n_drugs, "total_nodes": data.n_nodes,
                    "knowledge_edges": int(data.kg_edges.shape[1]),
                    "interaction_edges": len(data.positives),
                    "candidate_drug_pairs": len(all_candidate_pairs(data.n_drugs))},
        "split": {"train_positive": len(train_pos), "validation_positive": len(val_pos),
                  "test_positive": len(test_pos), "negatives": "1:1 sampled from pairs with no known interaction",
                  "seed": args.seed},
        "validation": res["validation"], "test": res["test"], "best_epoch": res["best_epoch"],
        "cross_validation": {"folds": args.folds, "mean": cv_mean, "std": cv_std, "per_fold": cv},
        "curves": {"roc": [[float(a), float(b)] for a, b in zip(fpr, tpr)],
                   "pr": [[float(a), float(b)] for a, b in zip(rec, prec)]},
        "history": res["history"],
        "hyperparameters": {"epochs": args.epochs, "lr": args.lr, "embedding_dim": args.dim,
                            "hidden_dim": args.hidden, "dropout": args.dropout, "weight_decay": 5e-4,
                            "architecture": "2-layer GCN encoder + symmetric MLP decoder"},
        "environment": {"torch": torch.__version__, "sklearn": sklearn.__version__, "numpy": np.__version__},
        "notes": "Tiny demonstration graph: metrics have high variance. Cross-validation is shown for that reason. "
                 "Curated interactions in the database were part of the graph, so scores for those pairs are not a measure of generalisation.",
        "train_seconds": round(time.time() - t0, 1),
    }
    (MODELS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=1), encoding="utf-8")
    print(f"Saved models/medsafe_gcn.npz and models/metrics.json in {metrics['train_seconds']}s")
    print("CV mean:", {k: round(v, 3) for k, v in cv_mean.items()})


if __name__ == "__main__":
    main()
