import { useEffect, useState } from "react";
import { Card, Disclaimer, ErrorBanner, PageHeader, Spinner } from "../components/ui";
import { api } from "../services/api";

export default function Settings() {
  const [h, setH] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { Promise.all([api.health(), api.modelInfo()]).then(([a, b]) => { setH(a); setInfo(b); }).catch((e) => setError(e.message)); }, []);
  const row = (k: string, v: React.ReactNode, ok?: boolean) => (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-ink-mute">{k}</dt><dd className={`text-right font-semibold ${ok === undefined ? "" : ok ? "text-risk-low" : "text-risk-mod"}`}>{v}</dd>
    </div>
  );
  return (
    <div>
      <PageHeader title="Settings & About" subtitle="System status, data provenance and safety principles." />
      {error && <ErrorBanner message={error} />}
      {!h || !info ? (!error && <Spinner />) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="System status"><dl>
            {row("Backend API", "Online", true)}
            {row("Medicines in database", h.medicines)}
            {row("OCR engine (Tesseract)", h.ocr_available ? "Available" : "Not found: manual entry only", h.ocr_available)}
            {row("Interaction model", h.model, h.model_trained)}
          </dl></Card>
          <Card title="About MedSafe AI">
            <p className="text-[15px]">MedSafe AI helps people understand medication safety when they take several medicines. It combines label reading, a biomedical knowledge graph, a graph neural network and plain-language explanations with sources.</p>
            <p className="mt-2 text-[15px]">Optional external AI: set <code className="rounded bg-mist px-1">ANTHROPIC_API_KEY</code> in the backend environment to let the assistant answer general questions. Everything else works without it.</p>
          </Card>
          <Card title="Data provenance"><p className="text-[15px]">{info.dataset_label}</p>
            <p className="mt-2 text-sm text-ink-mute">The included demo patient (Demo Patient, 45, hypertension; warfarin, aspirin, omeprazole) is fictional demo data.</p></Card>
          <Card title="Safety principles">
            <ul className="list-disc space-y-1.5 pl-5 text-[15px]">
              <li>Decision support only. No diagnosis, no prescribing.</li>
              <li>Never invents a patient's dose or timing; you enter what the label says.</li>
              <li>OCR reads visible text. It does not identify pills by shape or colour.</li>
              <li>"Unknown" risk means no record, not "safe".</li>
              <li>Evaluation metrics are computed by the training script, never typed in.</li>
              <li>Emergency symptoms: seek urgent medical care.</li>
            </ul>
          </Card>
        </div>
      )}
      <Disclaimer />
    </div>
  );
}
