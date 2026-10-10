import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import type { ChatMessage } from "../types";

const SUGGESTIONS = ["What is warfarin used for?", "Check aspirin and warfarin.", "Open scanner", "Open medication schedule", "What medicines is this patient taking?", "How does the GNN work?"];

// Conversation lives at module level so it persists between the floating widget and the full page.
let history: ChatMessage[] = [{ role: "assistant", text: "Hi, I'm Ask MedSafe AI. I can explain medicines, check combinations and open any part of the app. I can't give personal doses or diagnose conditions." }];

export default function ChatPanel({ compact = false }: { compact?: boolean }) {
  const { activePatient, navigate } = useApp();
  const [msgs, setMsgs] = useState<ChatMessage[]>(history);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { history = msgs; end.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;
    setText("");
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const r = await api.chat(message, activePatient?.id);
      setMsgs((m) => [...m, { role: "assistant", text: r.reply }]);
      if (r.action?.type === "navigate") setTimeout(() => navigate(r.action.page, r.action.params ?? {}), 400);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", text: e.message }]);
    } finally { setBusy(false); }
  }

  return (
    <div className={`flex flex-col ${compact ? "h-full" : "h-[70vh] min-h-[420px] rounded-xl border border-line bg-white shadow-card"}`}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${m.role === "user" ? "bg-ink text-white" : "bg-mist text-ink"}`}>{m.text}</div>
          </div>
        ))}
        {busy && <div className="text-sm text-ink-mute">MedSafe AI is thinking...</div>}
        <div ref={end} />
      </div>
      <div className="border-t border-line p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-soft hover:bg-tide-light">{s}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about a medicine or say 'Open scanner'"
            aria-label="Message" className="min-h-[44px] flex-1 rounded-lg border border-line px-3 text-[15px] focus:border-tide focus:outline-none" />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Send"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-tide text-white hover:bg-tide-dark disabled:opacity-50"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}

export function ChatWidget() {
  const { page } = useApp();
  const [open, setOpen] = useState(false);
  if (page === "assistant") return null;
  return (
    <>
      {open && (
        <div className="fixed inset-x-3 bottom-20 z-40 flex h-[min(560px,75vh)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl sm:inset-x-auto sm:right-5 sm:w-[390px]">
          <div className="flex items-center gap-2 bg-ink px-4 py-3 text-white">
            <Sparkles className="h-4 w-4 text-[#38B6C0]" aria-hidden /><span className="font-semibold">Ask MedSafe AI</span>
            <button onClick={() => setOpen(false)} className="ml-auto text-sm underline">Close</button>
          </div>
          <div className="min-h-0 flex-1"><ChatPanel compact /></div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-label="Ask MedSafe AI" aria-expanded={open}
        className="fixed bottom-4 right-4 z-40 flex min-h-[52px] items-center gap-2 rounded-full bg-tide px-5 font-semibold text-white shadow-lg hover:bg-tide-dark">
        <Sparkles className="h-5 w-5" aria-hidden />Ask MedSafe AI
      </button>
    </>
  );
}
