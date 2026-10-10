import { Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import { Button, Card, Chip, EmptyState, ErrorBanner, Field, InfoNote, MedicineDatalist, Modal, inputCls } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { useMedicines } from "../services/hooks";
import type { Patient } from "../types";

const empty = { name: "", age: "", gender: "Not specified", allergies: "", conditions: "", notes: "" };
const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function Patients() {
  const { patients, activePatient, setActivePatientId, refreshPatients, navigate } = useApp();
  const meds = useMedicines();
  const [editing, setEditing] = useState<Patient | "new" | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [medInput, setMedInput] = useState<Record<number, string>>({});
  const [medError, setMedError] = useState<string | null>(null);

  const nameOf = (id: string) => meds.find((m) => m.id === id)?.name ?? id;

  function open(p: Patient | "new") {
    setError(null);
    setEditing(p);
    setForm(p === "new" ? empty : { name: p.name, age: p.age ?? "", gender: p.gender || "Not specified", allergies: p.allergies.join(", "), conditions: p.conditions.join(", "), notes: p.notes });
  }

  async function save() {
    if (!form.name.trim()) { setError("Please enter the patient's name."); return; }
    const age = form.age === "" ? null : Number(form.age);
    if (age !== null && (Number.isNaN(age) || age < 0 || age > 130)) { setError("Age must be a number between 0 and 130."); return; }
    setBusy(true); setError(null);
    const payload = { name: form.name, age, gender: form.gender, allergies: split(form.allergies), conditions: split(form.conditions), notes: form.notes };
    try {
      const saved = editing === "new" ? await api.createPatient(payload) : await api.updatePatient((editing as Patient).id, payload);
      await refreshPatients();
      if (editing === "new") setActivePatientId(saved.id);
      setEditing(null);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function remove(p: Patient) {
    if (!window.confirm(`Delete ${p.name} and all their medicines and schedule entries? This cannot be undone.`)) return;
    try { await api.deletePatient(p.id); await refreshPatients(); } catch (e: any) { setMedError(e.message); }
  }

  async function addMed(p: Patient) {
    const v = (medInput[p.id] || "").trim();
    if (!v) return;
    setMedError(null);
    try { await api.addPatientMedicine(p.id, v); setMedInput({ ...medInput, [p.id]: "" }); await refreshPatients(); } catch (e: any) { setMedError(e.message); }
  }
  async function removeMed(p: Patient, id: string) {
    try { await api.removePatientMedicine(p.id, id); await refreshPatients(); } catch (e: any) { setMedError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#00F2FE]">
            <span>[ 02 // PATIENT REGISTRY ]</span>
            <span className="text-white/20">•</span>
            <span className="text-white/40">CLINICAL CASE DOSSIERS</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
            Patient Profiles & Cohort
          </h1>
          <p className="mt-2 text-sm text-white/60 max-w-2xl font-light">
            Selected patient physiological biomarkers, renal/hepatic conditions, allergies, and daily medication regimes are bound to all inference pipelines.
          </p>
        </div>
        <Button onClick={() => open("new")}>
          <Plus className="h-4 w-4 mr-2" /> New Patient File
        </Button>
      </div>

      <MedicineDatalist id="med-list" names={meds.map((m) => m.name)} />
      {medError && <div className="mb-4"><ErrorBanner message={medError} /></div>}

      {patients.length === 0 ? (
        <EmptyState
          title="No Patient Case Files"
          text="Initialize a patient dossier to log current pharmacological regimens and run personalized safety links."
          action={<Button onClick={() => open("new")}>Create Patient Dossier</Button>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {patients.map((p) => {
            const active = p.id === activePatient?.id;
            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border transition-all duration-300 p-6 ${
                  active
                    ? "border-[#00F2FE] bg-prey-card/90 shadow-[0_0_30px_rgba(0,242,254,0.15)] ring-1 ring-[#00F2FE]/50"
                    : "border-white/10 bg-prey-card/60 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-white/40">CASE #{String(p.id).padStart(4, "0")}</span>
                      {p.is_demo && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
                          DEMO COHORT
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{p.name}</h2>
                    <p className="font-mono text-xs text-white/50">
                      {p.age != null ? `${p.age} YRS` : "AGE UNRECORDED"} // {p.gender.toUpperCase() || "UNSPECIFIED"}
                    </p>
                  </div>

                  {active ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00F2FE]/40 bg-[#00F2FE]/10 px-3 py-1 font-mono text-xs font-semibold text-[#00F2FE]">
                      <UserCheck className="h-3.5 w-3.5" /> ACTIVE CASE
                    </span>
                  ) : (
                    <Button variant="secondary" onClick={() => setActivePatientId(p.id)} className="!py-1.5 !px-3 text-xs">
                      Activate File
                    </Button>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="font-mono uppercase text-white/40">Conditions & Pathologies</span>
                    <p className="mt-1 font-medium text-white">
                      {p.conditions.length ? p.conditions.join(", ") : "None documented"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <span className="font-mono uppercase text-white/40">Known Allergies</span>
                    <p className="mt-1 font-medium text-white">
                      {p.allergies.length ? p.allergies.join(", ") : "None documented"}
                    </p>
                  </div>
                  {p.notes && (
                    <div className="sm:col-span-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <span className="font-mono uppercase text-white/40">Clinical Notes</span>
                      <p className="mt-1 text-white/70 italic">{p.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase text-white/40 tracking-wider">
                      Current Regime ({p.medicines.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.medicines.length === 0 && <span className="text-xs text-white/40 italic">No drugs assigned.</span>}
                    {p.medicines.map((m) => (
                      <Chip key={m} onRemove={() => removeMed(p, m)}>
                        {nameOf(m)}
                      </Chip>
                    ))}
                  </div>

                  <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addMed(p); }}>
                    <input
                      list="med-list"
                      value={medInput[p.id] || ""}
                      onChange={(e) => setMedInput({ ...medInput, [p.id]: e.target.value })}
                      placeholder="Add medicine to regime..."
                      aria-label={`Add medicine for ${p.name}`}
                      className={inputCls}
                    />
                    <Button type="submit" variant="secondary" className="whitespace-nowrap">
                      Add Drug
                    </Button>
                  </form>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4">
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => open(p)} className="!py-1.5 !px-3 text-xs">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => { setActivePatientId(p.id); navigate("checker", { medicines: p.medicines.map(nameOf) }); }}
                      className="!py-1.5 !px-3 text-xs"
                    >
                      Audit Interactions
                    </Button>
                  </div>
                  <Button variant="danger" onClick={() => remove(p)} className="!py-1.5 !px-3 text-xs">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New Patient Dossier" : "Update Patient Dossier"}>
        <div className="space-y-4">
          {error && <ErrorBanner message={error} />}
          <Field label="Patient Legal Name">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus placeholder="e.g. Ramesh Chandra" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chronological Age">
              <input className={inputCls} inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="e.g. 72" />
            </Field>
            <Field label="Biological Gender">
              <select className={inputCls} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                {["Not specified", "Female", "Male", "Other"].map((g) => <option key={g} value={g} className="bg-prey-card text-white">{g}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Documented Allergies" hint="Comma-separated (e.g. Penicillin, NSAIDs)">
            <input className={inputCls} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
          </Field>
          <Field label="Chronic Clinical Conditions" hint="Comma-separated (e.g. Hypertension, Type 2 Diabetes, CKD Stage 3)">
            <input className={inputCls} value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} />
          </Field>
          <Field label="Physician Observations & Notes">
            <textarea className={inputCls} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Hepatic status, GI intolerance notes..." />
          </Field>
          <InfoNote>Biometric data is used strictly as decision-support telemetry and never replaces direct clinical oversight.</InfoNote>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={busy}>Save Dossier</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
