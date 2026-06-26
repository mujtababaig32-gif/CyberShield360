import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";

const SERVICE_FLOW = [
  {
    step: "01",
    title: "Identify",
    text: "Scan websites, assets, DNS, SSL, headers, vulnerabilities, and public exposure.",
    owner: "CyberShield360",
  },
  {
    step: "02",
    title: "Explain",
    text: "Translate technical findings into simple business language for non-technical clients.",
    owner: "Advisor Mode",
  },
  {
    step: "03",
    title: "Fix",
    text: "Create a clear remediation plan and support approved one-time fixing work.",
    owner: "Remediation Team",
  },
  {
    step: "04",
    title: "Train",
    text: "Help the client understand what changed and how to avoid repeated issues.",
    owner: "Client Success",
  },
];

const DELIVERABLES = [
  "Executive security assessment report",
  "Business-impact explanation for each major issue",
  "Prioritized fix plan with difficulty and owner",
  "Before/after score comparison after remediation",
  "Client training session and handover guidance",
];

export default function ServiceOverview() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="max-w-4xl">
          <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
            Client Success Hub
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            CyberShield360 Service Overview
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-400">
            CyberShield360 is a service-backed security assessment and remediation platform.
            It helps businesses identify cybersecurity issues, understand the business impact,
            receive a professional report, fix common issues, and train their team to avoid repeated risks.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Service Model" value="One-Time" hint="Assessment + remediation" tone="brand" />
        <CyberStatCard label="Client Type" value="Business" hint="Non-technical friendly" tone="green" />
        <CyberStatCard label="Delivery Style" value="Report + Fix" hint="Clear handover" tone="orange" />
        <CyberStatCard label="Training" value="Included" hint="Optional package add-on" tone="brand" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SERVICE_FLOW.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-xl shadow-black/10"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-sm font-black text-brand-300">
              {item.step}
            </div>

            <h2 className="text-base font-black text-white">{item.title}</h2>
            <p className="mt-2 min-h-24 text-sm leading-6 text-slate-400">{item.text}</p>
            <div className="mt-4 flex justify-center">
              <CyberStatusBadge value={item.owner} />
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Best Positioning</h2>

          <p className="mt-3 text-sm leading-7 text-slate-400">
            CyberShield360 should be presented as a one-time cybersecurity assessment and remediation
            solution for businesses, not only as a monthly SaaS subscription. The offer becomes easier
            to sell because the client receives identification, reporting, solution guidance, fixing,
            and training in one package.
          </p>

          <div className="mt-5 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-center text-sm font-semibold leading-6 text-slate-200">
            “Identify the problem, explain the impact, fix what is approved, and train the client to stay secure.”
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Core Deliverables</h2>

          <div className="mt-5 space-y-3">
            {DELIVERABLES.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
