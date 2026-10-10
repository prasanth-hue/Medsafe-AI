const BACKEND_DOWN = "MedSafe AI backend is unavailable. Please start the API server.";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new Error(BACKEND_DOWN);
  }
  let body: any = null;
  try { body = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) {
    if (res.status === 502 || res.status === 503 || res.status === 504) throw new Error(BACKEND_DOWN);
    throw new Error(body?.error || body?.detail || "Something went wrong. Please try again.");
  }
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method, headers: { "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data),
});

export const api = {
  health: () => request<any>("/health"),
  patients: () => request<any[]>("/patients"),
  createPatient: (p: any) => request<any>("/patients", json("POST", p)),
  updatePatient: (id: number, p: any) => request<any>(`/patients/${id}`, json("PUT", p)),
  deletePatient: (id: number) => request<any>(`/patients/${id}`, json("DELETE")),
  addPatientMedicine: (id: number, medicine: string) => request<any>(`/patients/${id}/medicines`, json("POST", { medicine })),
  removePatientMedicine: (id: number, medicineId: string) => request<any>(`/patients/${id}/medicines/${medicineId}`, json("DELETE")),
  schedule: (id: number) => request<any>(`/patients/${id}/schedule`),
  addSchedule: (id: number, s: any) => request<any>(`/patients/${id}/schedule`, json("POST", s)),
  editSchedule: (sid: number, s: any) => request<any>(`/schedule/${sid}`, json("PUT", s)),
  deleteSchedule: (sid: number) => request<any>(`/schedule/${sid}`, json("DELETE")),
  medicines: (q = "") => request<any[]>(`/medicines?q=${encodeURIComponent(q)}`),
  medicine: (name: string) => request<any>(`/medicines/${encodeURIComponent(name)}`),
  scan: (file: File, patientId?: number) => {
    const fd = new FormData();
    fd.append("file", file);
    if (patientId) fd.append("patient_id", String(patientId));
    return request<any>("/scan", { method: "POST", body: fd });
  },
  check: (medicines: string[], patientId?: number | null) => request<any>("/interactions/check", json("POST", { medicines, patient_id: patientId ?? null })),
  explain: (a: string, b: string, patientId?: number | null) => request<any>("/interactions/explain", json("POST", { a, b, patient_id: patientId ?? null })),
  modelInfo: () => request<any>("/model/info"),
  modelMetrics: () => request<any>("/model/metrics"),
  evidence: (drug = "", other = "") => request<any>(`/evidence?drug=${encodeURIComponent(drug)}&other=${encodeURIComponent(other)}`),
  chat: (message: string, patientId?: number | null) => request<any>("/chat", json("POST", { message, patient_id: patientId ?? null })),
  dashboard: (id: number) => request<any>(`/dashboard/${id}`),
  login: (identifier: string, password: string) => request<any>("/auth/login", json("POST", { identifier, password })),
  register: (data: { name: string; email: string; phone: string; password: string; role?: string }) => request<any>("/auth/register", json("POST", data)),
  demoAuth: () => request<any>("/auth/demo"),
  guestLogin: () => request<any>("/auth/guest", json("POST", {})),
  subscriptionPlans: () => request<{ plans: any[] }>("/subscription/plans"),
  subscribe: (userId: number, plan: string) => request<{ status: string; message: string; user: any }>("/subscription/subscribe", json("POST", { user_id: userId, plan })),
  subscriptionStatus: (userId: number) => request<any>(`/subscription/status/${userId}`),
  elderStatus: (patientId: number, lang?: string, period?: string) => {
    const params = new URLSearchParams();
    if (lang) params.set("lang", lang);
    if (period) params.set("period", period);
    const qs = params.toString();
    return request<any>(qs ? `/elder-agent/status/${patientId}?${qs}` : `/elder-agent/status/${patientId}`);
  },
  saveElderConfig: (cfg: {
    patient_id: number;
    elder_phone: string;
    elder_salutation?: string;
    elder_lang?: string;
    reminder_channel?: string;
    elder_enabled?: boolean;
  }) => request<any>("/elder-agent/config", json("POST", cfg)),
  triggerElderCall: (patientId: number, period?: string, lang?: string) =>
    request<any>("/elder-agent/call", json("POST", { patient_id: patientId, channel: "call", period, lang })),
  triggerElderSMS: (patientId: number, period?: string, lang?: string) =>
    request<any>("/elder-agent/sms", json("POST", { patient_id: patientId, channel: "sms", period, lang })),
  elderLogs: (patientId?: number) =>
    request<{ logs: any[] }>(patientId ? `/elder-agent/logs?patient_id=${patientId}` : "/elder-agent/logs"),
  confirmReminder: (logId: number) =>
    request<any>(`/elder-agent/confirm/${logId}`, json("POST", {})),
};
