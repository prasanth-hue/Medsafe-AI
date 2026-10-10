export type Risk = "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";

export interface Patient {
  id: number; name: string; age: number | null; gender: string;
  allergies: string[]; conditions: string[]; notes: string; is_demo: boolean; medicines: string[];
  elder_phone?: string;
  elder_salutation?: string;
  elder_lang?: string;
  reminder_channel?: string;
  elder_enabled?: boolean;
}
export interface Evidence { source: string; title: string; evidence: string; link: string | null; kind: string }
export interface PairResult {
  a: string; b: string; a_name: string; b_name: string; risk: Risk; source: string;
  summary: string; mechanism: string; concern: string; note: string | null;
  model: { name: string; score: number; confidence: number; confidence_band: string; engine: string };
  mechanism_links: string[]; evidence: Evidence[]; advice: string; patient_factors: string[]; disclaimer: string;
}
export interface CheckResult {
  medicines: { id: string; name: string; input: string }[]; unresolved: string[]; pairs: PairResult[];
  counts: Record<Risk, number>; overall_risk: Risk | null; disclaimer: string; emergency: string; message?: string;
}
export interface ExplainResult extends PairResult {
  graph: { nodes: { id: string; label: string; type: string; importance: number }[];
           edges: { source: string; target: string; relation: string; relation_text: string; importance: number }[] };
  important_nodes: { label: string; type: string; importance: number }[];
  important_relationships: string[]; attribution_method: string;
}
export interface MedicineSummary { id: string; name: string; drug_class: string; general_use: string }
export interface MedicineInfo {
  id: string; name: string; brands: string[]; drug_class: string; general_use: string; general_administration: string;
  warnings: string[]; known_interactions: { with: string; with_name: string; severity: Risk; summary: string }[];
  mechanism_profile: Record<string, string[]>; prescription_note: string; evidence: Evidence[]; disclaimer: string;
}
export interface ScheduleItem {
  id: number; patient_id: number; medicine_id: string; medicine_name: string; dose: string; frequency: string;
  period: string; time: string; food: string; instruction: string; notes: string; timing_note: string | null;
}
export interface ChatMessage { role: "user" | "assistant"; text: string }
export type PageId = "dashboard" | "patients" | "scanner" | "medicines" | "schedule" | "checker" | "explain" | "model" | "evidence" | "assistant" | "subscription" | "elder-agent" | "settings";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  plan?: string;
  plan_name?: string;
  plan_price_inr?: number;
  days_left?: number;
  trial_ends_at?: string;
  plan_expires_at?: string;
  subscription_status?: string;
  created_at?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_inr: number;
  price_display: string;
  billing: string;
  badge?: string;
  popular?: boolean;
  description: string;
  features: string[];
  button_text: string;
}

export interface ReminderLog {
  id: number;
  patient_id: number;
  patient_name: string;
  phone: string;
  channel: "call" | "sms";
  period: string;
  medicines: string[];
  message_text: string;
  audio_script?: string;
  status: string;
  call_duration_sec: number;
  confirmed_at?: string | null;
  created_at: string;
}

export interface ElderStatusResponse {
  patient: Patient;
  elder_phone: string;
  elder_salutation: string;
  elder_lang: string;
  reminder_channel: string;
  elder_enabled: boolean;
  current_period: string;
  schedule_grouped: Record<string, ScheduleItem[]>;
  total_scheduled: number;
  preview: {
    patient_id: number;
    patient_name: string;
    salutation: string;
    phone: string;
    period: string;
    language: string;
    medicines: string[];
    medicines_summary: string;
    items_count: number;
    spoken_script: string;
    sms_body: string;
    voice_settings: { rate: number; pitch: number; lang: string };
  };
  recent_logs: ReminderLog[];
}
