import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, Disclaimer, EmptyState, ErrorBanner, InfoNote, PageHeader, RiskBadge, Spinner, inputCls } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import type { MedicineInfo as Info, MedicineSummary } from "../types";

export default function MedicineInfo() {
  const { params, navigate } = useApp();
  const [q, setQ] = useState("");
  const [list, setList] = useState<MedicineSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(params.medicine ?? null);
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { api.medicines(q).then(setList).catch((e) => setError(e.message)); }, 150);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!selected) { setInfo(null); return; }
    setLoading(true); setError(null);
    api.medicine(selected).then(setInfo).catch((e) => { setError(e.message); setInfo(null); }).finally(() => setLoading(false));
  }, [selected]);

  const section = (t: string) => <h3 className="mb-1 font-sans text-sm font-semibold text-ink-soft">{t}</h3>;

  return (
    <div>
      <PageHeader title="Medicine Information" subtitle="General, educational information. It is kept separate from your own prescription instructions." />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-ink-mute" aria-hidden />
            <input className={`${inputCls} pl-9`} placeholder="Search name, brand or class" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search medicines" />
          </div>
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto rounded-xl border border-line bg-white p-1.5">
            {list.map((m) => (
              <li key={m.id}>
                <button onClick={() => setSelected(m.id)} className={`w-full rounded-lg px-3 py-2.5 text-left ${selected === m.id ? "bg-tide-light" : "hover:bg-mist"}`}>
                  <div className="font-semibold">{m.name}</div><div className="text-xs text-ink-mute">{m.drug_class}</div>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="p-4 text-sm text-ink-mute">No supported medicine matches "{q}". Try the generic name.</li>}
          </ul>
        </div>

        <div>
          {error && <ErrorBanner message={error} />}
          {loading && <Spinner />}
          {!info && !loading && !error && <EmptyState title="Choose a medicine" text="Select a medicine from the list to see what it is generally used for, common warnings and known interaction examples." />}
          {info && !loading && (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="text-2xl font-semibold">{info.name}</h2>
                  <p className="text-sm text-ink-mute">{info.drug_class}</p></div>
                {info.brands.length > 0 && <p className="text-sm text-ink-mute">Brand examples: {info.brands.join(", ")}</p>}
              </div>

              <div className="mt-5 rounded-lg border border-line p-4">
                <div className="mb-2 text-sm font-bold text-tide-dark">General information</div>
                <div className="space-y-3">
                  <div>{section("General use")}<p>{info.general_use}</p></div>
                  <div>{section("Common administration guidance")}<p>{info.general_administration}</p></div>
                  <div>{section("Common warnings")}<ul className="list-disc pl-5">{info.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border-2 border-tide/40 bg-tide-light/50 p-4">
                <div className="mb-1 text-sm font-bold text-tide-dark">Your prescription instruction</div>
                <p>{info.prescription_note}</p>
                <button className="mt-2 text-sm font-semibold text-tide-dark underline" onClick={() => navigate("schedule", { medicine: info.name })}>Record your prescription in the schedule</button>
              </div>

              <div className="mt-5">{section("How it works in the knowledge graph")}
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {Object.entries(info.mechanism_profile).filter(([, v]) => v.length).map(([k, v]) => (
                    <div key={k}><dt className="inline font-semibold capitalize">{k.replace(/_/g, " ")}: </dt><dd className="inline">{v.join(", ")}</dd></div>
                  ))}
                </dl>
              </div>

              <div className="mt-5">{section("Known interaction examples")}
                {info.known_interactions.length === 0 ? <p className="text-sm text-ink-mute">None recorded in the demonstration database.</p> : (
                  <ul className="divide-y divide-line rounded-lg border border-line">
                    {info.known_interactions.map((i) => (
                      <li key={i.with} className="flex flex-wrap items-center justify-between gap-2 p-3">
                        <div><div className="font-semibold">{info.name.split("(")[0].trim()} + {i.with_name}</div><div className="text-sm text-ink-mute">{i.summary}</div></div>
                        <RiskBadge risk={i.severity} size="sm" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5">{section("Evidence and sources")}
                <ul className="space-y-2 text-sm">
                  {info.evidence.map((e, i) => (
                    <li key={i} className="rounded-lg bg-mist p-3"><div className="font-semibold">{e.source}</div><div className="text-ink-mute">{e.evidence}</div>
                      {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-tide-dark underline">{e.title}</a>}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4"><InfoNote tone="warn">Seek urgent medical care for severe bleeding, chest pain, difficulty breathing, fainting or swelling of the face or lips.</InfoNote></div>
              <Disclaimer text={info.disclaimer} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
