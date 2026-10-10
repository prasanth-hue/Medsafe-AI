import { ExternalLink, FlaskConical } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, Disclaimer, EmptyState, ErrorBanner, Field, InfoNote, MedicineDatalist, PageHeader, Spinner, inputCls } from "../components/ui";
import { api } from "../services/api";
import { useMedicines } from "../services/hooks";
import type { Evidence as Ev } from "../types";

export default function Evidence() {
  const meds = useMedicines();
  const [drug, setDrug] = useState("");
  const [other, setOther] = useState("");
  const [items, setItems] = useState<Ev[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setError(null);
      api.evidence(drug, other).then((r) => setItems(r.items)).catch((e) => { setError(e.message); setItems([]); });
    }, 250);
    return () => clearTimeout(t);
  }, [drug, other]);

  return (
    <div>
      <PageHeader title="Evidence & Sources" subtitle="Where each statement comes from. Nothing here is fabricated; links open official searches." />
      <MedicineDatalist id="ev-meds" names={meds.map((m) => m.name)} />
      <div className="mb-5"><InfoNote>Two kinds of entries appear. <b>Local demo evidence</b> is summary text stored with this prototype. <b>Search links</b> open MedlinePlus, DailyMed or PubMed searches so you can read the official source yourself; MedSafe AI does not claim a specific article says anything.</InfoNote></div>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Medicine"><input list="ev-meds" className={inputCls} value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="Leave empty to see all" /></Field>
          <Field label="Second medicine (optional, for a pair)"><input list="ev-meds" className={inputCls} value={other} onChange={(e) => setOther(e.target.value)} /></Field>
        </div>
      </Card>
      {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
      {!items ? <Spinner /> : items.length === 0 && !error ? <div className="mt-5"><EmptyState title="No evidence found" text="Try the generic medicine name." /></div> : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {items.map((e, i) => (
            <li key={i}><Card>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-tide-dark">{e.kind === "local-demo" ? <><FlaskConical className="h-3.5 w-3.5" />Local demo evidence</> : <><ExternalLink className="h-3.5 w-3.5" />External search link</>}</div>
              <div className="text-sm text-ink-mute">{e.source}</div>
              <h3 className="font-sans text-base font-semibold">{e.title}</h3>
              <p className="mt-1 text-[15px]">{e.evidence}</p>
              {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-tide-dark underline">Open source<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>}
            </Card></li>
          ))}
        </ul>
      )}
      <Disclaimer />
    </div>
  );
}
