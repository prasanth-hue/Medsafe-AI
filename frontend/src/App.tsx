import { ChatWidget } from "./components/ChatPanel";
import InteractiveMouse from "./components/InteractiveMouse";
import Sidebar from "./components/Sidebar";
import { ErrorBanner, Spinner } from "./components/ui";
import { useApp } from "./context/AppContext";
import Assistant from "./pages/Assistant";
import Checker from "./pages/Checker";
import Dashboard from "./pages/Dashboard";
import ElderAgent from "./pages/ElderAgent";
import Evidence from "./pages/Evidence";
import Explain from "./pages/Explain";
import Login from "./pages/Login";
import MedicineInfo from "./pages/MedicineInfo";
import Model from "./pages/Model";
import Patients from "./pages/Patients";
import Scanner from "./pages/Scanner";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";
import Subscription from "./pages/Subscription";

export default function App() {
  const { page, backendError, loading, refreshPatients, user, setUser } = useApp();
  const view = {
    dashboard: <Dashboard />, patients: <Patients />, scanner: <Scanner />, medicines: <MedicineInfo />, schedule: <Schedule />,
    "elder-agent": <ElderAgent />,
    checker: <Checker />, explain: <Explain />, model: <Model />, evidence: <Evidence />, assistant: <Assistant />,
    subscription: <Subscription />, settings: <Settings />,
  }[page];

  // If user is not authenticated, show the Login page with interactive mouse & rights notice
  if (!user) {
    return (
      <div className="relative min-h-screen bg-[#060709] text-white">
        <InteractiveMouse />
        <Login onLogin={setUser} />
        <footer className="relative z-10 border-t border-white/10 bg-[#07080C]/90 py-4 text-center font-mono text-xs text-white/50 backdrop-blur-md">
          @all rights are reserved
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#060709] text-white selection:bg-[#00F2FE]/20 selection:text-[#00F2FE]">
      {/* Reactive ambient mouse spotlight & neural graph canvas */}
      <InteractiveMouse />

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:text-black focus:p-3">Skip to content</a>
      <Sidebar />
      <div className="lg:ml-64 flex flex-col min-h-screen relative z-10">
        {/* Preymaker minimalist clinical top bar */}
        <header className="sticky top-0 z-20 hidden lg:flex h-14 items-center justify-between border-b border-white/10 bg-[#07080C]/90 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              [ MEDSAFE // CLINICAL TELEMETRY ]
            </span>
            <span className="text-neutral-700">/</span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              {page.replace("-", " ")}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 border border-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>GCN_V2.4 [ONLINE]</span>
            </div>
            <div className="h-3 w-px bg-white/10" />
            <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              OPERATOR: <strong className="text-white">{user.name}</strong>
            </div>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 pb-16 pt-6 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            {loading ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner label="Loading clinical knowledge graph & patient records..." />
              </div>
            ) : backendError ? (
              <div className="mx-auto mt-10 max-w-xl">
                <ErrorBanner message={backendError} onRetry={refreshPatients} />
                <p className="mt-3 text-sm text-slate-500 font-mono">
                  Start the backend with <code className="rounded bg-white/10 px-1.5 py-0.5 border border-white/10 text-white">run_backend.bat</code> (Windows) or <code className="rounded bg-white/10 px-1.5 py-0.5 border border-white/10 text-white">uvicorn backend.main:app --port 8000</code>.
                </p>
              </div>
            ) : (
              view
            )}
          </div>
        </main>

        {/* Preymaker technical clinical footer */}
        <footer className="mt-auto border-t border-white/10 bg-[#07080C]/85 px-4 py-6 sm:px-8 lg:px-10 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-white/50">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00F2FE]" />
              <span className="text-white font-bold tracking-wider">[ MEDSAFE // CLINICAL INTELLIGENCE ]</span>
              <span className="text-white/20">•</span>
              <span>GCN_V2.4</span>
            </div>
            <div className="text-white/40">
              Biomedical Knowledge Graph & Neural Link Prediction
            </div>
            <div className="text-white/70 font-semibold tracking-wider">
              @all rights are reserved
            </div>
          </div>
        </footer>
      </div>
      <ChatWidget />
    </div>
  );
}

