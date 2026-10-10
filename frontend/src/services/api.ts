import { mockEngine } from "./mockEngine";

export let isUsingMockEngine = false;
const listeners = new Set<(isMock: boolean) => void>();

export function subscribeMockStatus(cb: (isMock: boolean) => void) {
  listeners.add(cb);
  cb(isUsingMockEngine);
  return () => { listeners.delete(cb); };
}

function setMockStatus(status: boolean) {
  if (isUsingMockEngine !== status) {
    isUsingMockEngine = status;
    listeners.forEach((cb) => cb(status));
  }
}

function getBaseUrl(): string {
  try {
    const custom = localStorage.getItem("medsafe_api_url");
    if (custom) return custom.replace(/\/+$/, "");
  } catch {}
  return "/api";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout for fast fallback

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      // Returned HTML (e.g. 404 page from static host)
      throw new Error("Invalid response format: expected JSON");
    }

    const body = await res.json();
    setMockStatus(false);
    return body as T;
  } catch (err) {
    clearTimeout(timeoutId);
    setMockStatus(true);
    throw err;
  }
}

async function callWithFallback<T>(
  apiPath: string,
  fallbackFn: () => Promise<T>,
  init?: RequestInit
): Promise<T> {
  try {
    return await request<T>(apiPath, init);
  } catch (err) {
    // Graceful offline simulation fallback
    return await fallbackFn();
  }
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: data === undefined ? undefined : JSON.stringify(data),
});

export const api = {
  health: () =>
    callWithFallback("/health", () => mockEngine.health()),

  patients: () =>
    callWithFallback("/patients", () => mockEngine.patients()),

  createPatient: (p: any) =>
    callWithFallback("/patients", () => mockEngine.createPatient(p), json("POST", p)),

  updatePatient: (id: number, p: any) =>
    callWithFallback(`/patients/${id}`, () => mockEngine.updatePatient(id, p), json("PUT", p)),

  deletePatient: (id: number) =>
    callWithFallback(`/patients/${id}`, () => mockEngine.deletePatient(id), json("DELETE")),

  addPatientMedicine: (id: number, medicine: string) =>
    callWithFallback(
      `/patients/${id}/medicines`,
      () => mockEngine.addPatientMedicine(id, medicine),
      json("POST", { medicine })
    ),

  removePatientMedicine: (id: number, medicineId: string) =>
    callWithFallback(
      `/patients/${id}/medicines/${medicineId}`,
      () => mockEngine.removePatientMedicine(id, medicineId),
      json("DELETE")
    ),

  schedule: (id: number) =>
    callWithFallback(`/patients/${id}/schedule`, () => mockEngine.schedule(id)),

  addSchedule: (id: number, s: any) =>
    callWithFallback(
      `/patients/${id}/schedule`,
      () => mockEngine.addSchedule(id, s),
      json("POST", s)
    ),

  editSchedule: (sid: number, s: any) =>
    callWithFallback(`/schedule/${sid}`, () => mockEngine.editSchedule(sid, s), json("PUT", s)),

  deleteSchedule: (sid: number) =>
    callWithFallback(`/schedule/${sid}`, () => mockEngine.deleteSchedule(sid), json("DELETE")),

  medicines: (q = "") =>
    callWithFallback(`/medicines?q=${encodeURIComponent(q)}`, () => mockEngine.medicines(q)),

  medicine: (name: string) =>
    callWithFallback(`/medicines/${encodeURIComponent(name)}`, () => mockEngine.medicine(name)),

  scan: (file: File, patientId?: number) => {
    const fd = new FormData();
    fd.append("file", file);
    if (patientId) fd.append("patient_id", String(patientId));
    return callWithFallback("/scan", () => mockEngine.scan(file, patientId), {
      method: "POST",
      body: fd,
    });
  },

  check: (medicines: string[], patientId?: number | null) =>
    callWithFallback(
      "/interactions/check",
      () => mockEngine.check(medicines, patientId),
      json("POST", { medicines, patient_id: patientId ?? null })
    ),

  explain: (a: string, b: string, patientId?: number | null) =>
    callWithFallback(
      "/interactions/explain",
      () => mockEngine.explain(a, b, patientId),
      json("POST", { a, b, patient_id: patientId ?? null })
    ),

  modelInfo: () =>
    callWithFallback("/model/info", () => mockEngine.modelInfo()),

  modelMetrics: () =>
    callWithFallback("/model/metrics", () => mockEngine.modelMetrics()),

  evidence: (drug = "", other = "") =>
    callWithFallback(
      `/evidence?drug=${encodeURIComponent(drug)}&other=${encodeURIComponent(other)}`,
      () => mockEngine.evidence(drug, other)
    ),

  chat: (message: string, patientId?: number | null) =>
    callWithFallback(
      "/chat",
      () => mockEngine.chat(message, patientId),
      json("POST", { message, patient_id: patientId ?? null })
    ),

  dashboard: (id: number) =>
    callWithFallback(`/dashboard/${id}`, () => mockEngine.dashboard(id)),

  login: (identifier: string, password: string) =>
    callWithFallback(
      "/auth/login",
      () => mockEngine.login(identifier, password),
      json("POST", { identifier, password })
    ),

  register: (data: { name: string; email: string; phone: string; password: string; role?: string }) =>
    callWithFallback(
      "/auth/register",
      () => mockEngine.register(data),
      json("POST", data)
    ),

  demoAuth: () =>
    callWithFallback("/auth/demo", () => mockEngine.demoAuth()),

  guestLogin: () =>
    callWithFallback("/auth/guest", () => mockEngine.guestLogin(), json("POST", {})),

  subscriptionPlans: () =>
    callWithFallback("/subscription/plans", () => mockEngine.subscriptionPlans()),

  subscribe: (userId: number, plan: string) =>
    callWithFallback(
      "/subscription/subscribe",
      () => mockEngine.subscribe(userId, plan),
      json("POST", { user_id: userId, plan })
    ),

  subscriptionStatus: (userId: number) =>
    callWithFallback(`/subscription/status/${userId}`, () => mockEngine.subscriptionStatus(userId)),

  elderStatus: (patientId: number, lang?: string, period?: string) => {
    const params = new URLSearchParams();
    if (lang) params.set("lang", lang);
    if (period) params.set("period", period);
    const qs = params.toString();
    return callWithFallback(
      qs ? `/elder-agent/status/${patientId}?${qs}` : `/elder-agent/status/${patientId}`,
      () => mockEngine.elderStatus(patientId, lang, period)
    );
  },

  saveElderConfig: (cfg: {
    patient_id: number;
    elder_phone: string;
    elder_salutation?: string;
    elder_lang?: string;
    reminder_channel?: string;
    elder_enabled?: boolean;
  }) =>
    callWithFallback("/elder-agent/config", () => mockEngine.saveElderConfig(cfg), json("POST", cfg)),

  triggerElderCall: (patientId: number, period?: string, lang?: string) =>
    callWithFallback(
      "/elder-agent/call",
      () => mockEngine.triggerElderCall(patientId, period, lang),
      json("POST", { patient_id: patientId, channel: "call", period, lang })
    ),

  triggerElderSMS: (patientId: number, period?: string, lang?: string) =>
    callWithFallback(
      "/elder-agent/sms",
      () => mockEngine.triggerElderSMS(patientId, period, lang),
      json("POST", { patient_id: patientId, channel: "sms", period, lang })
    ),

  elderLogs: (patientId?: number) =>
    callWithFallback(
      patientId ? `/elder-agent/logs?patient_id=${patientId}` : "/elder-agent/logs",
      () => mockEngine.elderLogs(patientId)
    ),

  confirmReminder: (logId: number) =>
    callWithFallback(
      `/elder-agent/confirm/${logId}`,
      () => mockEngine.confirmReminder(logId),
      json("POST", {})
    ),
};
