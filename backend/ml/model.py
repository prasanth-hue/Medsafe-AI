"""PyTorch GCN link predictor (dense formulation).

A dense GCN layer computes  H' = A_hat @ H @ W  which is exactly what
torch_geometric.nn.GCNConv computes for A_hat = D^-1/2 (A+I) D^-1/2. With ~100
nodes the dense form is simple, fast and has no extra dependency.
Torch is imported here only, so inference and the rest of the app run without it.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class GCNLinkPredictor(nn.Module):
    def __init__(self, n_nodes: int, n_types: int, node_type_idx, dim: int = 32, hidden: int = 32, dropout: float = 0.3):
        super().__init__()
        self.register_buffer("node_type_idx", torch.as_tensor(node_type_idx, dtype=torch.long))
        self.node_emb = nn.Embedding(n_nodes, dim)
        self.type_emb = nn.Embedding(n_types, dim)
        self.w1 = nn.Linear(dim, hidden)
        self.w2 = nn.Linear(hidden, hidden)
        self.dec1 = nn.Linear(2 * hidden, hidden)
        self.dec2 = nn.Linear(hidden, 1)
        self.dropout = dropout
        nn.init.xavier_uniform_(self.node_emb.weight)

    def encode(self, a_hat: torch.Tensor) -> torch.Tensor:
        x = self.node_emb.weight + self.type_emb(self.node_type_idx)
        x = F.dropout(x, self.dropout, self.training)
        h = F.relu(a_hat @ self.w1(x))
        h = F.dropout(h, self.dropout, self.training)
        return a_hat @ self.w2(h)

    def decode(self, h: torch.Tensor, u: torch.Tensor, v: torch.Tensor) -> torch.Tensor:
        hu, hv = h[u], h[v]
        feats = torch.cat([hu * hv, (hu - hv).abs()], dim=-1)   # symmetric in (u, v)
        return self.dec2(F.relu(self.dec1(feats))).squeeze(-1)
