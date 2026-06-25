import { useEffect, useState } from "react";
import { AiCopilotApi } from "../api/endpoints";

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hi, I’m CyberShield Copilot. Ask me about risks, vulnerabilities, compliance gaps, cloud posture, attack paths, or executive summaries.",
    },
  ]);

  useEffect(() => {
    AiCopilotApi.summary().then(setData);
  }, []);

  const ask = async (q?: string) => {
    const finalQuestion = q || question;
    if (!finalQuestion.trim()) return;

    setMessages((m) => [...m, { role: "user", text: finalQuestion }]);
    setQuestion("");
    setLoading(true);

    try {
      const result = await AiCopilotApi.ask(finalQuestion);
      setMessages((m) => [...m, { role: "assistant", text: result.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "I could not process that request right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <div className="text-gray-500">Loading AI Copilot...</div>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">AI Copilot</h1>
        <p className="text-sm text-gray-500">
          Ask CyberShield360 questions about risks, assets, compliance, cloud posture, and remediation priorities.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">Copilot Status</div>
          <div className="text-lg font-bold">{data.status}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">AI Provider</div>
          <div className="text-lg font-bold">{data.aiProvider}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Assets</div>
          <div className="text-3xl font-bold">{data.tenantContext.assets}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Risks</div>
          <div className="text-3xl font-bold text-orange-500">{data.tenantContext.risks}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 card flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">CyberShield Copilot Chat</h2>
              <p className="text-xs text-gray-500">
                Rule-based now. Later this will connect to OpenAI / Azure OpenAI / Claude.
              </p>
            </div>

            <span className="badge bg-brand-600">Security Assistant</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-2xl p-4 max-w-[90%] ${
                  m.role === "user"
                    ? "ml-auto bg-brand-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {m.role === "user" ? "You" : "CyberShield Copilot"}
                </div>
                <div className="text-sm leading-relaxed">{m.text}</div>
              </div>
            ))}

            {loading && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 max-w-[90%]">
                <div className="text-sm text-gray-500">Thinking...</div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <input
              className="input flex-1"
              placeholder="Ask: What should I fix first?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask();
              }}
            />

            <button className="btn-primary" onClick={() => ask()} disabled={loading}>
              Ask Copilot
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-4">Suggested Questions</h2>

            <div className="space-y-2">
              {data.suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="w-full text-left border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Context Sources</h2>

            <div className="flex flex-wrap gap-2">
              {data.contextSources.map((s) => (
                <span key={s} className="badge bg-gray-600">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Upgrade Path</h2>

            <div className="space-y-3">
              {data.recommendations.map((r, i) => (
                <div key={i} className="text-sm border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}