import { useEffect, useState } from "react";
import { AiCopilotApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";

type CopilotSummary = {
  generatedUtc: string;
  status: string;
  aiProvider: string;
  contextSources: string[];
  tenantContext: {
    assets: number;
    risks: number;
    scans: number;
  };
  suggestedQuestions: string[];
  recommendations: string[];
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export default function AiCopilot() {
  const [data, setData] = useState<CopilotSummary | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi, I’m CyberShield Copilot. Ask me about risks, vulnerabilities, compliance gaps, cloud posture, attack paths, or executive summaries.",
    },
  ]);

  const load = async () => {
    try {
      setSummaryLoading(true);
      const result = await AiCopilotApi.summary();
      setData(result);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const ask = async (q?: string) => {
    const finalQuestion = q || question;
    if (!finalQuestion.trim()) return;

    setMessages((items) => [...items, { role: "user", text: finalQuestion }]);
    setQuestion("");
    setLoading(true);

    try {
      const result = await AiCopilotApi.ask(finalQuestion);
      setMessages((items) => [...items, { role: "assistant", text: result.answer }]);
    } catch {
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: "I could not process that request right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return <div className="text-gray-500">Loading AI Copilot...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            Security Assistant
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            AI Copilot
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Ask CyberShield360 questions about risks, assets, compliance, cloud posture, and remediation priorities.
          </p>
        </div>

        <button type="button" onClick={load} disabled={summaryLoading} className="btn-ghost">
          {summaryLoading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Copilot Status" value={data.status} hint="Workspace assistant" tone="green" />
        <CyberStatCard label="AI Provider" value={data.aiProvider} hint="Configured provider" tone="brand" />
        <CyberStatCard label="Assets" value={data.tenantContext.assets} hint="Context available" tone="brand" />
        <CyberStatCard label="Risks" value={data.tenantContext.risks} hint={`${data.tenantContext.scans} scans in context`} tone="orange" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex min-h-[620px] flex-col rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10 xl:col-span-2">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                CyberShield Copilot Chat
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Ask for executive summaries, fix priorities, report wording, or risk explanations.
              </p>
            </div>

            <CyberStatusBadge value="Security Assistant" />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-2xl border p-4 ${
                  message.role === "user"
                    ? "ml-auto border-brand-500/30 bg-brand-500/20 text-white"
                    : "border-white/10 bg-white/[0.04] text-slate-200"
                }`}
              >
                <div className="mb-1 text-xs font-black uppercase tracking-wide opacity-70">
                  {message.role === "user" ? "You" : "CyberShield Copilot"}
                </div>
                <div className="text-sm leading-7">{message.text}</div>
              </div>
            ))}

            {loading && (
              <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm text-slate-500">Thinking...</div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className="input flex-1"
              placeholder="Ask: What should I fix first?"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void ask();
              }}
            />

            <button
              type="button"
              className="btn-primary"
              onClick={() => ask()}
              disabled={loading}
            >
              Ask Copilot
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <h2 className="text-lg font-black tracking-tight text-white">
              Suggested Questions
            </h2>

            <div className="mt-4 space-y-2">
              {data.suggestedQuestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => ask(item)}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left text-sm leading-6 text-slate-300 transition hover:border-brand-500/40 hover:bg-brand-500/10"
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <h2 className="text-lg font-black tracking-tight text-white">
              Context Sources
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {data.contextSources.map((source) => (
                <CyberStatusBadge key={source} value={source} />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <h2 className="text-lg font-black tracking-tight text-white">
              Recommendations
            </h2>

            <div className="mt-4 space-y-2">
              {data.recommendations.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center text-sm leading-6 text-slate-300"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
