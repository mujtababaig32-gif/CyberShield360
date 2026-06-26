const REPORT_SECTIONS = [
  "Executive Summary",
  "Security Score",
  "What This Means",
  "Business Impact",
  "Recommended Fix",
  "Difficulty Level",
  "Who Should Fix It",
  "Before / After Score",
  "Fix Status",
  "Training Required",
];

export default function ReportBuilder() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
          Deal Desk
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Report Builder
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
          Build client-ready reports that explain technical findings in simple
          business language. Reports should show what is wrong, why it matters,
          how to fix it, and whether CyberShield360 can help remediate it.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {REPORT_SECTIONS.map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm font-semibold text-slate-300"
          >
            {item}
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-xl font-black text-white">Client Report Purpose</h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          A non-technical client should be able to read the report and understand
          the problem, the business risk, the recommended action, and the next
          service step without needing cybersecurity expertise.
        </p>
      </section>
    </div>
  );
}