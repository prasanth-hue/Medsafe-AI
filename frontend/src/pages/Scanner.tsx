import { Camera, CheckCircle2, ImageUp, RefreshCw, ScanText, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Disclaimer, ErrorBanner, Field, InfoNote, MedicineDatalist, SuccessBanner, inputCls } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { useMedicines } from "../services/hooks";
import type { MedicineInfo } from "../types";

const ACCEPT = ".jpg,.jpeg,.png,.webp";

export default function Scanner() {
  const { activePatient, refreshPatients, navigate } = useApp();
  const meds = useMedicines();
  const [mode, setMode] = useState<"camera" | "upload">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [origin, setOrigin] = useState<"upload" | "camera" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [manual, setManual] = useState("");
  const [confirmed, setConfirmed] = useState<MedicineInfo | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCameraOn(false); };
  useEffect(() => stopCamera, []);
  useEffect(() => { if (mode !== "camera") stopCamera(); }, [mode]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function setImage(f: File, from: "upload" | "camera") {
    setFile(f); setOrigin(from); setResult(null); setConfirmed(null); setAdded(null); setError(null); setManual("");
    setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) { setError("Unsupported file type. Please choose a .jpg, .jpeg, .png or .webp image."); return; }
    if (f.size > 12 * 1024 * 1024) { setError("This image is larger than 12 MB. Please choose a smaller photo."); return; }
    setImage(f, "upload");
  }

  async function openCamera() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setError("Camera access is unavailable. Please allow browser camera permission or use Upload Image."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => undefined); } });
    } catch {
      setError("Camera access is unavailable. Please allow browser camera permission or use Upload Image.");
    }
  }

  function capture() {
    const v = videoRef.current;
    if (!v || !v.videoWidth) { setError("The camera is not ready yet. Wait a moment and try again."); return; }
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) { setError("Could not capture the photo. Please try again or use Upload Image."); return; }
      setImage(new File([blob], "capture.jpg", { type: "image/jpeg" }), "camera");
      stopCamera();
    }, "image/jpeg", 0.92);
  }

  function retake() { setFile(null); setPreview(null); setResult(null); setConfirmed(null); setOrigin(null); if (mode === "camera") openCamera(); }

  async function analyze() {
    if (!file) return;
    setBusy(true); setError(null); setResult(null); setConfirmed(null);
    try {
      const r = await api.scan(file, activePatient?.id);
      setResult(r);
      if (r.confident && r.detected) setManual(r.detected.name);
    } catch (e: any) {
      setError(e.message || "We couldn't confidently read the medicine label. Please enter the medicine name manually.");
      setResult({ candidates: [], confident: false, text: "", message: "We couldn't confidently read the medicine label. Please enter the medicine name manually." });
    } finally {
      setBusy(false);
    }
  }

  async function confirm(name: string) {
    if (!name.trim()) { setError("Please enter or choose a medicine name to confirm."); return; }
    setError(null); setAdded(null);
    try { setConfirmed(await api.medicine(name)); } catch (e: any) { setError(e.message); }
  }

  async function addToPatient() {
    if (!activePatient || !confirmed) return;
    try {
      await api.addPatientMedicine(activePatient.id, confirmed.id);
      await refreshPatients();
      setAdded(`${confirmed.name} added to ${activePatient.name}'s current regime.`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function checkNow() {
    if (!confirmed) return;
    const names = activePatient ? activePatient.medicines.map((id) => meds.find((m) => m.id === id)?.name ?? id) : [];
    if (!names.includes(confirmed.name)) names.push(confirmed.name);
    navigate("checker", { medicines: names });
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#00F2FE]">
          <span>[ 04 // VISION OCR ]</span>
          <span className="text-white/20">•</span>
          <span className="text-white/40">OPTICAL PACKAGING INGESTION</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
          Prescription & Strip Scanner
        </h1>
        <p className="mt-2 text-sm text-white/60 max-w-2xl font-light">
          Optical character recognition pipeline extracts drug nomenclature directly from pharmaceutical strips, blister packs, and prescription slips.
        </p>
      </div>

      <MedicineDatalist id="scan-meds" names={meds.map((m) => m.name)} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="01 // Image Capture & Feed">
          <div role="tablist" className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-1.5">
            {([["upload", "Upload File", ImageUp], ["camera", "Live Camera Feed", Camera]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`flex min-h-[40px] items-center justify-center gap-2 rounded-lg text-xs font-mono tracking-wider transition-all ${
                  mode === id
                    ? "bg-white text-black font-bold shadow-lg"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {mode === "upload" && (
            <div>
              <input ref={inputRef} type="file" accept={ACCEPT} onChange={onPick} className="hidden" data-testid="file-input" aria-label="Upload medicine photo" />
              <button
                onClick={() => inputRef.current?.click()}
                type="button"
                className="group flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-8 text-center transition-all hover:border-[#00F2FE] hover:bg-[#00F2FE]/[0.02]"
              >
                <div className="rounded-full border border-white/10 bg-white/5 p-4 text-white group-hover:border-[#00F2FE] group-hover:text-[#00F2FE] transition-colors">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="mt-3 text-sm font-semibold text-white">Select High-Resolution Image</div>
                <p className="mt-1 text-xs text-white/40">Accepted: .JPG, .PNG, .WEBP (max 12MB). Place strip flat under direct lighting.</p>
              </button>
            </div>
          )}

          {mode === "camera" && !preview && (
            <div>
              {!cameraOn ? (
                <Button onClick={openCamera} className="w-full">
                  <Camera className="h-4 w-4 mr-2" /> Activate Camera Sensor
                </Button>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-white/20 bg-black">
                  <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />
                  <div className="absolute inset-4 pointer-events-none border border-white/20">
                    <span className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-[#00F2FE]" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-[#00F2FE]" />
                    <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-[#00F2FE]" />
                    <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-[#00F2FE]" />
                  </div>
                  <div className="mt-3 flex gap-2 p-3 bg-black/60 backdrop-blur-md">
                    <Button onClick={capture} className="flex-1">
                      <Camera className="h-4 w-4 mr-2" /> Capture Frame
                    </Button>
                    <Button variant="secondary" onClick={stopCamera}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs font-mono text-white/40">Browser hardware permission requested. Processed locally in memory.</p>
            </div>
          )}

          {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

          {preview && (
            <div className="mt-4 space-y-3">
              <SuccessBanner message={origin === "camera" ? "Frame captured from hardware camera" : "File loaded successfully into buffer"} />
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
                <img src={preview} alt="Selected medicine label" className="max-h-72 w-full object-contain" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={analyze} loading={busy}>
                  <ScanText className="h-4 w-4 mr-2" /> {busy ? "Executing OCR..." : "Analyze Packaging OCR"}
                </Button>
                <Button variant="secondary" onClick={retake}>
                  <RefreshCw className="h-4 w-4 mr-2" /> {mode === "camera" ? "Retake Frame" : "Select Another"}
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card title="02 // Identification & Verification">
          {!result && !confirmed && (
            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-6 text-center text-xs font-mono text-white/40">
              [ WAITING FOR OPTICAL SCANNER FEED OR MANUAL ENTRY ]
            </div>
          )}

          {result && (
            <div className="mb-4 space-y-3">
              {result.confident ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                  <span className="font-mono uppercase font-bold text-white">[ MATCH DETECTED ] </span>
                  Identified candidate: <b className="text-white">{result.detected.name}</b>. Verify packaging before locking profile.
                </div>
              ) : (
                <InfoNote tone="warn">{result.message}</InfoNote>
              )}

              {result.candidates?.length > 0 && !result.confident && (
                <div>
                  <div className="text-[11px] font-mono uppercase text-white/40 mb-2">Top Lexical Candidates:</div>
                  <div className="flex flex-wrap gap-2">
                    {result.candidates.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setManual(c.name); confirm(c.name); }}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-mono text-white hover:border-[#00F2FE] hover:text-[#00F2FE] transition-colors"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {result.text && (
                <details className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                  <summary className="cursor-pointer font-mono text-white/60 hover:text-white">
                    Raw OCR Transcribed Buffer (Confidence {result.ocr_confidence}%)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-[11px] text-white/50">{result.text}</pre>
                </details>
              )}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); confirm(manual); }} className="space-y-3">
            <Field label="Manual Molecule / Brand Search">
              <input
                list="scan-meds"
                className={inputCls}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="e.g. Warfarin, Paracetamol, Metformin"
              />
            </Field>
            <Button type="submit" variant={result?.confident ? "primary" : "secondary"} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm Molecule Identity
            </Button>
          </form>
        </Card>
      </div>

      {confirmed && (
        <Card
          className="mt-6"
          title={confirmed.name}
          action={
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-[#00F2FE]">
              {confirmed.drug_class}
            </span>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <span className="font-mono uppercase text-white/40">Active Chemical Agent</span>
              <p className="mt-1 font-semibold text-white">{confirmed.name.split("(")[0].trim()}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <span className="font-mono uppercase text-white/40">Primary Indication</span>
              <p className="mt-1 text-white/80">{confirmed.general_use}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <span className="font-mono uppercase text-white/40">Administration Protocol</span>
              <p className="mt-1 text-white/80">{confirmed.general_administration}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <span className="font-mono uppercase text-white/40">Clinical Warnings</span>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-white/80">
                {confirmed.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
            <div className="md:col-span-2 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
              <span className="font-mono uppercase text-white/40">Known Cross-Interactions</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {confirmed.known_interactions.slice(0, 8).map((i) => (
                  <span key={i.with} className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/80">
                    {i.with_name} <span className="text-[#FF3366]">({i.severity.toLowerCase()})</span>
                  </span>
                ))}
                {confirmed.known_interactions.length === 0 && (
                  <span className="text-white/40">No documented pairwise interactions in demonstration database.</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4"><InfoNote>{confirmed.prescription_note}</InfoNote></div>
          {added && <div className="mt-3"><SuccessBanner message={added} /></div>}

          <div className="mt-4 flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={addToPatient} disabled={!activePatient}>
              Add to Patient Active Regime
            </Button>
            <Button variant="secondary" onClick={checkNow}>
              Run Cross-Interaction Check
            </Button>
            {!activePatient && <span className="font-mono text-xs text-white/40">[ SELECT AN ACTIVE PATIENT CASE FILE ]</span>}
          </div>

          <Disclaimer text={confirmed.disclaimer} />
        </Card>
      )}
    </div>
  );
}
