const STEPS = [
  {
    title: "Client Information",
    text: "Collect business name, website, contact person, industry, and assessment scope.",
  },
  {
    title: "Asset Collection",
    text: "Add domains, applications, cloud assets, email domains, and public-facing systems.",
  },
  {
    title: "Assessment Scope",
    text: "Define what CyberShield360 will scan, report, explain, and optionally fix.",
  },
  {
    title: "Approval & Start",
    text: "Confirm the package, timeline, deliverables, and start the assessment workflow.",
  },
];

export default function ClientOnboarding() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
          Client Success Hub
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Client Onboarding
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
          Start every client engagement with a clean intake process. This module
          helps capture client details, assets, assessment scope, service package,
          and approval before the security review begins.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-sm font-black text-brand-300">
              {index + 1}
            </div>

            <h2 className="text-base font-black text-white">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-xl font-black text-white">Onboarding Checklist</h2>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {[
            "Website/domain added",
            "Business contact added",
            "Assessment package selected",
            "Fixing scope discussed",
            "Training requirement confirmed",
            "Report delivery timeline agreed",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}