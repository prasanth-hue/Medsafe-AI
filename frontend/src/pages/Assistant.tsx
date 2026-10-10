import ChatPanel from "../components/ChatPanel";
import { Disclaimer, InfoNote, PageHeader } from "../components/ui";

export default function Assistant() {
  return (
    <div>
      <PageHeader title="AI Assistant" subtitle="Ask about a medicine, check a combination, or tell it where to go, for example “Open scanner”." />
      <div className="max-w-3xl">
        <ChatPanel />
        <div className="mt-4"><InfoNote>The assistant answers from MedSafe AI's local medicine database. It will not give personal doses, diagnose conditions or replace a clinician. For emergencies, seek urgent medical care.</InfoNote></div>
        <Disclaimer />
      </div>
    </div>
  );
}
