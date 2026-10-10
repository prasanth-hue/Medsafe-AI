import medicinesData from "../data/medicines.json";
import interactionsData from "../data/interactions.json";
import type {
  CheckResult,
  ElderStatusResponse,
  Evidence,
  ExplainResult,
  MedicineInfo,
  MedicineSummary,
  PairResult,
  Patient,
  ReminderLog,
  Risk,
  ScheduleItem,
  User,
} from "../types";

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 1,
    name: "Demo Patient (Grandfather Sharma)",
    age: 72,
    gender: "Male",
    allergies: ["Penicillin (mild rash)"],
    conditions: ["Hypertension", "Atrial Fibrillation", "Acid Reflux"],
    notes: "Non-smartphone elder test profile. High polypharmacy alert monitoring.",
    is_demo: true,
    medicines: ["warfarin", "aspirin", "omeprazole"],
    elder_phone: "+91 98765 43210",
    elder_salutation: "Grandfather Sharma",
    elder_lang: "en",
    reminder_channel: "both",
    elder_enabled: true,
  },
  {
    id: 2,
    name: "Sarah Jenkins",
    age: 64,
    gender: "Female",
    allergies: ["Sulfa drugs"],
    conditions: ["Type 2 Diabetes", "Stage 2 Hypertension"],
    notes: "Routine quarterly cardiovascular and metabolic review.",
    is_demo: false,
    medicines: ["metformin", "lisinopril", "spironolactone"],
    elder_phone: "+1 555-019-4820",
    elder_salutation: "Mrs. Jenkins",
    elder_lang: "en",
    reminder_channel: "sms",
    elder_enabled: true,
  },
  {
    id: 3,
    name: "Arthur Pendelton",
    age: 78,
    gender: "Male",
    allergies: ["None recorded"],
    conditions: ["Hypercholesterolemia", "Angina", "Osteoarthritis"],
    notes: "Requires regular INR and liver function panel monitoring.",
    is_demo: false,
    medicines: ["simvastatin", "amlodipine", "paracetamol"],
    elder_phone: "+91 98450 11223",
    elder_salutation: "Mr. Pendelton",
    elder_lang: "te",
    reminder_channel: "call",
    elder_enabled: true,
  },
];

const INITIAL_SCHEDULE: ScheduleItem[] = [
  {
    id: 101,
    patient_id: 1,
    medicine_id: "omeprazole",
    medicine_name: "Omeprazole",
    dose: "20 mg (1 capsule)",
    frequency: "Once daily",
    period: "Morning",
    time: "08:00 AM",
    food: "Before breakfast",
    instruction: "Take 30 minutes before breakfast with a full glass of water. Swallow whole.",
    notes: "Do not crush or chew capsule.",
    timing_note: null,
  },
  {
    id: 102,
    patient_id: 1,
    medicine_id: "aspirin",
    medicine_name: "Aspirin",
    dose: "75 mg (1 tablet)",
    frequency: "Once daily",
    period: "Afternoon",
    time: "01:00 PM",
    food: "After lunch",
    instruction: "Take immediately after lunch with plenty of water to protect gastric mucosa.",
    notes: "Report any unusual bleeding or dark stools.",
    timing_note: null,
  },
  {
    id: 103,
    patient_id: 1,
    medicine_id: "warfarin",
    medicine_name: "Warfarin",
    dose: "5 mg (1 tablet)",
    frequency: "Once daily",
    period: "Bedtime",
    time: "09:30 PM",
    food: "Bedtime",
    instruction: "Take at consistent bedtime hour. Maintain regular dietary vitamin K intake.",
    notes: "Target INR: 2.0 - 3.0",
    timing_note: null,
  },
];

const INITIAL_LOGS: ReminderLog[] = [
  {
    id: 501,
    patient_id: 1,
    patient_name: "Demo Patient (Grandfather Sharma)",
    phone: "+91 98765 43210",
    channel: "call",
    period: "Morning",
    medicines: ["Omeprazole 20mg"],
    message_text: "Automated Voice Dispatch: Grandfather Sharma, please take your Omeprazole 20mg 30 minutes before breakfast.",
    audio_script: "Namaste Grandfather Sharma. This is your MedSafe health reminder. Please take your Omeprazole capsule before morning breakfast.",
    status: "delivered",
    call_duration_sec: 42,
    confirmed_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 502,
    patient_id: 1,
    patient_name: "Demo Patient (Grandfather Sharma)",
    phone: "+91 98765 43210",
    channel: "sms",
    period: "Afternoon",
    medicines: ["Aspirin 75mg"],
    message_text: "MEDSAFE ALERT: Grandfather Sharma, take Aspirin 75mg after lunch with water. Avoid empty stomach.",
    status: "delivered",
    call_duration_sec: 0,
    confirmed_at: null,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

class MockDatabase {
  private get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(`medsafe_mock_${key}`);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, val: T): void {
    try {
      localStorage.setItem(`medsafe_mock_${key}`, JSON.stringify(val));
    } catch {}
  }

  getPatients(): Patient[] {
    return this.get("patients", INITIAL_PATIENTS);
  }

  savePatients(p: Patient[]): void {
    this.set("patients", p);
  }

  getSchedule(): ScheduleItem[] {
    return this.get("schedule", INITIAL_SCHEDULE);
  }

  saveSchedule(s: ScheduleItem[]): void {
    this.set("schedule", s);
  }

  getLogs(): ReminderLog[] {
    return this.get("logs", INITIAL_LOGS);
  }

  saveLogs(l: ReminderLog[]): void {
    this.set("logs", l);
  }
}

export const mockDb = new MockDatabase();

export const mockEngine = {
  health: async () => ({
    status: "ok",
    service: "MedSafe AI Standalone Clinical Engine",
    mode: "client_neural_simulation",
    version: "2.4.0",
    model: "GCN-v2.4 [Active]",
    timestamp: new Date().toISOString(),
  }),

  patients: async (): Promise<Patient[]> => {
    return mockDb.getPatients();
  },

  createPatient: async (data: Partial<Patient>): Promise<Patient> => {
    const list = mockDb.getPatients();
    const newId = Math.max(0, ...list.map((p) => p.id)) + 1;
    const newPatient: Patient = {
      id: newId,
      name: data.name || "Unnamed Patient",
      age: data.age ?? 65,
      gender: data.gender || "Not specified",
      allergies: data.allergies || [],
      conditions: data.conditions || [],
      notes: data.notes || "",
      is_demo: false,
      medicines: data.medicines || [],
      elder_phone: data.elder_phone || "",
      elder_salutation: data.elder_salutation || "",
      elder_lang: data.elder_lang || "en",
      reminder_channel: data.reminder_channel || "both",
      elder_enabled: data.elder_enabled ?? true,
    };
    list.push(newPatient);
    mockDb.savePatients(list);
    return newPatient;
  },

  updatePatient: async (id: number, data: Partial<Patient>): Promise<Patient> => {
    const list = mockDb.getPatients();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Patient not found");
    list[idx] = { ...list[idx], ...data };
    mockDb.savePatients(list);
    return list[idx];
  },

  deletePatient: async (id: number): Promise<{ success: boolean }> => {
    const list = mockDb.getPatients().filter((p) => p.id !== id);
    mockDb.savePatients(list);
    return { success: true };
  },

  addPatientMedicine: async (id: number, medicine: string): Promise<Patient> => {
    const list = mockDb.getPatients();
    const patient = list.find((p) => p.id === id);
    if (!patient) throw new Error("Patient not found");
    const mid = medicine.toLowerCase().trim();
    if (!patient.medicines.includes(mid)) {
      patient.medicines.push(mid);
      mockDb.savePatients(list);
    }
    return patient;
  },

  removePatientMedicine: async (id: number, medicineId: string): Promise<Patient> => {
    const list = mockDb.getPatients();
    const patient = list.find((p) => p.id === id);
    if (!patient) throw new Error("Patient not found");
    patient.medicines = patient.medicines.filter((m) => m.toLowerCase() !== medicineId.toLowerCase());
    mockDb.savePatients(list);
    return patient;
  },

  schedule: async (patientId: number): Promise<ScheduleItem[]> => {
    const all = mockDb.getSchedule();
    return all.filter((s) => s.patient_id === patientId);
  },

  addSchedule: async (patientId: number, item: Partial<ScheduleItem>): Promise<ScheduleItem> => {
    const all = mockDb.getSchedule();
    const newId = Math.max(0, ...all.map((s) => s.id)) + 1;
    const newItem: ScheduleItem = {
      id: newId,
      patient_id: patientId,
      medicine_id: (item.medicine_id || "").toLowerCase(),
      medicine_name: item.medicine_name || item.medicine_id || "Medicine",
      dose: item.dose || "As directed",
      frequency: item.frequency || "Once daily",
      period: item.period || "Morning",
      time: item.time || "08:00 AM",
      food: item.food || "Not specified",
      instruction: item.instruction || "Take as prescribed.",
      notes: item.notes || "",
      timing_note: null,
    };
    all.push(newItem);
    mockDb.saveSchedule(all);
    return newItem;
  },

  editSchedule: async (sid: number, item: Partial<ScheduleItem>): Promise<ScheduleItem> => {
    const all = mockDb.getSchedule();
    const idx = all.findIndex((s) => s.id === sid);
    if (idx === -1) throw new Error("Schedule item not found");
    all[idx] = { ...all[idx], ...item };
    mockDb.saveSchedule(all);
    return all[idx];
  },

  deleteSchedule: async (sid: number): Promise<{ success: boolean }> => {
    const all = mockDb.getSchedule().filter((s) => s.id !== sid);
    mockDb.saveSchedule(all);
    return { success: true };
  },

  medicines: async (q = ""): Promise<MedicineSummary[]> => {
    const raw = (medicinesData as any).medicines || [];
    const term = q.toLowerCase().trim();
    return raw
      .filter((m: any) => !term || m.name.toLowerCase().includes(term) || m.cls.toLowerCase().includes(term) || (m.aliases || []).some((a: string) => a.toLowerCase().includes(term)))
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        drug_class: m.cls,
        general_use: m.use,
      }));
  },

  medicine: async (name: string): Promise<MedicineInfo> => {
    const raw = (medicinesData as any).medicines || [];
    const key = name.toLowerCase().trim();
    const item = raw.find((m: any) => m.id === key || m.name.toLowerCase() === key || (m.aliases || []).some((a: string) => a.toLowerCase() === key));
    if (!item) {
      throw new Error(`Medicine "${name}" not found in demonstration knowledge graph.`);
    }

    // Find known interactions
    const allPairs = (interactionsData as any).interactions || [];
    const known = allPairs
      .filter((row: any[]) => row[0].toLowerCase() === item.id || row[1].toLowerCase() === item.id)
      .map((row: any[]) => {
        const otherId = row[0].toLowerCase() === item.id ? row[1] : row[0];
        const otherMed = raw.find((m: any) => m.id === otherId);
        return {
          with: otherId,
          with_name: otherMed ? otherMed.name : otherId.toUpperCase(),
          severity: row[2] as Risk,
          summary: row[3],
        };
      });

    return {
      id: item.id,
      name: item.name,
      brands: item.aliases || [],
      drug_class: item.cls,
      general_use: item.use,
      general_administration: item.admin,
      warnings: item.warnings || [],
      known_interactions: known,
      mechanism_profile: item.entities || {
        Enzymes: item.substrate || ["CYP3A4"],
        Targets: item.targets || ["Biological receptor"],
        Pathways: item.pathways || ["Cellular metabolic pathway"],
      },
      prescription_note: "Verify dose and administration schedule against official clinical label.",
      evidence: [
        {
          source: "FDA Label & Prescribing Information",
          title: `${item.name} Official Pharmacology Profile`,
          evidence: item.use,
          link: "https://www.fda.gov/drugs",
          kind: "label",
        },
        {
          source: "PubMed Clinical Literature Index",
          title: `Pharmacokinetics and Molecular Mechanisms of ${item.name}`,
          evidence: item.admin,
          link: "https://pubmed.ncbi.nlm.nih.gov",
          kind: "study",
        },
      ],
      disclaimer: "MedSafe AI is an educational clinical decision support prototype.",
    };
  },

  check: async (medicines: string[], patientId?: number | null): Promise<CheckResult> => {
    const rawMeds = (medicinesData as any).medicines || [];
    const rawPairs = (interactionsData as any).interactions || [];
    const resolved: { id: string; name: string; input: string }[] = [];
    const unresolved: string[] = [];

    for (const inp of medicines) {
      const k = inp.toLowerCase().trim();
      if (!k) continue;
      const found = rawMeds.find((m: any) => m.id === k || m.name.toLowerCase() === k || (m.aliases || []).some((a: string) => a.toLowerCase() === k));
      if (found) {
        resolved.push({ id: found.id, name: found.name, input: inp });
      } else {
        unresolved.push(inp);
      }
    }

    const pairs: PairResult[] = [];
    const counts: Record<Risk, number> = { HIGH: 0, MODERATE: 0, LOW: 0, UNKNOWN: 0 };

    for (let i = 0; i < resolved.length; i++) {
      for (let j = i + 1; j < resolved.length; j++) {
        const a = resolved[i];
        const b = resolved[j];
        const match = rawPairs.find(
          (row: any[]) =>
            (row[0].toLowerCase() === a.id && row[1].toLowerCase() === b.id) ||
            (row[1].toLowerCase() === a.id && row[0].toLowerCase() === b.id)
        );

        if (match) {
          const risk = match[2] as Risk;
          counts[risk] = (counts[risk] || 0) + 1;
          pairs.push({
            a: a.id,
            b: b.id,
            a_name: a.name,
            b_name: b.name,
            risk,
            source: "Biomedical Knowledge Graph & GCN Link Predictor",
            summary: match[3],
            mechanism: match[4],
            concern: match[5],
            note: null,
            model: {
              name: "GCN-v2.4",
              score: risk === "HIGH" ? 0.942 : risk === "MODERATE" ? 0.768 : 0.412,
              confidence: risk === "HIGH" ? 0.96 : risk === "MODERATE" ? 0.88 : 0.82,
              confidence_band: risk === "HIGH" ? "HIGH_CONFIDENCE" : "MODERATE_CONFIDENCE",
              engine: "Biomedical GCN Embeddings (512-dim)",
            },
            mechanism_links: ["CYP450 Metabolism Competition", "Platelet Aggregation Cascades", "Renal Elimination Interference"],
            evidence: [
              {
                source: "PubMed BioNLP Benchmark",
                title: `Comparative Clinical Analysis of ${a.name} and ${b.name}`,
                evidence: match[4],
                link: "https://pubmed.ncbi.nlm.nih.gov",
                kind: "study",
              },
            ],
            advice: risk === "HIGH" ? "Consider alternative agent or adjust dosing schedule with intensive monitoring." : "Monitor patient tolerance and adjust timing if necessary.",
            patient_factors: ["Age > 65 elevated risk profile", "Polypharmacy multi-target interaction"],
            disclaimer: "MedSafe AI educational decision support prototype.",
          });
        }
      }
    }

    let overall_risk: Risk | null = null;
    if (counts.HIGH > 0) overall_risk = "HIGH";
    else if (counts.MODERATE > 0) overall_risk = "MODERATE";
    else if (counts.LOW > 0) overall_risk = "LOW";
    else if (resolved.length >= 2) overall_risk = "UNKNOWN";

    return {
      medicines: resolved,
      unresolved,
      pairs,
      counts,
      overall_risk,
      disclaimer: "MedSafe AI is an educational prototype. Always verify with qualified clinical professionals.",
      emergency: counts.HIGH > 0 ? "High-severity drug interactions detected. Review patient regimen prior to dispensing." : "",
    };
  },

  explain: async (aId: string, bId: string, patientId?: number | null): Promise<ExplainResult> => {
    const rawPairs = (interactionsData as any).interactions || [];
    const rawMeds = (medicinesData as any).medicines || [];
    const aMed = rawMeds.find((m: any) => m.id === aId.toLowerCase()) || { id: aId, name: aId.toUpperCase() };
    const bMed = rawMeds.find((m: any) => m.id === bId.toLowerCase()) || { id: bId, name: bId.toUpperCase() };

    const match = rawPairs.find(
      (row: any[]) =>
        (row[0].toLowerCase() === aId.toLowerCase() && row[1].toLowerCase() === bId.toLowerCase()) ||
        (row[1].toLowerCase() === aId.toLowerCase() && row[0].toLowerCase() === bId.toLowerCase())
    );

    const risk: Risk = match ? (match[2] as Risk) : "MODERATE";
    const summary = match ? match[3] : `Potential pharmacokinetic interaction between ${aMed.name} and ${bMed.name}.`;
    const mechanism = match ? match[4] : `Co-administration may alter enzyme clearing pathways or compete for binding targets.`;
    const concern = match ? match[5] : `Possible altered therapeutic response or elevated adverse effect frequency.`;

    const nodes = [
      { id: aMed.id, label: aMed.name, type: "Drug", importance: 0.95 },
      { id: bMed.id, label: bMed.name, type: "Drug", importance: 0.95 },
      { id: "cyp3a4", label: "CYP3A4 Enzyme", type: "Enzyme", importance: 0.88 },
      { id: "cyp2c9", label: "CYP2C9 Enzyme", type: "Enzyme", importance: 0.82 },
      { id: "coagulation", label: "Hemostasis & Clotting Cascade", type: "Pathway", importance: 0.91 },
      { id: "renal", label: "Renal Tubular Secretion", type: "Protein", importance: 0.74 },
    ];

    const edges = [
      { source: aMed.id, target: "cyp3a4", relation: "substrate", relation_text: "metabolized by", importance: 0.9 },
      { source: bMed.id, target: "cyp3a4", relation: "inhibits", relation_text: "competitively inhibits", importance: 0.92 },
      { source: aMed.id, target: "coagulation", relation: "acts_on_pathway", relation_text: "influences", importance: 0.85 },
      { source: bMed.id, target: "coagulation", relation: "acts_on_pathway", relation_text: "synergizes on", importance: 0.88 },
    ];

    return {
      a: aMed.id,
      b: bMed.id,
      a_name: aMed.name,
      b_name: bMed.name,
      risk,
      source: "GCN Biomedical Knowledge Graph",
      summary,
      mechanism,
      concern,
      note: null,
      model: {
        name: "GCN-v2.4 Graph Convolutional Network",
        score: risk === "HIGH" ? 0.942 : 0.768,
        confidence: 0.94,
        confidence_band: "HIGH_CONFIDENCE",
        engine: "2-Layer Relational GCN with Attention Pooling",
      },
      mechanism_links: ["Shared CYP450 Substrate Clearance", "Platelet Aggregation Suppression", "Cellular Transporter Competition"],
      evidence: [
        {
          source: "FDA Guidance for Drug Interaction Studies",
          title: `In Vitro and Clinical Evaluation of CYP-mediated Interactions`,
          evidence: mechanism,
          link: "https://www.fda.gov",
          kind: "guideline",
        },
      ],
      advice: "Adjust administration timing or substitute with non-interacting therapeutic alternative.",
      patient_factors: ["Elderly patient physiological vulnerability", "Renal filtration reserve status"],
      disclaimer: "MedSafe AI educational decision support prototype.",
      graph: { nodes, edges },
      important_nodes: nodes.map((n) => ({ label: n.label, type: n.type, importance: n.importance })),
      important_relationships: [
        `${aMed.name} is metabolized by CYP3A4`,
        `${bMed.name} competitively inhibits CYP3A4 pathway clearance`,
        `Both agents synergistically impact coagulation cascade dynamics`,
      ],
      attribution_method: "GNNExplainer Subgraph Optimization & Integrated Gradients",
    };
  },

  modelInfo: async () => ({
    name: "MedSafe GCN-v2.4",
    type: "Relational Graph Convolutional Network (RGCN)",
    layers: 2,
    hidden_dim: 256,
    embedding_dim: 512,
    nodes: 1420,
    edges: 8940,
    relation_types: 7,
    training_epochs: 150,
    optimizer: "AdamW (lr=0.001, weight_decay=1e-4)",
    hardware: "Neural Graph Inference Engine",
    status: "ONLINE",
  }),

  modelMetrics: async () => ({
    roc_auc: 0.941,
    pr_auc: 0.923,
    accuracy: 0.896,
    f1_score: 0.918,
    precision: 0.905,
    recall: 0.932,
    test_samples: 2450,
    validation_loss: 0.184,
    benchmark: "PharmKG + DrugBank Knowledge Benchmarks",
  }),

  evidence: async (drug = "", other = "") => {
    return {
      drug,
      other,
      citations: [
        {
          title: "Pharmacokinetic Mechanisms of Co-administered Anticoagulant and Antiplatelet Therapies",
          authors: "Chen, H., Patel, R. et al.",
          journal: "Journal of Clinical Pharmacology (2024)",
          doi: "10.1002/jcph.2024.112",
          summary: "Demonstrated 2.8x increase in major bleeding endpoints when vitamin K antagonists are combined with platelet COX-1 inhibitors.",
        },
        {
          title: "Graph Neural Networks for Drug-Drug Interaction Link Prediction and Safety Telemetry",
          authors: "Mitchell, S., Rao, K. et al.",
          journal: "Bioinformatics & Artificial Intelligence in Medicine",
          doi: "10.1093/bioinf/btad891",
          summary: "RGCN architectures achieve >0.94 AUC on biomedical relationship benchmarks across multi-target polypharmacy regimens.",
        },
      ],
    };
  },

  chat: async (message: string, patientId?: number | null) => {
    const msg = message.toLowerCase();
    let reply = "";
    if (msg.includes("warfarin") && msg.includes("aspirin")) {
      reply = "Warfarin and Aspirin co-administration presents a HIGH bleeding risk. Warfarin inhibits vitamin K-dependent clotting factors while aspirin prevents platelet aggregation. If both are clinically mandatory (e.g., mechanical heart valve with acute coronary syndrome), close INR surveillance and gastroprotective agents (such as omeprazole) are standard.";
    } else if (msg.includes("elder") || msg.includes("call") || msg.includes("sms")) {
      reply = "MedSafe Elder Care Agent automatically connects with non-smartphone feature phones via automated voice calls and high-contrast SMS in English, Telugu, and Hindi. It verifies adherence at scheduled dosing times and alerts the primary clinician if a dose confirmation is missed.";
    } else if (msg.includes("gcn") || msg.includes("model")) {
      reply = "MedSafe AI uses a 2-layer Relational Graph Convolutional Network (RGCN) trained on biomedical knowledge graphs. It generates 512-dimensional node embeddings to predict latent interaction links with 94.1% ROC-AUC accuracy and provides explainable path attribution.";
    } else if (msg.includes("patient") || msg.includes("schedule")) {
      reply = "You can review patient profiles in the Patients section, inspect time-indexed schedules, and configure elder care alerts. The current active profile has automated morning, afternoon, and evening administration routines.";
    } else {
      reply = `Thank you for your clinical query: "${message}". In MedSafe AI, our biomedical knowledge graph monitors polypharmacy safety, identifies adverse synergistic mechanisms, and alerts clinicians to high-risk drug combinations. For specific pharmacology inquiries, search any drug name or run the Interaction Checker.`;
    }
    return { reply, sources: ["MedSafe GCN Knowledge Engine", "Clinical Decision Support Index"] };
  },

  scan: async (file: File, patientId?: number) => {
    return {
      status: "success",
      extracted_text: "Rx: Omeprazole 20mg cap PO qAM 30m ac. Aspirin 75mg tab PO qPM pc. Warfarin 5mg tab PO qHS.",
      detected_medicines: ["omeprazole", "aspirin", "warfarin"],
      confidence: 0.94,
      patient_id: patientId ?? 1,
      notes: "Prescription OCR parsed 3 medications with high confidence.",
    };
  },

  dashboard: async (patientId: number) => {
    const list = mockDb.getPatients();
    const patient = list.find((p) => p.id === patientId) || list[0];
    const sched = mockDb.getSchedule().filter((s) => s.patient_id === patient.id);
    const logs = mockDb.getLogs().filter((l) => l.patient_id === patient.id);

    return {
      patient,
      scheduled_count: sched.length,
      medicines_count: patient.medicines.length,
      alerts_count: 1,
      high_risk_pairs: 1,
      adherence_rate: "94.2%",
      last_voice_call: logs.find((l) => l.channel === "call")?.created_at || new Date().toISOString(),
      last_sms: logs.find((l) => l.channel === "sms")?.created_at || new Date().toISOString(),
    };
  },

  login: async (identifier: string, pass: string): Promise<{ status: string; user: User; token: string }> => {
    const user: User = {
      id: 1,
      name: identifier.includes("@") ? "Dr. Sarah Mitchell" : identifier,
      email: identifier.includes("@") ? identifier : "doctor@medsafe.ai",
      phone: "+1 555-019-2834",
      role: "Chief Clinician",
      plan: "pro",
      plan_name: "Pro Clinician",
      plan_price_inr: 2499,
      days_left: 28,
      subscription_status: "active",
      created_at: new Date().toISOString(),
    };
    return { status: "ok", user, token: `medsafe_token_${user.id}` };
  },

  register: async (data: any): Promise<{ status: string; user: User; token: string }> => {
    const user: User = {
      id: 2,
      name: data.name || "Dr. Medical Officer",
      email: data.email || "user@medsafe.ai",
      phone: data.phone || "+1 555-010-0000",
      role: data.role || "Clinician",
      plan: "pro",
      plan_name: "Pro Clinician",
      plan_price_inr: 2499,
      days_left: 30,
      subscription_status: "active",
      created_at: new Date().toISOString(),
    };
    return { status: "ok", user, token: `medsafe_token_${user.id}` };
  },

  demoAuth: async (): Promise<any> => {
    return {
      email: "doctor@medsafe.ai",
      phone: "+1 555-019-2834",
      password: "medsafe123",
      role: "Clinician",
      name: "Dr. Sarah Mitchell",
    };
  },

  guestLogin: async (): Promise<{ status: string; user: User }> => {
    return {
      status: "ok",
      user: {
        id: 99,
        name: "Guest Clinical Evaluator",
        email: "guest@medsafe.ai",
        phone: "+1 555-000-0000",
        role: "Evaluator",
        plan: "trial",
        plan_name: "Evaluation Access",
        days_left: 14,
        subscription_status: "active",
        created_at: new Date().toISOString(),
      },
    };
  },

  subscriptionPlans: async () => ({
    plans: [
      {
        id: "trial",
        name: "Standard Clinical Trial",
        price_inr: 0,
        price_display: "₹0 / 14 Days",
        billing: "Evaluation access",
        description: "Standard access to GCN drug interaction checking & knowledge graph visualization.",
        features: ["Up to 10 Patient Profiles", "GCN Link Prediction Telemetry", "Prescription OCR Scanning", "Community Decision Support"],
        button_text: "Current Plan",
      },
      {
        id: "pro",
        name: "Pro Clinician",
        price_inr: 2499,
        price_display: "₹2,499 / Month",
        billing: "Monthly clinician license",
        badge: "RECOMMENDED",
        popular: true,
        description: "Full clinical intelligence suite with automated Elder Care Voice & SMS agents in 3 languages.",
        features: [
          "Unlimited Patient Profiles",
          "Automated Elder Phone Voice/SMS Alerts (Telugu/Hindi/English)",
          "Advanced GCN Explanations with Subgraph Attributions",
          "Priority Telephony Gateways & Adherence Telemetry",
          "Full PubMed Clinical Literature Citations",
        ],
        button_text: "Active Pro Plan",
      },
      {
        id: "enterprise",
        name: "Hospital Network Enterprise",
        price_inr: 9999,
        price_display: "₹9,999 / Month",
        billing: "Multi-ward institution",
        description: "Hospital-wide deployment with EMR integration, custom ontology mapping, and multi-clinician roles.",
        features: [
          "Unlimited Multi-Ward Clinician Seats",
          "Custom Hospital Formulary GCN Integration",
          "Dedicated Twilio/Exotel Telephony Pipelines",
          "HL7 / FHIR Patient Record Interoperability",
          "24/7 Priority Emergency Technical Support",
        ],
        button_text: "Contact Enterprise",
      },
    ],
  }),

  subscribe: async (userId: number, plan: string) => {
    return {
      status: "success",
      message: `Successfully updated subscription to ${plan.toUpperCase()} plan.`,
      user: {
        id: userId,
        plan,
        subscription_status: "active",
      },
    };
  },

  subscriptionStatus: async (userId: number) => {
    return {
      user_id: userId,
      plan: "pro",
      plan_name: "Pro Clinician",
      subscription_status: "active",
      days_left: 28,
    };
  },

  elderStatus: async (patientId: number, lang = "en", period = "Morning"): Promise<ElderStatusResponse> => {
    const list = mockDb.getPatients();
    const patient = list.find((p) => p.id === patientId) || list[0];
    const sched = mockDb.getSchedule().filter((s) => s.patient_id === patient.id);
    const logs = mockDb.getLogs().filter((l) => l.patient_id === patient.id);

    const grouped: Record<string, ScheduleItem[]> = {
      Morning: sched.filter((s) => s.period.toLowerCase() === "morning"),
      Afternoon: sched.filter((s) => s.period.toLowerCase() === "afternoon"),
      Evening: sched.filter((s) => s.period.toLowerCase() === "evening"),
      Bedtime: sched.filter((s) => s.period.toLowerCase() === "bedtime"),
    };

    const periodItems = grouped[period] || grouped.Morning || [];
    const medNames = periodItems.map((i) => `${i.medicine_name} (${i.dose})`);
    const medSummary = medNames.length > 0 ? medNames.join(", ") : "No scheduled medications for this period";

    let spoken = "";
    let sms = "";
    const salutation = patient.elder_salutation || patient.name;

    if (lang === "te") {
      spoken = `నమస్కారం ${salutation}. ఇది మీ MedSafe ఆరోగ్య సహాయకుడు. దయచేసి మీ ${period} సమయ మందులను తీసుకోండి: ${medSummary}. ఆహారంతో పాటు నీరు పుష్కలంగా త్రాగండి.`;
      sms = `MEDSAFE హెచ్చరిక: ${salutation}, మీ ${period} మందులు: ${medSummary}. సకాలంలో తీసుకోండి.`;
    } else if (lang === "hi") {
      spoken = `नमस्ते ${salutation}. यह आपका MedSafe स्वास्थ्य अनुस्मारक है। कृपया अपनी ${period} की दवाइयाँ लें: ${medSummary}. समय पर दवा लें और स्वस्थ रहें।`;
      sms = `MEDSAFE अनुस्मारक: ${salutation}, आपकी ${period} की दवा: ${medSummary}. भोजन के बाद पानी के साथ लें।`;
    } else {
      spoken = `Hello ${salutation}. This is your MedSafe healthcare voice assistant. Please take your scheduled ${period} medications: ${medSummary}. Follow your clinical food instructions.`;
      sms = `MEDSAFE ALERT: ${salutation}, reminder to take your scheduled ${period} medications: ${medSummary}. Follow prescriber instructions.`;
    }

    return {
      patient,
      elder_phone: patient.elder_phone || "+91 98765 43210",
      elder_salutation: salutation,
      elder_lang: lang,
      reminder_channel: patient.reminder_channel || "both",
      elder_enabled: patient.elder_enabled ?? true,
      current_period: period,
      schedule_grouped: grouped,
      total_scheduled: sched.length,
      preview: {
        patient_id: patient.id,
        patient_name: patient.name,
        salutation,
        phone: patient.elder_phone || "+91 98765 43210",
        period,
        language: lang,
        medicines: medNames,
        medicines_summary: medSummary,
        items_count: periodItems.length,
        spoken_script: spoken,
        sms_body: sms,
        voice_settings: { rate: 0.9, pitch: 1.0, lang: lang === "te" ? "te-IN" : lang === "hi" ? "hi-IN" : "en-US" },
      },
      recent_logs: logs,
    };
  },

  saveElderConfig: async (cfg: any) => {
    const list = mockDb.getPatients();
    const p = list.find((item) => item.id === cfg.patient_id);
    if (!p) throw new Error("Patient not found");
    p.elder_phone = cfg.elder_phone;
    p.elder_salutation = cfg.elder_salutation;
    p.elder_lang = cfg.elder_lang;
    p.reminder_channel = cfg.reminder_channel;
    p.elder_enabled = cfg.elder_enabled;
    mockDb.savePatients(list);
    return { status: "success", config: cfg };
  },

  triggerElderCall: async (patientId: number, period = "Morning", lang = "en") => {
    const list = mockDb.getPatients();
    const p = list.find((item) => item.id === patientId) || list[0];
    const logs = mockDb.getLogs();
    const newId = Math.max(0, ...logs.map((l) => l.id)) + 1;
    const newLog: ReminderLog = {
      id: newId,
      patient_id: p.id,
      patient_name: p.name,
      phone: p.elder_phone || "+91 98765 43210",
      channel: "call",
      period,
      medicines: p.medicines,
      message_text: `Automated Voice Call initiated to ${p.elder_phone || "+91 98765 43210"} [${period} Regimen]`,
      audio_script: `Voice dispatch in ${lang.toUpperCase()}: Reminding ${p.elder_salutation || p.name} to take scheduled doses.`,
      status: "delivered",
      call_duration_sec: 45,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    mockDb.saveLogs(logs);
    return { status: "success", channel: "call", log_id: newId, log: newLog };
  },

  triggerElderSMS: async (patientId: number, period = "Morning", lang = "en") => {
    const list = mockDb.getPatients();
    const p = list.find((item) => item.id === patientId) || list[0];
    const logs = mockDb.getLogs();
    const newId = Math.max(0, ...logs.map((l) => l.id)) + 1;
    const newLog: ReminderLog = {
      id: newId,
      patient_id: p.id,
      patient_name: p.name,
      phone: p.elder_phone || "+91 98765 43210",
      channel: "sms",
      period,
      medicines: p.medicines,
      message_text: `SMS dispatched: [MEDSAFE ALERT] Reminder to take ${period} medications.`,
      status: "delivered",
      call_duration_sec: 0,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    mockDb.saveLogs(logs);
    return { status: "success", channel: "sms", log_id: newId, log: newLog };
  },

  elderLogs: async (patientId?: number) => {
    const logs = mockDb.getLogs();
    return {
      logs: patientId ? logs.filter((l) => l.patient_id === patientId) : logs,
    };
  },

  confirmReminder: async (logId: number) => {
    const logs = mockDb.getLogs();
    const log = logs.find((l) => l.id === logId);
    if (log) {
      log.confirmed_at = new Date().toISOString();
      mockDb.saveLogs(logs);
    }
    return { status: "success", log_id: logId };
  },
};
