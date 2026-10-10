import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { api, isUsingMockEngine, subscribeMockStatus } from "../services/api";
import type { CheckResult, PageId, Patient, User } from "../types";

const PAGES: PageId[] = ["dashboard", "patients", "scanner", "medicines", "schedule", "checker", "explain", "model", "evidence", "assistant", "subscription", "elder-agent", "settings"];
type Params = Record<string, any>;

interface Ctx {
  page: PageId; params: Params; navigate: (page: PageId, params?: Params) => void;
  patients: Patient[]; activePatient: Patient | null; setActivePatientId: (id: number) => void;
  refreshPatients: () => Promise<void>; backendError: string | null; loading: boolean;
  lastCheck: CheckResult | null; setLastCheck: (c: CheckResult | null) => void;
  user: User | null; setUser: (u: User | null) => void; logout: () => void;
  isMockMode: boolean;
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

function pageFromHash(): PageId {
  const h = window.location.hash.replace(/^#\/?/, "") as PageId;
  return PAGES.includes(h) ? h : "dashboard";
}

const DEFAULT_USER: User = {
  id: 1,
  name: "Dr. Sarah Mitchell",
  email: "doctor@medsafe.ai",
  phone: "+1 555-019-2834",
  role: "Chief Clinician",
  plan: "pro",
  plan_name: "Pro Clinician",
  plan_price_inr: 2499,
  days_left: 30,
  subscription_status: "active",
  created_at: new Date().toISOString(),
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>(pageFromHash());
  const [params, setParams] = useState<Params>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeId, setActiveId] = useState<number | null>(() => {
    const v = localStorage.getItem("medsafe.activePatient");
    return v ? Number(v) : 1;
  });
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("medsafe.user");
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });
  const [backendError, setBackendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<CheckResult | null>(null);
  const [isMockMode, setIsMockMode] = useState<boolean>(isUsingMockEngine);

  useEffect(() => {
    return subscribeMockStatus(setIsMockMode);
  }, []);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem("medsafe.user", JSON.stringify(u));
    } else {
      localStorage.removeItem("medsafe.user");
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((p: PageId, prm: Params = {}) => {
    setParams(prm);
    window.location.hash = `/${p}`;
    setPage(p);
    window.scrollTo({ top: 0 });
  }, []);

  const refreshPatients = useCallback(async () => {
    try {
      const list = (await api.patients()) as Patient[];
      setPatients(list);
      setBackendError(null);
      setActiveId((cur) => (cur && list.some((p) => p.id === cur) ? cur : list[0]?.id ?? null));
    } catch (e: any) {
      // In case both backend and mock fails
      setBackendError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshPatients(); }, [refreshPatients]);
  useEffect(() => { if (activeId) localStorage.setItem("medsafe.activePatient", String(activeId)); }, [activeId]);

  const value = useMemo<Ctx>(() => ({
    page, params, navigate, patients, activePatient: patients.find((p) => p.id === activeId) ?? null,
    setActivePatientId: setActiveId, refreshPatients, backendError, loading, lastCheck, setLastCheck,
    user, setUser, logout, isMockMode,
  }), [page, params, navigate, patients, activeId, refreshPatients, backendError, loading, lastCheck, user, setUser, logout, isMockMode]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
