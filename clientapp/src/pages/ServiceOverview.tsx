export default function ServiceOverview() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
        <div className="max-w-4xl">
          <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
            Client Success Hub
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            CyberShield360 Service Overview
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            CyberShield360 is a service-backed security assessment and remediation
            platform. It helps businesses identify cybersecurity issues, understand
            the business impact, receive a professional report, fix common issues,
            and train their team to avoid repeated risks.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ["1", "Identify", "Scan websites, assets, DNS, SSL, headers, vulnerabilities, and exposure."],
          ["2", "Explain", "Translate technical findings into simple business language."],
          ["3", "Fix", "Create a clear remediation plan and support one-time fixing work."],
          ["4", "Train", "Help the client understand what changed and how to stay secure."],
        ].map(([step, title, text]) => (
          <div
            key={title}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-sm font-black text-brand-300">
              {step}
            </div>

            <h2 className="text-base font-black text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-xl font-black text-white">
          Best Positioning
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          CyberShield360 should be presented as a one-time cybersecurity
          assessment and remediation solution for businesses, not only as a
          monthly SaaS subscription. The offer becomes easier to sell because the
          client receives identification, reporting, solution guidance, fixing,
          and training in one package.
        </p>
      </section>
    </div>
  );
}