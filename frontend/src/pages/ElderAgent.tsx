import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Languages,
  MessageSquare,
  Mic,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOff,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Utensils,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Disclaimer, EmptyState, ErrorBanner, Modal, PageHeader, Pill, Spinner, inputCls } from "../components/ui";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import type { ElderStatusResponse, ReminderLog, ScheduleItem } from "../types";

const PERIOD_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  Morning: { bg: "bg-white/[0.02]", border: "border-amber-500/30", text: "text-amber-300", badge: "border border-amber-500/30 bg-amber-500/10 text-amber-300" },
  Afternoon: { bg: "bg-white/[0.02]", border: "border-sky-500/30", text: "text-sky-300", badge: "border border-sky-500/30 bg-sky-500/10 text-sky-300" },
  Evening: { bg: "bg-white/[0.02]", border: "border-indigo-500/30", text: "text-indigo-300", badge: "border border-indigo-500/30 bg-indigo-500/10 text-indigo-300" },
  Bedtime: { bg: "bg-white/[0.02]", border: "border-purple-500/30", text: "text-purple-300", badge: "border border-purple-500/30 bg-purple-500/10 text-purple-300" },
};


export default function ElderAgent() {
  const { activePatient, patients, setActivePatientId } = useApp();
  const [data, setData] = useState<ElderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Form state
  const [phone, setPhone] = useState("");
  const [salutation, setSalutation] = useState("");
  const [lang, setLang] = useState("en");
  const [channel, setChannel] = useState("both");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Interactive Call Simulator Modal state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callState, setCallState] = useState<"ringing" | "connected" | "confirmed" | "ended">("ringing");
  const [currentScript, setCurrentScript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeLogId, setActiveLogId] = useState<number | null>(null);
  const [activePeriod, setActivePeriod] = useState<string>("Morning");
  const timerRef = useRef<any>(null);
  const ringAudioRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // SMS Simulator Modal state
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsPreviewBody, setSmsPreviewBody] = useState("");
  const [smsReplied, setSmsReplied] = useState(false);
  const [smsRepliedText, setSmsRepliedText] = useState("");

  useEffect(() => {
    if (activePatient) {
      loadElderStatus();
    }
  }, [activePatient?.id]);

  async function loadElderStatus(overrideLang?: string, overridePeriod?: string) {
    if (!activePatient) return;
    setLoading(true);
    setError(null);
    const chosenLang = overrideLang || lang;
    const chosenPeriod = overridePeriod || activePeriod;
    try {
      const res = await api.elderStatus(activePatient.id, chosenLang, chosenPeriod);
      setData(res);
      setPhone(res.elder_phone || activePatient.elder_phone || "");
      setSalutation(res.elder_salutation || activePatient.elder_salutation || activePatient.name);
      setLang(chosenLang);
      setChannel(res.reminder_channel || "both");
      setEnabled(res.elder_enabled !== false);
    } catch (err: any) {
      setError(err.message || "Failed to load elderly reminder details.");
    } finally {
      setLoading(false);
    }
  }

  function handleLanguageChange(newLang: string) {
    setLang(newLang);
    loadElderStatus(newLang, activePeriod);
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!activePatient) return;
    setSaving(true);
    setSaveSuccess(null);
    setError(null);
    try {
      await api.saveElderConfig({
        patient_id: activePatient.id,
        elder_phone: phone.trim(),
        elder_salutation: salutation.trim(),
        elder_lang: lang,
        reminder_channel: channel,
        elder_enabled: enabled,
      });
      setSaveSuccess(`Elder phone & reminder settings saved in ${lang === "te" ? "Telugu (తెలుగు)" : lang === "hi" ? "Hindi (हिन्दी)" : "English"}!`);
      setTimeout(() => setSaveSuccess(null), 4000);
      await loadElderStatus(lang, activePeriod);
    } catch (err: any) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  // Realistic telephone ringtone synthesizer
  function startRingtone() {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.value = 400;
      osc2.type = "sine";
      osc2.frequency.value = 450;

      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      ringAudioRef.current = { ctx, osc1, osc2, gain };
    } catch {
      // ignore
    }
  }

  function stopRingtone() {
    if (ringAudioRef.current) {
      try {
        ringAudioRef.current.osc1.stop();
        ringAudioRef.current.osc2.stop();
        ringAudioRef.current.ctx.close();
      } catch {}
      ringAudioRef.current = null;
    }
  }

  function stopSpokenAudio() {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {}
      activeAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    setIsSpeaking(false);
  }

  // Authentic regional voice synthesis (Telugu / Hindi / English)
  function speakScriptWithTTS(text: string, languageCode: string) {
    stopSpokenAudio();
    if (!text || !text.trim()) return;

    // Use our server-side native audio synthesis API that streams 100% authentic Telugu / Hindi / English MP3 speech
    const ttsUrl = `/api/elder-agent/tts?lang=${encodeURIComponent(languageCode)}&text=${encodeURIComponent(text.trim())}`;
    const audio = new Audio(ttsUrl);
    activeAudioRef.current = audio;

    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      activeAudioRef.current = null;
    };
    audio.onerror = () => {
      // Fallback to browser SpeechSynthesis if audio fetch fails
      fallbackBrowserSpeech(text, languageCode);
    };

    audio.play().catch(() => {
      // If browser blocks HTML5 autoplay, fallback to speech synthesis
      fallbackBrowserSpeech(text, languageCode);
    });
  }

  function fallbackBrowserSpeech(text: string, languageCode: string) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = languageCode === "te" ? 0.85 : 0.88; // Gentle, slower cadence for seniors
    utterance.pitch = 1.0;
    utterance.lang = languageCode === "te" ? "te-IN" : languageCode === "hi" ? "hi-IN" : "en-IN";

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (languageCode === "te") {
        const teVoice = voices.find(
          (v) => v.lang.toLowerCase().includes("te") || v.name.toLowerCase().includes("telugu")
        );
        if (teVoice) utterance.voice = teVoice;
      } else if (languageCode === "hi") {
        const hiVoice = voices.find(
          (v) => v.lang.toLowerCase().includes("hi") || v.name.toLowerCase().includes("hindi")
        );
        if (hiVoice) utterance.voice = hiVoice;
      } else {
        const enVoice = voices.find(
          (v) => v.lang.toLowerCase() === "en-in" || v.name.toLowerCase().includes("india")
        );
        if (enVoice) utterance.voice = enVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  // Trigger automated voice call
  async function triggerVoiceCall(period?: string) {
    if (!activePatient) return;
    setError(null);
    const p = period || activePeriod || data?.current_period || "Morning";
    setActivePeriod(p);
    try {
      const res = await api.triggerElderCall(activePatient.id, p, lang);
      setCurrentScript(res.payload.spoken_script);
      setActiveLogId(res.log.id);
      setCallState("ringing");
      setCallDuration(0);
      setShowCallModal(true);
      startRingtone();
      await loadElderStatus(lang, p);
    } catch (err: any) {
      setError(err.message || "Failed to initiate call.");
    }
  }

  // Trigger automated SMS
  async function triggerSMS(period?: string) {
    if (!activePatient) return;
    setError(null);
    const p = period || activePeriod || data?.current_period || "Morning";
    setActivePeriod(p);
    setSmsReplied(false);
    setSmsRepliedText("");
    try {
      const res = await api.triggerElderSMS(activePatient.id, p, lang);
      setSmsPreviewBody(res.payload.sms_body);
      setActiveLogId(res.log.id);
      setShowSmsModal(true);
      await loadElderStatus(lang, p);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch SMS.");
    }
  }

  // Change language dynamically from within the Call Simulator
  async function changeLanguageInSimulator(newLang: string) {
    setLang(newLang);
    if (!activePatient) return;
    try {
      const res = await api.elderStatus(activePatient.id, newLang, activePeriod);
      setData(res);
      const newScript = res.preview?.spoken_script || "";
      setCurrentScript(newScript);
      setSmsPreviewBody(res.preview?.sms_body || "");

      // If call is already active/connected, immediately switch speech audio to the new language!
      if (callState === "connected" && newScript) {
        speakScriptWithTTS(newScript, newLang);
      }
    } catch {
      // ignore
    }
  }

  // Change period dynamically from within the Call Simulator
  async function changePeriodInSimulator(newPeriod: string) {
    setActivePeriod(newPeriod);
    if (!activePatient) return;
    try {
      const res = await api.elderStatus(activePatient.id, lang, newPeriod);
      setData(res);
      const newScript = res.preview?.spoken_script || "";
      setCurrentScript(newScript);
      setSmsPreviewBody(res.preview?.sms_body || "");

      if (callState === "connected" && newScript) {
        speakScriptWithTTS(newScript, lang);
      }
    } catch {
      // ignore
    }
  }

  // Change language dynamically from within the SMS Simulator
  async function changeLanguageInSmsSimulator(newLang: string) {
    setLang(newLang);
    if (!activePatient) return;
    try {
      const res = await api.elderStatus(activePatient.id, newLang, activePeriod);
      setData(res);
      setSmsPreviewBody(res.preview?.sms_body || "");
      setCurrentScript(res.preview?.spoken_script || "");
    } catch {
      // ignore
    }
  }

  // Change period dynamically from within the SMS Simulator
  async function changePeriodInSmsSimulator(newPeriod: string) {
    setActivePeriod(newPeriod);
    if (!activePatient) return;
    try {
      const res = await api.elderStatus(activePatient.id, lang, newPeriod);
      setData(res);
      setSmsPreviewBody(res.preview?.sms_body || "");
      setCurrentScript(res.preview?.spoken_script || "");
    } catch {
      // ignore
    }
  }

  // Realistic phone keypad DTMF beep tone generator
  function playDtmfTone(key: string) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const freqs: Record<string, number> = {
        "1": 697, "2": 697, "3": 697,
        "4": 770, "5": 770, "6": 770,
        "7": 852, "8": 852, "9": 852,
        "*": 941, "0": 941, "#": 941,
      };
      osc.frequency.value = freqs[key] || 700;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // audio tone error ignored
    }
  }

  // Answer call in simulator & speak audio via Web Speech API
  function answerCall() {
    stopRingtone();
    setCallState("connected");
    setCallDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    // Play subtle answer click sound
    playDtmfTone("1");
    speakScriptWithTTS(currentScript, lang);
  }

  // Press Keypad 1 (Confirm Medicine Taken)
  async function handleKeypadPress(key: string) {
    playDtmfTone(key);

    if (key === "1" && callState === "connected") {
      setCallState("confirmed");
      const confText =
        lang === "te"
          ? "ధన్యవాదాలు! మీరు మందులు వేసుకున్నట్లు నమోదు చేయబడింది. మీ ఆరోగ్యం ఎల్లప్పుడూ బాగుండాలని కోరుకుంటున్నాము."
          : lang === "hi"
          ? "धन्यवाद! आपकी दवा लेने की पुष्टि दर्ज कर ली गई है। आपका स्वास्थ्य उत्तम रहे।"
          : "Thank you! We have recorded that your medicine was taken. Your doctor and family have been notified.";
      
      speakScriptWithTTS(confText, lang);

      if (activeLogId) {
        try {
          await api.confirmReminder(activeLogId);
          await loadElderStatus(lang, activePeriod);
        } catch {
          // ignore
        }
      }
    }
  }

  // Replay speech audio in simulator
  function replaySpeech() {
    if (currentScript) {
      speakScriptWithTTS(currentScript, lang);
    }
  }

  // Hang up call
  function endCall() {
    stopRingtone();
    stopSpokenAudio();
    playDtmfTone("#");
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCallState("ended");
    setTimeout(() => {
      setShowCallModal(false);
    }, 1200);
  }

  // Simulate elder replying to SMS from feature phone
  async function handleSmsReply(replyText: string) {
    playDtmfTone("1");
    setSmsReplied(true);
    setSmsRepliedText(replyText);
    if (activeLogId) {
      try {
        await api.confirmReminder(activeLogId);
        await loadElderStatus(lang, activePeriod);
      } catch {
        // ignore
      }
    }
  }

  // Caregiver manual confirm
  async function manualConfirm(logId: number) {
    try {
      await api.confirmReminder(logId);
      await loadElderStatus(lang, activePeriod);
    } catch (err: any) {
      setError(err.message || "Failed to confirm reminder.");
    }
  }

  if (!activePatient) {
    return (
      <EmptyState
        title="Select a Patient"
        text="Choose an elderly patient profile to configure Voice Call & SMS reminders for their non-smartphone."
      />
    );
  }

  const preview = data?.preview;
  const grouped = data?.schedule_grouped || {};
  const recentLogs = data?.recent_logs || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#00F2FE]">
              <span>[ 05 // OUTBOUND TELEPHONY ]</span>
              <span className="text-white/20">•</span>
              <span className="text-white/40">VOICE & SMS FEATURE PHONE AGENT</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
              Elderly Medication Call & SMS Reminders
            </h1>
            <p className="mt-2 text-sm text-white/60 max-w-3xl font-light">
              Autonomous outbound telephony system engineered for senior citizens using basic keypad feature phones (Nokia, Samsung Guru, landlines). Streams native Telugu, Hindi, or English speech with DTMF pill confirmation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => triggerVoiceCall()}
              className="!py-2.5 !px-4 text-xs font-bold font-mono tracking-wider"
            >
              <PhoneCall className="h-4 w-4 mr-2" /> Launch Voice Simulator
            </Button>
            <Button
              onClick={() => triggerSMS()}
              variant="secondary"
              className="!py-2.5 !px-4 text-xs font-bold font-mono tracking-wider"
            >
              <MessageSquare className="h-4 w-4 mr-2" /> Dispatch Test SMS
            </Button>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadElderStatus} />}

      {saveSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <div className="font-semibold">{saveSuccess}</div>
        </div>
      )}

      {/* Top 2-Column Grid: Config & Live Script Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Form: Elder Phone & Preferences (7 Cols) */}
        <div className="lg:col-span-7">
          <Card className="!p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-[#00F2FE]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Elderly Person's Phone & Protocol
                </h2>
              </div>
              <span className="font-mono text-xs text-white/40">
                CASE: {activePatient.name} ({activePatient.age || "72"} YRS)
              </span>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/50 mb-1" htmlFor="elder-phone">
                  Basic / Keypad Phone Number (Feature Phone / Landline) *
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-white/40">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="elder-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210 or 022 2548 9900"
                    className={`${inputCls} pl-10 font-mono text-sm`}
                  />
                </div>
                <p className="mt-1 text-[11px] font-mono text-white/40">
                  Direct GSM connection. Works reliably with basic keypad handsets without cellular data or internet.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/50 mb-1" htmlFor="elder-sal">
                    Respectful Salutation / Elder Name
                  </label>
                  <input
                    id="elder-sal"
                    type="text"
                    value={salutation}
                    onChange={(e) => setSalutation(e.target.value)}
                    placeholder="e.g. Grandfather Sharma, Savitri Amma"
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] text-white/40">
                    Spoken respectfully at the opening of the voice call.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/50 mb-1" htmlFor="elder-lang">
                    Spoken Voice Language
                  </label>
                  <select
                    id="elder-lang"
                    value={lang}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-white focus:border-[#00F2FE] focus:outline-none"
                  >
                    <option value="te" className="bg-prey-card text-white">తెలుగు (Telugu - నమస్కారం గారు)</option>
                    <option value="hi" className="bg-prey-card text-white">हिन्दी (Hindi - नमस्ते जी)</option>
                    <option value="en" className="bg-prey-card text-white">English (Clear Indian English)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/50 mb-1">
                    Dispatch Channel
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setChannel("call")}
                      className={`flex-1 rounded-lg border py-2 text-xs font-mono uppercase transition-all ${
                        channel === "call"
                          ? "border-[#00F2FE] bg-[#00F2FE]/15 font-bold text-[#00F2FE]"
                          : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      📞 Voice Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel("sms")}
                      className={`flex-1 rounded-lg border py-2 text-xs font-mono uppercase transition-all ${
                        channel === "sms"
                          ? "border-[#00F2FE] bg-[#00F2FE]/15 font-bold text-[#00F2FE]"
                          : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      💬 SMS Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel("both")}
                      className={`flex-1 rounded-lg border py-2 text-xs font-mono uppercase transition-all ${
                        channel === "both"
                          ? "border-[#00F2FE] bg-[#00F2FE]/15 font-bold text-[#00F2FE]"
                          : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      📞+💬 Both
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-white/50 mb-1">
                    Autonomous Dispatch Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setEnabled(!enabled)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-mono uppercase transition-all ${
                      enabled
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 bg-white/5 text-white/40"
                    }`}
                  >
                    <span>{enabled ? "Active (Scheduled Dispatches)" : "Paused"}</span>
                    <span className={`h-2 w-2 rounded-full ${enabled ? "bg-emerald-400 animate-ping" : "bg-white/20"}`} />
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" loading={saving} className="!py-2.5">
                  <Check className="h-4 w-4 mr-2" /> Save Phone Configuration
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Card: Live Generated Spoken Voice & SMS Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Language Switcher Bar */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-1.5">
            <span className="flex items-center gap-1.5 text-xs font-mono text-white/50 pl-2">
              <Languages className="h-3.5 w-3.5 text-[#00F2FE]" />
              <span>LANG:</span>
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleLanguageChange("te")}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                  lang === "te"
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                తెలుగు
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("hi")}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                  lang === "hi"
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                  lang === "en"
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                English
              </button>
            </div>
          </div>

          <Card className="!p-5 bg-prey-card/90">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-[#00F2FE]" />
                <span className="text-xs font-mono uppercase tracking-wider text-white">
                  Synthesized Speech Buffer ({(preview as any)?.language_label || "Multilingual"})
                </span>
              </div>
              <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[#00F2FE]">
                {(preview as any)?.period_localized || preview?.period || "Morning"} Time
              </span>
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-white/5 bg-black/60 p-3.5 text-xs text-white/80 leading-relaxed font-sans max-h-48 overflow-y-auto">
                <p className="font-mono text-[10px] text-white/40 mb-1.5 uppercase">
                  [Voice Assistant Cadence: 0.88x speed / Gentle Senior Tone]:
                </p>
                {preview?.spoken_script || "No medicines currently scheduled for this period."}
              </div>

              <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
                <span className="flex items-center gap-1 font-mono">
                  <Radio className="h-3 w-3 text-emerald-400" /> DTMF '1' ACK
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => speakScriptWithTTS(preview?.spoken_script || "", lang)}
                    className="flex items-center gap-1 font-mono text-xs text-[#00F2FE] hover:underline"
                    title="Play voice audio directly"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Listen Sample</span>
                  </button>
                  <button
                    onClick={() => triggerVoiceCall()}
                    className="font-mono text-xs text-white hover:underline"
                  >
                    Launch Simulator ›
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Feature Phone SMS Preview Box */}
          <Card className="!p-4 bg-prey-card/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-white">
                <MessageSquare className="h-3.5 w-3.5 text-[#00F2FE]" />
                <span>Basic Phone SMS Buffer (160 Chars)</span>
              </div>
              <span className="text-[10px] font-mono text-white/40">
                {preview?.sms_body?.length || 0} CHARS (1 SMS)
              </span>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-black/60 p-3 font-mono text-xs text-emerald-400 leading-snug">
              <pre className="whitespace-pre-wrap font-mono text-[11px]">
                {preview?.sms_body || "MEDSAFE REMINDER: No tablets scheduled."}
              </pre>
            </div>
          </Card>
        </div>
      </div>

      {/* Medication Timetable By Food & Meal Context */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white">
              Tablets Timetable & Food Administration
            </h2>
            <p className="text-xs font-mono text-white/40">
              Prescribed dosage timeline and meal offsets triggering autonomous voice dispatch.
            </p>
          </div>
          <Button
            onClick={() => window.location.hash = "#schedule"}
            variant="secondary"
            className="text-xs font-mono"
          >
            Manage Schedule Items ›
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {["Morning", "Afternoon", "Evening", "Bedtime"].map((p) => {
            const list = grouped[p] || [];
            const theme = PERIOD_COLORS[p] || PERIOD_COLORS.Morning;

            return (
              <div
                key={p}
                className={`flex flex-col rounded-2xl border ${theme.border} bg-prey-card/70 p-4 backdrop-blur-md`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-white text-xs uppercase tracking-wider">
                    {p === "Morning" ? "🌅" : p === "Afternoon" ? "☀️" : p === "Evening" ? "🌇" : "🌙"}
                    <span>{p}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}>
                    {list.length} {list.length === 1 ? "TABLET" : "TABLETS"}
                  </span>
                </div>

                {/* Tablets list */}
                <div className="flex-1 space-y-2.5 mb-4">
                  {list.length === 0 ? (
                    <div className="py-6 text-center font-mono text-xs text-white/30 italic">
                      [ NO TABLETS SCHEDULED ]
                    </div>
                  ) : (
                    list.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1.5"
                      >
                        <div className="font-bold text-xs text-white flex items-center justify-between">
                          <span>{item.medicine_name}</span>
                          <span className="font-mono text-[11px] text-white/50 font-normal">{item.dose}</span>
                        </div>

                        {/* Food timing pill */}
                        <div className="flex items-center gap-1 text-[11px] font-mono text-[#00F2FE]">
                          <Utensils className="h-3 w-3" />
                          <span>{item.food || "Not specified"}</span>
                        </div>

                        {item.instruction && (
                          <div className="text-[10px] font-mono text-white/50 bg-black/40 p-1.5 rounded border border-white/5">
                            {item.instruction}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Direct Action Buttons for this period */}
                {list.length > 0 && (
                  <div className="mt-auto pt-2 border-t border-white/5 flex gap-2">
                    <button
                      onClick={() => triggerVoiceCall(p)}
                      title={`Call elder for ${p} tablets`}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-neutral-200 transition-colors"
                    >
                      <PhoneCall className="h-3.5 w-3.5 mr-1" />
                      <span>Call Now</span>
                    </button>
                    <button
                      onClick={() => triggerSMS(p)}
                      title={`Send SMS for ${p} tablets`}
                      className="flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10 transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[#00F2FE]" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dispatched Calls & SMS History / Elder Confirmation Log */}
      <div className="rounded-2xl border border-white/10 bg-prey-card/80 p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#00F2FE]" />
              Telephony Dispatch & Confirmation Telemetry
            </h2>
            <p className="text-xs font-mono text-white/40">
              Audit log of autonomous voice calls and SMS transmitted to basic handsets.
            </p>
          </div>
          <button
            onClick={() => loadElderStatus()}
            className="flex items-center gap-1 text-xs font-mono text-white/60 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> REFRESH AUDIT
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-8 text-center font-mono text-xs text-white/30">
            [ NO TELEPHONY DISPATCHES LOGGED YET. TEST CALL OR SMS ABOVE ]
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-white/40 font-mono">
                  <th className="p-3">TIMESTAMP</th>
                  <th className="p-3">CHANNEL</th>
                  <th className="p-3">DESTINATION PHONE</th>
                  <th className="p-3">PERIOD</th>
                  <th className="p-3">TABLETS DISPATCHED</th>
                  <th className="p-3 text-center">STATUS</th>
                  <th className="p-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentLogs.map((log) => {
                  const isCall = log.channel === "call";
                  const isConfirmed = log.status === "confirmed";

                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-white/70 font-mono text-[11px]">
                        {log.created_at ? log.created_at.replace("T", " ").slice(0, 19) : "Just now"}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${
                          isCall ? "border border-amber-500/30 bg-amber-500/10 text-amber-300" : "border border-cyan-500/30 bg-cyan-500/10 text-[#00F2FE]"
                        }`}>
                          {isCall ? <PhoneCall className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                          {isCall ? "Voice Call" : "SMS Text"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-white text-[11px]">
                        {log.phone}
                      </td>
                      <td className="p-3 text-white/80 uppercase font-mono text-[11px]">
                        {log.period}
                      </td>
                      <td className="p-3 text-white/70 max-w-xs truncate" title={log.message_text}>
                        {log.medicines && log.medicines.length > 0
                          ? log.medicines.join(", ")
                          : log.message_text}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase ${
                          isConfirmed
                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border border-white/10 bg-white/5 text-white/50"
                        }`}>
                          {isConfirmed && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                          {isConfirmed ? "Confirmed Taken ✓" : log.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {!isConfirmed && (
                          <button
                            onClick={() => manualConfirm(log.id)}
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-mono uppercase text-white hover:border-[#00F2FE] hover:text-[#00F2FE] transition-colors"
                          >
                            Mark Taken
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clinical & Device Disclaimer */}
      <Disclaimer />

      {/* ============================================================ */}
      {/* INTERACTIVE FEATURE PHONE VOICE CALL SIMULATOR MODAL */}
      {/* ============================================================ */}
      {showCallModal && (
        <Modal
          open={showCallModal}
          onClose={endCall}
          title="Interactive Feature Phone Call Simulator"
          size="md"
        >
          <div className="flex flex-col items-center">
            {/* Live Simulator Language Switcher Bar */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 p-2 mb-2 w-full max-w-sm">
              <span className="flex items-center gap-1.5 text-xs font-mono text-white/50 pl-1">
                <Languages className="h-3.5 w-3.5 text-[#00F2FE]" />
                <span>LANG:</span>
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => changeLanguageInSimulator("te")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                    lang === "te"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  తెలుగు
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguageInSimulator("hi")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                    lang === "hi"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  हिन्दी
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguageInSimulator("en")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                    lang === "en"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Live Simulator Meal Timing Selector */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 p-1.5 mb-3 w-full max-w-sm">
              <span className="text-[11px] font-mono text-white/50 pl-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#00F2FE]" />
                <span>MEAL:</span>
              </span>
              <div className="flex gap-1">
                {(["Morning", "Afternoon", "Evening", "Bedtime"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => changePeriodInSimulator(p)}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-mono transition-all ${
                      activePeriod === p
                        ? "bg-white text-black font-bold"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Retro Feature Phone Body */}
            <div className="w-full max-w-sm rounded-3xl bg-[#090A0E] p-5 shadow-2xl border border-white/20 text-white">
              {/* Phone Speaker Grill */}
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/20" />

              {/* Monochrome / LCD Display */}
              <div className="rounded-xl bg-black p-4 border border-emerald-500/40 text-emerald-300 font-mono shadow-[inset_0_0_15px_rgba(16,185,129,0.15)] min-h-[190px] flex flex-col justify-between">
                {/* Header bar */}
                <div className="flex items-center justify-between text-[10px] border-b border-emerald-900/60 pb-1 text-emerald-400">
                  <span>📶 AIRTEL • {lang.toUpperCase()}</span>
                  <span>{callState === "connected" ? `00:${callDuration.toString().padStart(2, "0")}` : "MEDSAFE"}</span>
                  <span>🔋 94%</span>
                </div>

                {/* Main Screen Content */}
                <div className="my-auto text-center py-2">
                  {callState === "ringing" && (
                    <div className="space-y-1.5 animate-pulse">
                      <div className="text-xl">🔔 📞</div>
                      <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                        {lang === "te" ? "ఇన్‌కమింగ్ కాల్ వస్తోంది..." : lang === "hi" ? "इनकमिंग कॉल आ रही है..." : "Incoming Call..."}
                      </div>
                      <div className="font-bold text-base text-white">
                        {lang === "te" ? "మెడ్‌సేఫ్ కేర్ అసిస్టెంట్" : lang === "hi" ? "मेडसेफ केयर असिस्टेंट" : "MedSafe Care Assistant"}
                      </div>
                      <div className="text-[11px] text-emerald-300">
                        {salutation || activePatient.name} {lang === "te" ? "గారికి" : lang === "hi" ? "जी के लिए" : ""}
                      </div>
                      <div className="text-[10px] text-emerald-500 font-mono">
                        {activePeriod} Medicine Reminder
                      </div>
                    </div>
                  )}

                  {callState === "connected" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-emerald-300 border-b border-emerald-900/60 pb-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="flex items-center gap-0.5">
                            <span className="inline-block h-2 w-1 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="inline-block h-3.5 w-1 rounded-full bg-emerald-400 animate-pulse delay-75" />
                            <span className="inline-block h-2.5 w-1 rounded-full bg-emerald-400 animate-pulse delay-150" />
                          </span>
                          <span>
                            {lang === "te" ? "వాయిస్ అసిస్టెంట్ (తెలుగు)" : lang === "hi" ? "वॉइस असिस्टेंट (हिन्दी)" : "Voice Assistant"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={replaySpeech}
                          title="Replay Voice Speech"
                          className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] text-emerald-200 hover:text-white border border-emerald-800"
                        >
                          🔊 {lang === "te" ? "మళ్లీ వినండి" : lang === "hi" ? "दोबारा सुनें" : "Replay"}
                        </button>
                      </div>

                      <div className="max-h-24 overflow-y-auto rounded-lg bg-black/80 p-2 text-left font-sans text-[11px] leading-relaxed text-white border border-emerald-900 shadow-inner">
                        {currentScript}
                      </div>

                      <div className="rounded bg-amber-950/80 px-2 py-1 text-[11px] font-bold text-amber-300 border border-amber-800 animate-bounce">
                        👉 {lang === "te" ? "మాత్రలు వేసుకున్నాక 1 నొక్కండి!" : lang === "hi" ? "दवा लेने के बाद 1 दबाएं!" : "Press Keypad 1 When Taken!"}
                      </div>
                    </div>
                  )}

                  {callState === "confirmed" && (
                    <div className="space-y-1 text-emerald-200">
                      <div className="text-2xl font-bold text-emerald-400">✓ 1</div>
                      <div className="font-bold text-xs text-white">
                        {lang === "te" ? "మందులు వేసుకున్నట్లు నిర్ధారించబడింది" : lang === "hi" ? "दवा लेने की पुष्टि दर्ज हुई" : "MEDICINE CONFIRMED TAKEN"}
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        {lang === "te" ? "కుటుంబ సభ్యులకు SMS ద్వారా తెలిసింది" : lang === "hi" ? "परिवार को SMS द्वारा सूचित किया गया" : "Caregiver notified via SMS"}
                      </div>
                    </div>
                  )}

                  {callState === "ended" && (
                    <div className="text-xs text-white/50">
                      {lang === "te" ? "కాల్ ముగిసింది. ఆరోగ్యంగా ఉండండి!" : lang === "hi" ? "कॉल समाप्त। स्वस्थ रहें!" : "Call Ended. Have a healthy day!"}
                    </div>
                  )}
                </div>

                {/* Footer instructions */}
                <div className="text-[9px] text-emerald-500 text-center border-t border-emerald-900/60 pt-1">
                  {callState === "ringing" ? "Answer to listen to voice reminder" : "Keypad 1 confirms medicine swallowed"}
                </div>
              </div>

              {/* Action Call Buttons (Green / Red) */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {callState === "ringing" ? (
                  <button
                    onClick={answerCall}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg active:scale-95"
                  >
                    <PhoneIncoming className="h-4 w-4" />
                    <span>{lang === "te" ? "కాల్ ఎత్తండి" : lang === "hi" ? "कॉल उठाएं" : "Answer Call"}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleKeypadPress("1")}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-3 text-xs font-bold text-white hover:bg-amber-500 transition-colors shadow-lg active:scale-95"
                  >
                    <Check className="h-4 w-4" />
                    <span>{lang === "te" ? "1 నొక్కండి" : lang === "hi" ? "1 दबाएं" : "Press 1 (Taken)"}</span>
                  </button>
                )}

                <button
                  onClick={endCall}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-500 transition-colors shadow-lg active:scale-95"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>{lang === "te" ? "ముగించండి" : lang === "hi" ? "समाप्त" : "End Call"}</span>
                </button>
              </div>

              {/* Physical Keypad Simulation */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold font-mono">
                {[
                  { k: "1", sub: lang === "te" ? "ధృవీకరణ" : lang === "hi" ? "पुष्टि" : "CONFIRM" },
                  { k: "2", sub: "ABC" },
                  { k: "3", sub: "DEF" },
                  { k: "4", sub: "GHI" },
                  { k: "5", sub: "JKL" },
                  { k: "6", sub: "MNO" },
                  { k: "7", sub: "PQRS" },
                  { k: "8", sub: "TUV" },
                  { k: "9", sub: "WXYZ" },
                  { k: "*", sub: "" },
                  { k: "0", sub: "+" },
                  { k: "#", sub: "" },
                ].map((item) => (
                  <button
                    key={item.k}
                    onClick={() => handleKeypadPress(item.k)}
                    className="rounded-lg bg-white/5 p-2 text-white hover:bg-white/10 active:bg-white active:text-black transition-colors border border-white/10"
                  >
                    <div className="text-sm">{item.k}</div>
                    {item.sub && <div className="text-[8px] text-white/40 font-sans">{item.sub}</div>}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-xs font-mono text-white/40 text-center max-w-sm">
              Connects to destination <span className="text-white font-bold">{phone || "configured"}</span>. Simulates audio speech directly in your browser.
            </p>
          </div>
        </Modal>
      )}

      {/* ============================================================ */}
      {/* FEATURE PHONE SMS SIMULATOR MODAL */}
      {/* ============================================================ */}
      {showSmsModal && (
        <Modal
          open={showSmsModal}
          onClose={() => setShowSmsModal(false)}
          title="Feature Phone SMS Dispatched"
          size="md"
        >
          <div className="space-y-4">
            {/* Live SMS Simulator Language Switcher Bar */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 p-2">
              <span className="flex items-center gap-1.5 text-xs font-mono text-white/50 pl-1">
                <Languages className="h-3.5 w-3.5 text-[#00F2FE]" />
                <span>LANG:</span>
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => changeLanguageInSmsSimulator("te")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                    lang === "te"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  తెలుగు
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguageInSmsSimulator("hi")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                    lang === "hi"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  हिन्दी
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguageInSmsSimulator("en")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                    lang === "en"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Meal Time Selector for SMS Simulator */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 p-1.5 text-xs">
              <span className="font-mono text-white/50 pl-1 text-[11px] flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#00F2FE]" />
                <span>MEAL:</span>
              </span>
              <div className="flex gap-1">
                {(["Morning", "Afternoon", "Evening", "Bedtime"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => changePeriodInSmsSimulator(p)}
                    className={`rounded px-2.5 py-1 text-[11px] font-mono transition-all ${
                      activePeriod === p
                        ? "bg-white text-black font-bold shadow-xs"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-xs text-[#00F2FE]">
              <CheckCircle2 className="h-4 w-4 text-[#00F2FE] flex-shrink-0" />
              <span>SMS encoded in <strong className="text-white font-bold">{lang === "te" ? "Telugu" : lang === "hi" ? "Hindi" : "English"}</strong> for <strong className="font-mono text-white">{phone || "configured phone"}</strong>.</span>
            </div>

            {/* Feature phone SMS display */}
            <div className="rounded-2xl bg-black p-4 border border-white/15 text-white shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/40 border-b border-white/10 pb-2 mb-3">
                <span className="font-bold text-[#00F2FE]">
                  FROM: MEDSAFE-AI
                </span>
                <span>JUST NOW</span>
              </div>
              <div className="rounded-xl bg-black p-4 font-mono text-xs text-emerald-300 border border-emerald-500/30 shadow-[inset_0_0_15px_rgba(16,185,129,0.15)]">
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {smsPreviewBody}
                </pre>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-white/40">
                <span>GSM 7-BIT ENCODING</span>
                <span className="text-[#00F2FE]">
                  REPLY '1' OR 'YES' TO ACK
                </span>
              </div>
            </div>

            {/* Interactive Feature Phone SMS Reply Simulator */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5 font-mono">
                  <Smartphone className="h-4 w-4 text-[#00F2FE]" />
                  <span>SIMULATE ELDER'S SMS REPLY</span>
                </span>
                {smsReplied && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> CONFIRMED
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-white/40">
                Elderly individuals reply by typing '1' or 'YES' on keypad.
              </p>
              {smsReplied ? (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-300 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    ✓ Inbound reply <strong className="font-mono text-white">"{smsRepliedText}"</strong> confirmed. Caregiver audit logged!
                  </span>
                </div>
              ) : (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSmsReply("1")}
                    className="flex-1 rounded-lg bg-white py-2 text-xs font-bold text-black hover:bg-neutral-200 transition-colors shadow-xs"
                  >
                    Send Reply "1" (వేసుకున్నాను / ले ली / Taken)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSmsReply("YES")}
                    className="flex-1 rounded-lg border border-white/20 bg-white/5 py-2 text-xs font-bold text-white hover:bg-white/10 transition-colors shadow-xs"
                  >
                    Send Reply "YES"
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowSmsModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


