import { ChevronDown, ChevronUp, ExternalLink, Plus, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Chip, Disclaimer, EmptyState, ErrorBanner, InfoNote, MedicineDatalist, PageHeader, RiskBadge, Spinner, inputCls } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { useMedicines } from "../services/hooks";
import type { CheckResult, PairResult } from "../types";

const DEMO_PRESETS = ["Warfarin", "Aspirin", "Omeprazole", "Metformin", "Atorvastatin", "Lisinopril"];

function PairCard({ p, onExplain }: { p: PairResult; onExplain: () => void }) {
  const [open, setOpen] = useState(p.risk === "HIGH");
  const scorePercent = Math.round(p.model.score * 100);
  const scoreColor = p.risk === "HIGH" ? "bg-rose-500" : p.risk === "MODERATE" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <Card className="border border-slate-200/80 hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>{p.a_name}</span>
            <span className="text-slate-400">⚡</span>
            <span>{p.b_name}</span>
          </h3>
          <p className="mt-1 text-[15px] font-medium text-slate-600">{p.summary}</p>
        </div>
        <RiskBadge risk={p.risk} size="lg" />
      </div>

      {/* GCN Score bar */}
      <div className="mt-4 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
          <span>Neural Interaction Probability</span>
          <span className="font-bold text-slate-900">{scorePercent}% ({p.model.confidence_band} Confidence)</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div className={`h-full rounded-full ${scoreColor} transition-all duration-500`} style={{ width: `${scorePercent}%` }} />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Biological Mechanism</dt>
          <dd className="mt-1 font-semibold text-slate-800">{p.mechanism}</dd>
        </div>
        <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
          <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Concern</dt>
          <dd className="mt-1 font-semibold text-slate-800">{p.concern}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <InfoNote tone={p.risk === "HIGH" ? "warn" : "info"}>{p.advice}</InfoNote>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button onClick={onExplain}>
          Explain Graph Path
        </Button>
        <Button variant="secondary" onClick={() => setOpen(!open)}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Evidence & Patient Factors
        </Button>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Literature & Evidence</h4>
            <ul className="space-y-2 text-xs">
              {p.evidence.map((e, i) => (
                <li key={i} className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{e.source}</span>
                    {e.kind === "local-demo" && <span className="rounded bg-teal-100/70 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">curated record</span>}
                  </div>
                  <div className="mt-1 text-slate-600 leading-relaxed">{e.evidence}</div>
                  {e.link && (
                    <a href={e.link} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-900 underline">
                      {e.title} <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-slate-400">Patient Demographic Context</h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {p.patient_factors.map((f, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Checker() {
  const { activePatient, params, navigate, setLastCheck } = useApp();
  const meds = useMedicines();
  const [list, setList] = useState<string[]>(params.medicines ?? []);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoRan = useRef(false);

  async function run(names = list) {
    if (names.length < 2) { setError("Add at least two medicines to analyze combinations."); return; }
    setBusy(true); setError(null);
    try { const r = await api.check(names, activePatient?.id); setResult(r); setLastCheck(r); } catch (e: any) { setError(e.message); setResult(null); } finally { setBusy(false); }
  }
  useEffect(() => { if (!autoRan.current && params.medicines?.length >= 2) { autoRan.current = true; run(params.medicines); } }, []);

  function add(medicineName?: string) {
    const v = (medicineName || input).trim();
    if (!v) return;
    if (list.some((x) => x.toLowerCase() === v.toLowerCase())) { setError(`${v} is already in the list.`); return; }
    setList([...list, v]); if (!medicineName) setInput(""); setError(null);
  }
  function loadPatient() {
    if (!activePatient) return;
    const names = activePatient.medicines.map((id) => meds.find((m) => m.id === id)?.name ?? id);
    setList(names); if (names.length >= 2) run(names); else setError("This patient has fewer than two recorded medicines.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drug-Drug Interaction Checker"
        subtitle="Multi-medicine polypharmacy analysis. Evaluates pairwise pharmacokinetics, enzyme competition, and link predictions via GCN."
      />
      <MedicineDatalist id="chk-meds" names={meds.map((m) => m.name)} />

      <Card>
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2.5">
          <input
            list="chk-meds"
            className={inputCls}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type medicine name (e.g. Warfarin, Aspirin, Omeprazole)..."
            aria-label="Add medicine"
          />
          <Button type="submit" variant="secondary" className="shrink-0"><Plus className="h-4 w-4" />Add Medicine</Button>
        </form>

        {/* Quick presets */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="font-semibold text-slate-400">Quick suggestions:</span>
          {DEMO_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => add(p)}
              className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-colors"
            >
              + {p}
            </button>
          ))}
        </div>

        {/* Active medicines list */}
        <div className="mt-4 flex min-h-[38px] flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {list.length === 0 && <span className="text-xs text-slate-400 italic">No medicines added to the test tray yet.</span>}
          {list.map((m) => <Chip key={m} onRemove={() => { setList(list.filter((x) => x !== m)); setResult(null); }}>{m}</Chip>)}
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5 border-t border-slate-100 pt-4">
          <Button onClick={() => run()} loading={busy}>
            Analyze Interactions ({list.length})
          </Button>
          <Button variant="secondary" onClick={loadPatient} disabled={!activePatient}>
            <Users className="h-4 w-4" />
            Use {activePatient ? `${activePatient.name}'s` : "Patient"} Regimen
          </Button>
          {list.length > 0 && (
            <Button variant="ghost" onClick={() => { setList([]); setResult(null); }}>
              Clear Tray
            </Button>
          )}
        </div>
        {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
      </Card>

      {busy && <Spinner label="Running pairwise 2-layer GCN neural inference and biomedical graph traversal..." />}

      {result && !busy && (
        <div className="space-y-4">
          {result.unresolved.length > 0 && (
            <InfoNote tone="warn">Unrecognized and skipped: {result.unresolved.join(", ")}. Verify spelling or brand generic naming.</InfoNote>
          )}
          {result.pairs.length === 0 ? (
            <EmptyState title="No Known Interactions" text={result.message ?? "No significant interaction alerts found for this combination."} />
          ) : (
            <>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-display text-base font-bold text-slate-900">
                    {result.pairs.length} Pairwise Combination{result.pairs.length > 1 ? "s" : ""} Analyzed:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(["HIGH", "MODERATE", "LOW", "UNKNOWN"] as const).map(
                      (r) => result.counts[r] > 0 && (
                        <span key={r} className="flex items-center gap-1.5">
                          <RiskBadge risk={r} size="sm" />
                          <span className="text-xs font-bold text-slate-600">× {result.counts[r]}</span>
                        </span>
                      )
                    )}
                  </div>
                </div>
              </Card>

              {result.pairs.map((p) => (
                <PairCard key={p.a + p.b} p={p} onExplain={() => navigate("explain", { a: p.a_name, b: p.b_name })} />
              ))}

              <InfoNote tone="warn">{result.emergency}</InfoNote>
            </>
          )}
          <Disclaimer text={result.disclaimer} />
        </div>
      )}

      {!result && !busy && (
        <EmptyState
          title="Ready for Interaction Analysis"
          text="Add at least two medicines above or click 'Use Patient Regimen' to assess pharmacokinetic and pharmacodynamic interactions."
        />
      )}
    </div>
  );
}
