import { Clock, Pencil, Plus, Trash2, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, EmptyState, ErrorBanner, Field, InfoNote, MedicineDatalist, Modal, Spinner, inputCls } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { useMedicines } from "../services/hooks";
import type { ScheduleItem } from "../types";

const PERIODS = ["Morning", "Afternoon", "Evening", "Bedtime"];
const FOOD = ["Not specified", "Before breakfast", "After breakfast", "Before lunch", "After lunch", "Before dinner", "After dinner", "With food", "Empty stomach", "Bedtime", "Other"];
const blank = { medicine: "", dose: "", frequency: "", period: "Morning", time: "", food: "Not specified", instruction: "", notes: "" };

export default function Schedule() {
  const { activePatient, params } = useApp();
  const meds = useMedicines();
  const [items, setItems] = useState<ScheduleItem[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(blank);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!activePatient) return;
    setError(null);
    try { const r = await api.schedule(activePatient.id); setItems(r.items); setNote(r.prescription_note); } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { setItems(null); load(); }, [activePatient?.id]);
  useEffect(() => { if (params.medicine && activePatient) openNew(params.medicine); }, [params.medicine]);

  function openNew(medicine = "") { setEditId(null); setForm({ ...blank, medicine }); setFormError(null); setOpen(true); }
  function openEdit(s: ScheduleItem) {
    setEditId(s.id); setFormError(null);
    setForm({ medicine: s.medicine_name, dose: s.dose, frequency: s.frequency, period: s.period, time: s.time, food: s.food, instruction: s.instruction, notes: s.notes });
    setOpen(true);
  }

  async function save() {
    if (!activePatient) return;
    if (!form.medicine.trim()) { setFormError("Please choose a medicine."); return; }
    setBusy(true); setFormError(null);
    try {
      if (editId) await api.editSchedule(editId, form); else await api.addSchedule(activePatient.id, form);
      setOpen(false); await load();
    } catch (e: any) { setFormError(e.message); } finally { setBusy(false); }
  }

  async function remove(s: ScheduleItem) {
    if (!window.confirm(`Remove ${s.medicine_name} from the schedule?`)) return;
    try { await api.deleteSchedule(s.id); await load(); } catch (e: any) { setError(e.message); }
  }

  if (!activePatient) return <EmptyState title="No Active Case" text="Select a patient from Patient Profiles to view and configure their medication timeline." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#00F2FE]">
            <span>[ 07 // MEDICATION SCHEDULE ]</span>
            <span className="text-white/20">•</span>
            <span className="text-white/40">DOSING TIMELINE PROTOCOL</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
            Medication Schedule: {activePatient.name}
          </h1>
          <p className="mt-2 text-sm text-white/60 max-w-2xl font-light">
            Explicit administration instructions, exact prescribed doses, and meal offsets synchronised with the Outbound Elder Care Voice Agent.
          </p>
        </div>
        <Button onClick={() => openNew()}>
          <Plus className="h-4 w-4 mr-2" /> Add Schedule Dose
        </Button>
      </div>

      <MedicineDatalist id="sched-meds" names={meds.map((m) => m.name)} />
      <div className="mb-4">
        <InfoNote>
          {note || "All doses and intervals correspond strictly to explicit prescription instructions."} MedSafe AI strictly adheres to documented clinician directives.
        </InfoNote>
      </div>

      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={load} /></div>}

      {!items ? (
        <Spinner label="Loading chronological dosing protocol..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="Timeline Unpopulated"
          text="No medication intervals configured yet for this patient profile. Add morning, afternoon, evening, or bedtime doses."
          action={<Button onClick={() => openNew()}>Configure First Dose</Button>}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PERIODS.map((p, idx) => {
            const list = items.filter((i) => i.period === p);
            return (
              <section
                key={p}
                aria-label={p}
                className="flex flex-col rounded-2xl border border-white/10 bg-prey-card/70 p-4 backdrop-blur-md"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#00F2FE]">[{String(idx + 1).padStart(2, "0")}]</span>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white">{p}</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60">
                    {list.length} DOSE{list.length === 1 ? "" : "S"}
                  </span>
                </div>

                <div className="mt-4 flex-1 space-y-3">
                  {list.length === 0 && (
                    <p className="py-8 text-center font-mono text-xs text-white/30 italic">
                      [ NO DOSES SCHEDULED ]
                    </p>
                  )}
                  {list.map((s) => (
                    <article
                      key={s.id}
                      className="group rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      <div className="font-bold text-white text-base tracking-tight">{s.medicine_name}</div>
                      <div className="mt-2 space-y-1 text-xs text-white/70">
                        {s.dose && <div className="font-mono text-white/90">Dose: {s.dose}</div>}
                        {s.frequency && <div className="text-white/60">Freq: {s.frequency}</div>}
                        {s.time && (
                          <div className="flex items-center gap-1 font-mono text-[#00F2FE]">
                            <Clock className="h-3 w-3" aria-hidden />
                            <span>{s.time}</span>
                          </div>
                        )}
                        {s.food !== "Not specified" && (
                          <div className="flex items-center gap-1 text-amber-300">
                            <Utensils className="h-3 w-3" aria-hidden />
                            <span>{s.food}</span>
                          </div>
                        )}
                        {s.instruction && (
                          <div className="mt-2 rounded-lg border border-white/5 bg-black/40 p-2 font-mono text-[11px] text-white/60">
                            {s.instruction}
                          </div>
                        )}
                        {s.notes && <div className="text-white/40 italic">{s.notes}</div>}
                      </div>

                      {s.timing_note && (
                        <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[11px] text-amber-300">
                          {s.timing_note}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-end gap-1 border-t border-white/5 pt-2">
                        <Button
                          variant="ghost"
                          className="!min-h-[30px] !px-2.5 text-xs text-white/60 hover:text-white"
                          onClick={() => openEdit(s)}
                          aria-label={`Edit ${s.medicine_name}`}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="!min-h-[30px] !px-2.5 text-xs text-[#FF3366] hover:bg-[#FF3366]/10"
                          onClick={() => remove(s)}
                          aria-label={`Delete ${s.medicine_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Modify Prescribed Dose" : "Add Scheduled Medication"}>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
          {formError && <ErrorBanner message={formError} />}
          <Field label="Medicine Name">
            <input list="sched-meds" className={inputCls} value={form.medicine} onChange={(e) => setForm({ ...form, medicine: e.target.value })} autoFocus placeholder="e.g. Metformin" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Exact Dose (as written)">
              <input className={inputCls} value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="e.g. 500 mg" />
            </Field>
            <Field label="Frequency">
              <input className={inputCls} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="e.g. Once daily" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time Period Block">
              <select className={inputCls} value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                {PERIODS.map((p) => <option key={p} value={p} className="bg-prey-card text-white">{p}</option>)}
              </select>
            </Field>
            <Field label="Clock Time (Optional)">
              <input type="time" className={inputCls} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </Field>
          </div>
          <Field label="Meal / Food Instruction">
            <select className={inputCls} value={form.food} onChange={(e) => setForm({ ...form, food: e.target.value })}>
              {FOOD.map((f) => <option key={f} value={f} className="bg-prey-card text-white">{f}</option>)}
            </select>
          </Field>
          <Field label="Prescription Label Text">
            <input className={inputCls} value={form.instruction} onChange={(e) => setForm({ ...form, instruction: e.target.value })} placeholder="Take with full glass of water after breakfast" />
          </Field>
          <Field label="Caregiver Notes">
            <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Keep refrigerated" />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={busy}>Save Schedule Item</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
