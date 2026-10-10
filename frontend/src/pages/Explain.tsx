import { useEffect, useRef, useState } from "react";
import GraphView from "../components/GraphView";
import { Button, Card, Disclaimer, EmptyState, ErrorBanner, Field, InfoNote, MedicineDatalist, RiskBadge, Spinner, inputCls } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { useMedicines } from "../services/hooks";
import type { ExplainResult } from "../types";

export default function Explain() {
  const { activePatient, params, lastCheck } = useApp();
  const meds = useMedicines();
  const [a, setA] = useState<string>(params.a ?? "");
  const [b, setB] = useState<string>(params.b ?? "");
  const [res, setRes] = useState<ExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const auto = useRef(false);

  async function run(x = a, y = b) {
    if (!x.trim() || !y.trim()) { setError("Choose two medicines to explain."); return; }
    setBusy(true); setError(null);
    try { setRes(await api.explain(x, y, activePatient?.id)); } catch (e: any) { setError(e.message); setRes(null); } finally { setBusy(false); }
  }
  useEffect(() => { if (!auto.current && params.a && params.b) { auto.current = true; run(params.a, params.b); } }, []);

  const top = lastCheck?.pairs?.[0];

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#00F2FE]">
          <span>[ 03 // EXPLAINABLE AI ]</span>
          <span className="text-white/20">•</span>
          <span className="text-white/40">GNN PATH ATTRIBUTION ENGINE</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
          Graph Attribution & Reasoning
        </h1>
        <p className="mt-2 text-sm text-white/60 max-w-2xl font-light">
          Trace which biomedical knowledge graph subpaths, enzymatic routes, and molecular pathways govern the link prediction between candidate molecules.
        </p>
      </div>

      <MedicineDatalist id="xai-meds" names={meds.map((m) => m.name)} />

      <Card>
        <form onSubmit={(e) => { e.preventDefault(); run(); }} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Molecule / Medicine A">
            <input list="xai-meds" className={inputCls} placeholder="e.g. Warfarin" value={a} onChange={(e) => setA(e.target.value)} />
          </Field>
          <Field label="Molecule / Medicine B">
            <input list="xai-meds" className={inputCls} placeholder="e.g. Aspirin" value={b} onChange={(e) => setB(e.target.value)} />
          </Field>
          <Button type="submit" loading={busy} className="h-[42px]">
            Explain Graph Path
          </Button>
        </form>
        {top && (
          <button
            type="button"
            className="mt-3 text-xs font-mono text-[#00F2FE] hover:underline"
            onClick={() => { setA(top.a_name); setB(top.b_name); run(top.a_name, top.b_name); }}
          >
            ↳ Trace latest verified pair: {top.a_name} + {top.b_name}
          </button>
        )}
        {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
      </Card>

      {busy && <Spinner label="Traversing biomedical knowledge graph & computing subpath attributions..." />}
      {!res && !busy && (
        <div className="mt-6">
          <EmptyState title="No Pair Selected" text="Select two medicines above or launch path analysis directly from the Interaction Checker." />
        </div>
      )}

      {res && !busy && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase text-white/40 tracking-wider">[ INTERACTION ATTRIBUTION ]</span>
                <h2 className="text-2xl font-bold tracking-tight text-white uppercase">{res.a_name} + {res.b_name}</h2>
              </div>
              <RiskBadge risk={res.risk} size="lg" />
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <dt className="text-xs font-mono uppercase text-white/40">GCN Classification</dt>
                <dd className="mt-1 font-semibold text-white">
                  {res.risk === "UNKNOWN" ? (res.model.score >= 0.6 ? "Predicted Unverified Link" : "No Critical Interaction") : "Confirmed Link Recorded"}
                </dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <dt className="text-xs font-mono uppercase text-white/40">Neural Link Probability</dt>
                <dd className="mt-1 font-mono text-xl font-bold text-[#00F2FE]">{(res.model.score * 100).toFixed(1)}%</dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
                <dt className="text-xs font-mono uppercase text-white/40">Confidence Band</dt>
                <dd className="mt-1 font-mono text-sm capitalize text-white">
                  {res.model.confidence_band} ({(res.model.confidence * 100).toFixed(0)}%)
                </dd>
              </div>
            </dl>

            <p className="mt-4 text-sm leading-relaxed text-white/80">{res.summary}</p>
            {res.model.engine !== "gcn" && (
              <div className="mt-3">
                <InfoNote tone="warn">The GCN model weights have not been trained yet; scoring relies on high-order graph topological overlap.</InfoNote>
              </div>
            )}
            {res.note && <p className="mt-2 text-xs font-mono italic text-white/40">{res.note}</p>}
          </Card>

          <Card title="Mechanistic Subgraph Topology">
            <GraphView graph={res.graph} a={res.a} b={res.b} />
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs font-mono uppercase tracking-wider text-[#00F2FE]">Biological Mechanism</div>
              <p className="mt-1 text-sm leading-relaxed text-white/80">{res.mechanism}</p>
            </div>
            <p className="mt-3 text-[11px] font-mono text-white/40">{res.attribution_method}</p>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Influential Knowledge Graph Nodes">
              {res.important_nodes.length === 0 ? (
                <p className="text-xs font-mono text-white/40">No intermediate shared nodes found in topological radius.</p>
              ) : (
                <ul className="space-y-3">
                  {res.important_nodes.map((n, i) => (
                    <li key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-white">
                          {n.label} <span className="text-white/40">({n.type.replace("_", " ")})</span>
                        </span>
                        <span className="font-mono text-[#00F2FE]">{(n.importance * 100).toFixed(0)}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#00F2FE]" style={{ width: `${n.importance * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Key Physiological Relations">
              {res.important_relationships.length === 0 ? (
                <p className="text-xs font-mono text-white/40">None recorded.</p>
              ) : (
                <ul className="space-y-2 text-xs text-white/80">
                  {res.important_relationships.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <span className="font-mono text-[#00F2FE]">[{String(i + 1).padStart(2, "0")}]</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Patient Physiological Profile">
              <ul className="space-y-2 text-xs text-white/80">
                {res.patient_factors.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00F2FE]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Biomedical Literature & Reference">
              <ul className="space-y-2 text-xs">
                {res.evidence.map((e, i) => (
                  <li key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="font-mono font-semibold uppercase text-white/90">{e.source}</div>
                    <div className="mt-1 text-white/60">{e.evidence}</div>
                    {e.link && (
                      <a href={e.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-mono text-[11px] text-[#00F2FE] hover:underline">
                        ↗ {e.title}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <InfoNote>{res.advice}</InfoNote>
          <Disclaimer text={res.disclaimer} />
        </div>
      )}
    </div>
  );
}
