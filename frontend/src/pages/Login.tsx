import { ArrowRight, CheckCircle2, Lock, Mail, Phone, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { useState } from "react";
import { Button, Card, Disclaimer, ErrorBanner, inputCls } from "../components/ui";
import { api } from "../services/api";
import type { User } from "../types";

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState(""); // Email or Phone number
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(identifier.trim(), password);
      onLogin(res.user);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please check and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 7) {
      setError("Please enter a valid phone number (at least 7 digits).");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role: "Clinician",
      });
      onLogin(res.user);
    } catch (err: any) {
      setError(err.message || "Registration failed. An account may already exist with this email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setLoading(true);
    setError(null);
    try {
      const creds = await api.demoAuth();
      const res = await api.login(creds.email, creds.password);
      onLogin(res.user);
    } catch (err: any) {
      // Fallback in case of network issue
      onLogin({
        id: 1,
        name: "Dr. Sarah Mitchell",
        email: "doctor@medsafe.ai",
        phone: "+1 555-019-2834",
        role: "Clinician",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.guestLogin();
      onLogin(res.user);
    } catch {
      onLogin({
        id: 9999,
        name: "Guest Clinician",
        email: "guest@medsafe.ai",
        phone: "+1 555-000-0000",
        role: "Guest",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Left Clinical Brand Showcase (Hidden on Mobile) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-12 text-white lg:flex">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/30 ring-1 ring-white/20" aria-hidden>
            <svg viewBox="0 0 32 32" className="h-6 w-6">
              <path d="M16 6v20M6 16h20" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              MedSafe AI
              <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-xs font-bold text-teal-300 ring-1 ring-teal-400/30">PRO</span>
            </div>
            <div className="text-xs text-slate-400">Explainable Clinical Medication Safety</div>
          </div>
        </div>

        {/* Center Clinical Highlights */}
        <div className="relative z-10 space-y-8 max-w-lg">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-teal-300 backdrop-blur-md ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5" /> Next-Generation Pharmacovigilance
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight text-white">
              Prevent Adverse Drug Events with Explainable AI.
            </h2>
            <p className="mt-3 text-slate-300 leading-relaxed text-sm">
              Our 2-layer Graph Convolutional Network (GCN) links drugs to biological target proteins, enzymes, and metabolic pathways to predict polypharmacy risks with complete transparency.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-4 backdrop-blur-xs border border-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-sm font-bold text-white">Biological Mechanism Tracing</div>
                <div className="text-xs text-slate-400 mt-0.5">Inspect exact CYP450 enzyme competition, protein bindings, and metabolic pathways.</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-4 backdrop-blur-xs border border-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-sm font-bold text-white">Elder Voice Call & SMS Agent</div>
                <div className="text-xs text-slate-400 mt-0.5">Automated multilingual calls in Telugu, Hindi, and English for senior patients on basic feature phones.</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-4 backdrop-blur-xs border border-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-sm font-bold text-white">100% Local Inference & Privacy</div>
                <div className="text-xs text-slate-400 mt-0.5">Patient profiles and prescription records remain strictly private on local storage.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metrics Pill */}
        <div className="relative z-10 flex items-center gap-6 border-t border-white/10 pt-6 text-xs text-slate-400">
          <div><strong className="text-white font-bold">3,200+</strong> Drug Combinations</div>
          <div className="h-3 w-px bg-white/20" />
          <div><strong className="text-white font-bold">3 Languages</strong> Audio Synthesizer</div>
          <div className="h-3 w-px bg-white/20" />
          <div><strong className="text-white font-bold">100%</strong> Explainable</div>
        </div>
      </div>

      {/* Right Side: Authentication Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo Only */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md">
              <svg viewBox="0 0 32 32" className="h-5 w-5">
                <path d="M16 6v20M6 16h20" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="font-display text-xl font-bold text-slate-900">MedSafe AI</div>
              <div className="text-xs text-slate-500">Explainable Medication Safety</div>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {tab === "signin" ? "Welcome back" : "Create clinician account"}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {tab === "signin"
                ? "Enter your credentials or use the instant demo button below."
                : "Sign up today to activate your 3-day full access clinical trial."}
            </p>
          </div>

          {/* 3-Day Free Trial Callout */}
          <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50/80 p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-teal-900">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-600" />
                ✨ Instant 3-Day Free Trial Included
              </span>
              <span className="rounded-full bg-teal-200/80 px-2 py-0.5 text-[10px] text-teal-900">₹0 No card needed</span>
            </div>
            <p className="mt-1 text-[11px] text-teal-800 leading-relaxed">
              Full access to neural GCN predictions, prescription OCR, and voice call simulators.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="mb-6 flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setTab("signin"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                tab === "signin"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab("signup"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                tab === "signup"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && <div className="mb-5"><ErrorBanner message={error} /></div>}

          {tab === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="login-identifier">
                  Email Address or Mobile Number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="doctor@medsafe.ai or +1 555-019-2834"
                    className={`${inputCls} !pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="login-password">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputCls} !pl-10`}
                  />
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full !py-2.5 mt-2">
                Sign In to MedSafe AI <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="reg-name">
                  Full Name & Title
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Alex Mercer, MD"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="reg-email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@hospital.org"
                    className={`${inputCls} !pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="reg-phone">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={`${inputCls} !pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="reg-password">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className={`${inputCls} !pl-10`}
                  />
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full !py-2.5 mt-2">
                Activate 3-Day Free Trial <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          )}

          {/* Quick Demo & Guest Actions */}
          <div className="mt-6 border-t border-slate-200/80 pt-5 space-y-3">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-2.5 text-xs font-bold text-teal-900 hover:bg-teal-100/70 hover:shadow-xs transition-all duration-150"
            >
              <UserCheck className="h-4 w-4 text-teal-600" />
              ⚡ Instant Demo Login (Dr. Sarah Mitchell)
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="flex w-full items-center justify-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              Explore as Guest (No Password Required)
            </button>
          </div>

          <div className="mt-8 text-center text-xs font-mono text-slate-400 leading-relaxed border-t border-slate-100/10 pt-4 space-y-1">
            <div>Clinical Decision Support System. Local GCN neural inference.</div>
            <div className="text-white/60 tracking-wider">@all rights are reserved</div>
          </div>
        </div>
      </div>
    </div>
  );

}
