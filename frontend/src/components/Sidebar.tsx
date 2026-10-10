import { Activity, BookOpenCheck, Brain, CalendarClock, Crown, FileSearch, GitCompareArrows, LayoutDashboard, LogOut, Menu, MessageCircle, PhoneCall, ScanLine, Settings, Sparkles, Stethoscope, Users, X, Zap } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import type { PageId } from "../types";

export const NAV: { id: PageId; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patient Profiles", icon: Users },
  { id: "scanner", label: "Scan Medicine", icon: ScanLine },
  { id: "medicines", label: "Medicine Information", icon: Stethoscope },
  { id: "schedule", label: "Medication Schedule", icon: CalendarClock },
  { id: "elder-agent", label: "Elder Call & SMS Agent", icon: PhoneCall },
  { id: "checker", label: "Interaction Checker", icon: GitCompareArrows },
  { id: "explain", label: "Explainable AI", icon: Brain },
  { id: "model", label: "Model & Evaluation", icon: Activity },
  { id: "evidence", label: "Evidence & Sources", icon: BookOpenCheck },
  { id: "assistant", label: "AI Assistant", icon: MessageCircle },
  { id: "subscription", label: "Pricing & Plans", icon: Sparkles },
  { id: "settings", label: "Settings & About", icon: Settings },
];

export const NAV_ITEMS: { id: PageId; num: string; label: string; icon: any; tag?: string }[] = [
  { id: "dashboard", num: "01", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", num: "02", label: "Patient Profiles", icon: Users },
  { id: "scanner", num: "03", label: "Prescription OCR", icon: ScanLine, tag: "VISION" },
  { id: "medicines", num: "04", label: "Drug Directory", icon: Stethoscope },
  { id: "schedule", num: "05", label: "Med Schedule", icon: CalendarClock },
  { id: "elder-agent", num: "06", label: "Elder Voice & SMS", icon: PhoneCall, tag: "AUDIO" },
  { id: "checker", num: "07", label: "Interaction Checker", icon: GitCompareArrows, tag: "GCN" },
  { id: "explain", num: "08", label: "Explainable AI", icon: Brain },
  { id: "model", num: "09", label: "GCN Neural Model", icon: Activity },
  { id: "evidence", num: "10", label: "Clinical Sources", icon: BookOpenCheck },
  { id: "assistant", num: "11", label: "Clinical Copilot", icon: MessageCircle },
  { id: "subscription", num: "12", label: "Access & Plans", icon: Sparkles },
  { id: "settings", num: "13", label: "System Config", icon: Settings },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/20 text-white shadow-md">
        <svg viewBox="0 0 32 32" className="h-4 w-4">
          <path d="M16 6v20M6 16h20" stroke="#00F2FE" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span>
      </div>
      <div>
        <div className="font-display text-base font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
          MedSafe <span className="text-cyan-400">//</span> AI
        </div>
        <div className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-emerald-400" />
          SYS_ONLINE
        </div>
      </div>
    </div>
  );
}

function UserBadge({ onPick }: { onPick?: () => void }) {
  const { user, logout, navigate } = useApp();
  if (!user) return null;
  const plan = user.plan || "trial";
  const daysLeft = user.days_left ?? 3;

  return (
    <div className="mt-auto border-t border-white/10 pt-3">
      {/* Tier pill */}
      <button
        onClick={() => { navigate("subscription"); onPick?.(); }}
        className="mb-2.5 w-full flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-mono border border-white/10 hover:border-white/20 transition-all text-neutral-300"
      >
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-cyan-300">
          <Sparkles className="h-3 w-3" />
          {plan === "trial" ? `Trial (${daysLeft}d)` : plan === "beginner" ? "Beginner" : "Pro Tier"}
        </span>
        <span className="text-[10px] text-neutral-500 font-bold">UPGRADE ›</span>
      </button>

      {/* User info capsule */}
      <div className="flex items-center justify-between gap-2 rounded-lg bg-[#0C0D12] p-2 border border-white/5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-mono font-bold text-white uppercase">{user.name}</div>
          <div className="truncate text-[10px] font-mono text-neutral-500">{user.role || "Clinician"}</div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
          className="rounded p-1 text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function NavList({ onPick }: { onPick?: () => void }) {
  const { page, navigate, patients, activePatient, setActivePatientId } = useApp();
  return (
    <div className="flex flex-col flex-1">
      {/* Active patient selector */}
      <div className="mb-4 rounded-xl bg-[#0B0C12] p-2.5 border border-white/10">
        <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-neutral-400">
          <span>[ Case File ]</span>
          <span className="text-cyan-400">{activePatient?.medicines.length ?? 0} Meds</span>
        </div>
        <select
          id="active-patient"
          value={activePatient?.id ?? ""}
          onChange={(e) => setActivePatientId(Number(e.target.value))}
          className="w-full rounded-lg border border-white/10 bg-[#12131A] px-2 py-1.5 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
        >
          {patients.length === 0 && <option value="">No patients loaded</option>}
          {patients.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#12131A] text-white">
              {p.name.toUpperCase()} {p.is_demo ? "(DEMO)" : ""}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ id, num, label, icon: Icon, tag }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => { navigate(id); onPick?.(); }}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-[36px] w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all duration-150 ${
                active
                  ? "bg-white/10 text-white font-bold border-l-2 border-cyan-400"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`text-[10px] font-bold ${active ? "text-cyan-400" : "text-neutral-600 group-hover:text-neutral-400"}`}>
                  {num}
                </span>
                <Icon className={`h-3.5 w-3.5 ${active ? "text-cyan-400" : "text-neutral-500 group-hover:text-neutral-300"}`} />
                <span>{label}</span>
              </div>
              {tag && (
                <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold font-mono tracking-widest ${active ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-white/5 text-neutral-500 border border-white/5"}`}>
                  {tag}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <UserBadge onPick={onPick} />
      <div className="mt-3 pt-2 border-t border-white/5 text-center text-[10px] font-mono text-white/40 tracking-wider">
        @all rights are reserved
      </div>
    </div>
  );
}


export default function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-white/10 bg-[#07080C] p-4 lg:flex">
        <div className="mb-5"><Brand /></div>
        <NavList />
      </aside>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#07080C]/90 backdrop-blur-md px-4 py-3 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-white hover:bg-white/10"><Menu className="h-5 w-5" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] overflow-y-auto bg-[#07080C] p-4 border-r border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-neutral-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <NavList onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
