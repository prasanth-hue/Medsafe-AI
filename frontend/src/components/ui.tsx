import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldAlert, X } from "lucide-react";
import { ButtonHTMLAttributes, ReactNode, useEffect, useRef } from "react";
import type { Risk } from "../types";

export const inputCls = "w-full rounded-xl border border-white/10 bg-[#090A0E] px-3.5 py-2.5 text-[14px] text-white placeholder:text-neutral-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all duration-200";

export function Button({ variant = "primary", loading, children, className = "", ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean }) {
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = btnRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.15;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.15;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };

  const handlePointerLeave = () => {
    const el = btnRef.current;
    if (!el) return;
    el.style.transform = "translate3d(0px, 0px, 0)";
  };

  const styles = {
    primary: "bg-white text-black hover:bg-neutral-200 font-bold uppercase tracking-wider text-xs shadow-md active:scale-[0.98]",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/15 hover:border-white/30 font-bold uppercase tracking-wider text-xs active:scale-[0.98]",
    ghost: "text-neutral-400 hover:text-white hover:bg-white/5 font-semibold text-xs uppercase tracking-wider active:scale-[0.98]",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 uppercase tracking-wider text-xs active:scale-[0.98]",
  }[variant];

  return (
    <button
      ref={btnRef}
      {...rest}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      disabled={rest.disabled || loading}
      className={`interactive-hover inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition-transform duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  const cardRef = useRef<HTMLElement | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = cardRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -2.8;
    const rotateY = ((x - centerX) / centerX) * 2.8;

    el.style.setProperty("--card-x", `${x}px`);
    el.style.setProperty("--card-y", `${y}px`);
    el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.004, 1.004, 1.004)`;
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
  };

  return (
    <section
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0E0F16]/90 backdrop-blur-xl p-6 shadow-2xl transition-all duration-300 ease-out hover:border-cyan-500/30 text-white ${className}`}
      style={{ willChange: "transform" }}
    >
      {/* Specular mouse-following light reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "radial-gradient(400px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(0, 242, 254, 0.08), transparent 65%)",
        }}
      />
      {(title || action) && (
        <div className="relative z-10 mb-4 flex items-center justify-between gap-3 border-b border-white/5 pb-3">
          {title && <h2 className="font-display text-base font-bold tracking-wider text-white uppercase">{title}</h2>}
          {action}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </section>
  );
}


export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
      <div>
        <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400">
          [ MedSafe AI // Clinical Intelligence ]
        </div>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[14px] text-neutral-400 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

const RISK_STYLE: Record<Risk, { bg: string; dot: string; border: string }> = {
  HIGH: { bg: "bg-rose-500/10 text-rose-400", dot: "bg-rose-500", border: "border-rose-500/30" },
  MODERATE: { bg: "bg-amber-500/10 text-amber-400", dot: "bg-amber-500", border: "border-amber-500/30" },
  LOW: { bg: "bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-500/30" },
  UNKNOWN: { bg: "bg-white/5 text-neutral-400", dot: "bg-neutral-500", border: "border-white/10" },
};

export function RiskBadge({ risk, size = "md" }: { risk: Risk; size?: "sm" | "md" | "lg" }) {
  const pad = size === "lg" ? "px-3.5 py-1 text-xs" : size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-0.5 text-[11px]";
  const st = RISK_STYLE[risk];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-mono font-bold uppercase tracking-wider border shadow-xs ${pad} ${st.bg} ${st.border}`}>
      <span className="relative flex h-2 w-2">
        {risk === "HIGH" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${st.dot}`} />
      </span>
      {risk} RISK
    </span>
  );
}

export function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/15 px-3 py-1 text-xs font-mono tracking-wider uppercase text-cyan-300">
      {children}
      {onRemove && <button onClick={onRemove} aria-label="Remove" className="rounded-full p-0.5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"><X className="h-3.5 w-3.5" /></button>}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-400">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function Spinner({ label = "Processing telemetry..." }: { label?: string }) {
  return <div role="status" className="flex items-center gap-2.5 py-8 font-mono text-xs uppercase tracking-wider text-neutral-400"><Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden />{label}</div>;
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 bg-[#0A0B10]/60 p-8 sm:p-12 text-center text-white">
      {icon && <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-cyan-400 border border-white/10">{icon}</div>}
      <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">{title}</h3>
      {text && <p className="mt-1.5 max-w-md text-xs text-neutral-400 leading-relaxed font-sans">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-[13px] text-rose-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
      <div className="flex-1 font-medium">{message}</div>
      {onRetry && <button onClick={onRetry} className="font-bold underline hover:text-white">Retry</button>}
    </div>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-[13px] font-semibold text-emerald-300">
      <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />{message}
    </div>
  );
}

export function InfoNote({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" }) {
  const warn = tone === "warn";
  const Icon = warn ? ShieldAlert : Info;
  return (
    <div className={`flex items-start gap-3 rounded-xl p-4 text-[13px] border ${warn ? "bg-amber-950/20 text-amber-200 border-amber-500/30" : "bg-cyan-950/20 text-cyan-200 border-cyan-500/30"}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${warn ? "text-amber-400" : "text-cyan-400"}`} aria-hidden />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

export function Pill({ children, className = "", color = "teal" }: { children: ReactNode; className?: string; color?: "teal" | "blue" | "emerald" | "amber" | "rose" | "slate" }) {
  const colors = {
    teal: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    slate: "bg-white/5 text-neutral-400 border-white/10",
  }[color] || "bg-cyan-500/10 text-cyan-300 border-cyan-500/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider border ${colors} ${className}`}>
      {children}
    </span>
  );
}

export function Disclaimer({ text }: { text?: string }) {
  return <p className="mt-8 border-t border-white/10 pt-4 text-xs font-mono text-neutral-500 leading-relaxed">
    {text ?? "MEDSAFE AI // CLINICAL DECISION SUPPORT PROTOTYPE. DOES NOT DIAGNOSE CONDITIONS OR PRESCRIBE MEDICATIONS."}
  </p>;
}

export function Modal({ open, onClose, title, size = "md", children }: { open: boolean; onClose: () => void; title: string; size?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  const maxW = size === "xl" ? "sm:max-w-5xl" : size === "lg" ? "sm:max-w-3xl" : size === "sm" ? "sm:max-w-md" : "sm:max-w-xl";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md p-0 sm:items-center sm:p-4 transition-all duration-200" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-[#0D0E14] p-6 shadow-2xl border border-white/15 text-white ${maxW}`}>
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-wider text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MedicineDatalist({ id, names }: { id: string; names: string[] }) {
  return <datalist id={id}>{names.map((n) => <option key={n} value={n} />)}</datalist>;
}
