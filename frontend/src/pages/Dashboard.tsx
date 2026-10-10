import { BrainCircuit, CalendarClock, FileSearch, GitBranch, Gauge, Network, Pill, ScanLine, ShieldCheck, Sparkles, Stethoscope, TriangleAlert, User, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, Disclaimer, ErrorBanner, RiskBadge, Spinner } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

const STEPS = [
  { icon: Pill, title: "Medicine input", text: "Camera, upload or typed names" },
  { icon: ScanLine, title: "Medicine identification", text: "OCR on visible label text, confirmed by you" },
  { icon: Network, title: "Biomedical knowledge graph", text: "Drugs, enzymes, proteins, pathways, effects" },
  { icon: BrainCircuit, title: "GNN prediction", text: "GCN scores every medicine pair" },
  { icon: Gauge, title: "Risk assessment", text: "High, moderate, low or unknown" },
  { icon: GitBranch, title: "Explainable AI", text: "Graph paths show why" },
  { icon: FileSearch, title: "Evidence retrieval", text: "Sources and labelled demo evidence" },
  { icon: ShieldCheck, title: "Patient-centric guidance", text: "Context-aware, always professional-first" },
];

export default function Dashboard() {
  const { activePatient, navigate } = useApp();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activePatient) { setData(null); return; }
    setError(null);
    api.dashboard(activePatient.id).then(setData).catch((e) => setError(e.message));
  }, [activePatient?.id, activePatient?.medicines.length]);

  const stat = (num: string, icon: any, label: string, value: React.ReactNode, sub?: React.ReactNode, onClick?: () => void) => {
    const Icon = icon;
    return (
      <button
        onClick={onClick}
        onPointerMove={(e) => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          const el = e.currentTarget;
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = ((y - centerY) / centerY) * -3.2;
          const rotateY = ((x - centerX) / centerX) * 3.2;
          el.style.setProperty("--stat-x", `${x}px`);
          el.style.setProperty("--stat-y", `${y}px`);
          el.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
        }}
        onPointerLeave={(e) => {
          e.currentTarget.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
        }}
        className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#0E0F16] p-5 text-left shadow-xl transition-all duration-300 ease-out hover:border-cyan-500/40 hover:bg-[#13141E] overflow-hidden"
        style={{ willChange: "transform" }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: "radial-gradient(280px circle at var(--stat-x, 50%) var(--stat-y, 50%), rgba(0, 242, 254, 0.12), transparent 70%)",
          }}
        />
        <div className="relative z-10">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              [{num}] // {label}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-cyan-400 transition-transform group-hover:scale-110">
              <Icon className="h-4 w-4" aria-hidden />
            </div>
          </div>
          <div className="font-display text-2xl font-black uppercase tracking-tight text-white">{value}</div>
        </div>
        {sub && <div className="relative z-10 mt-4 text-xs font-mono text-neutral-400 border-t border-white/5 pt-2.5">{sub}</div>}
      </button>
    );
  };

  return (
    <div className="space-y-10">
      {/* Preymaker-Style Cinematic Hero with Mouse Reactivity */}
      <div
        onPointerMove={(e) => {
          const el = e.currentTarget;
          const rect = el.getBoundingClientRect();
          el.style.setProperty("--hero-x", `${e.clientX - rect.left}px`);
          el.style.setProperty("--hero-y", `${e.clientY - rect.top}px`);
        }}
        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0E0F16] via-[#090A0E] to-[#060709] p-8 sm:p-12 text-white shadow-2xl transition-colors duration-300 hover:border-white/20"
      >
        {/* Dynamic mouse-following radial flare */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: "radial-gradient(650px circle at var(--hero-x, 50%) var(--hero-y, 50%), rgba(0, 242, 254, 0.08), transparent 65%)",
          }}
        />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" aria-hidden />
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" aria-hidden />

        <div className="relative z-10">

          <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400">
            <span className="rounded bg-white/5 px-2.5 py-1 border border-white/10">[ MEDSAFE // CLINICAL INTELLIGENCE ]</span>
            <span className="rounded bg-white/5 px-2.5 py-1 border border-white/10">[ 3,200+ BIOMARKERS ]</span>
            <span className="rounded bg-white/5 px-2.5 py-1 border border-white/10">[ HIPAA-ALIGNED MOCKUP ]</span>
          </div>

          <h1 className="font-display text-3xl font-black uppercase tracking-tight sm:text-6xl text-white leading-tight">
            Future-Facing Intelligence <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              For Clinical Medication Safety.
            </span>
          </h1>

          <p className="mt-4 max-w-3xl text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
            Explainable pharmacovigilance predicting multi-drug polypharmacy interactions, enzymatic competition pathways, and automated multilingual elder phone adherence at neural scale.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              className="!bg-white !text-black hover:!bg-neutral-200 font-bold uppercase tracking-wider text-xs px-5 py-2.5 shadow-lg"
              onClick={() => navigate("scanner")}
            >
              <ScanLine className="h-3.5 w-3.5" />
              [ 01 // Scan Medicine Box ]
            </Button>
            <Button
              variant="secondary"
              className="border-white/20 hover:border-white/40 text-xs uppercase tracking-wider"
              onClick={() => navigate("checker")}
            >
              <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
              [ 02 // Check Drug Conflicts ]
            </Button>
            <Button
              variant="secondary"
              className="border-white/20 hover:border-white/40 text-xs uppercase tracking-wider"
              onClick={() => navigate("elder-agent")}
            >
              [ 03 // Elder Voice Simulator ]
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4 font-mono">
            <div>
              <div className="text-xl font-bold text-white">3,200+</div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Validated Biomarkers</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">2-LAYER GCN</div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Neural Link Predictor</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">3 LANGUAGES</div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Senior Audio Reminders</div>
            </div>
            <div>
              <div className="text-xl font-bold text-white">100% EXPLAINABLE</div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Metabolic Pathways</div>
            </div>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {!activePatient ? (
        <Card>
          <div className="py-8 text-center text-white">
            <User className="mx-auto h-12 w-12 text-neutral-600" />
            <h3 className="mt-3 font-display text-base font-bold uppercase tracking-wider">No Patient Case Selected</h3>
            <p className="mt-1 text-xs text-neutral-400 font-sans">Select or create a patient case file to initiate personalized interaction analysis.</p>
            <Button className="mt-4" onClick={() => navigate("patients")}>Create Case Profile</Button>
          </div>
        </Card>
      ) : !data ? (
        <Spinner label="Ingesting biomedical knowledge graph telemetry..." />
      ) : (
        <>
          {/* Key Metric Tiles (Preymaker Style) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stat(
              "01",
              User,
              "Active Case",
              data.patient.name,
              <span>AGE {data.patient.age ?? "N/A"}{data.patient.is_demo ? " // DEMO CASE" : ""}</span>,
              () => navigate("patients")
            )}
            {stat(
              "02",
              Pill,
              "Prescription Regimen",
              `${data.medicines.length} Drugs`,
              <span className="truncate block uppercase">{data.medicines.map((m: any) => m.name).join(", ") || "None"}</span>,
              () => navigate("patients")
            )}
            {stat(
              "03",
              TriangleAlert,
              "Identified Conflicts",
              `${data.alert_counts.HIGH + data.alert_counts.MODERATE} Total`,
              <span className="flex gap-3 font-mono font-bold">
                <span className="text-rose-400">{data.alert_counts.HIGH} CRITICAL</span>
                <span className="text-amber-400">{data.alert_counts.MODERATE} MOD</span>
                <span className="text-emerald-400">{data.alert_counts.LOW} LOW</span>
              </span>,
              () => navigate("checker", { medicines: data.medicines.map((m: any) => m.name) })
            )}
            {stat(
              "04",
              CalendarClock,
              "Dosage Schedule",
              `${data.schedule_count} Timed Doses`,
              "MONITORED MEAL & BEDTIME WINDOWS",
              () => navigate("schedule")
            )}
            {stat(
              "05",
              ScanLine,
              "Prescription Vision",
              data.last_scan ? (data.last_scan.medicine ?? "RECOGNIZED") : "READY",
              data.last_scan ? `TIMESTAMP: ${new Date(data.last_scan.created_at).toLocaleTimeString()}` : "SCAN DRUG LABEL PHOTO",
              () => navigate("scanner")
            )}
            {stat(
              "06",
              Workflow,
              "Inference Engine",
              data.model.trained ? "GCN LINK ACTIVE" : "HEURISTIC GRAPH",
              data.model.name.toUpperCase(),
              () => navigate("model")
            )}
          </div>

          {/* Highest-Priority Combinations */}
          {data.top_alerts.length > 0 && (
            <Card
              title="Prioritized Adverse Drug Interactions"
              action={
                <Button
                  variant="secondary"
                  onClick={() => navigate("checker", { medicines: data.medicines.map((m: any) => m.name) })}
                >
                  Open Full Checker
                </Button>
              }
            >
              <div className="space-y-3">
                {data.top_alerts.map((a: any, i: number) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0A0B10] p-4 transition-all hover:border-white/20"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-display text-base font-bold uppercase text-white">
                        <span>{a.a}</span>
                        <span className="text-cyan-400">⚡</span>
                        <span>{a.b}</span>
                      </div>
                      <div className="mt-1 text-xs text-neutral-400 font-sans">{a.summary}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RiskBadge risk={a.risk} size="md" />
                      <Button
                        variant="secondary"
                        className="!text-[10px] !py-1 !px-2.5 font-mono"
                        onClick={() => navigate("explain", { a: a.a, b: a.b })}
                      >
                        [ Explain Path ]
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Visual Workflow Pipeline (Preymaker Portfolio Grid Style) */}
      <Card title="Eight-Phase Clinical AI Verification Pipeline">
        <p className="mb-6 text-xs text-neutral-400 font-sans">
          Every clinical recommendation traverses an eight-stage verification pipeline ensuring pharmacokinetic transparency, mechanistic tracing, and auditability.
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 font-mono">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const phaseNum = `0${i + 1}`;
            return (
              <div
                key={s.title}
                className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-[#090A0E] p-4 transition-all hover:border-cyan-400/40 hover:bg-[#0E0F16]"
              >
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-400">
                      PHASE // {phaseNum}
                    </span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-cyan-300">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </div>
                  </div>
                  <div className="font-display text-xs font-bold uppercase tracking-wider text-white">{s.title}</div>
                  <div className="mt-1.5 text-[11px] text-neutral-500 font-sans leading-relaxed">{s.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Disclaimer text={data?.disclaimer} />
    </div>
  );
}
