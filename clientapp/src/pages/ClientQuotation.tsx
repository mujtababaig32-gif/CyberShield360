export default function ClientQuotation() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
          Deal Desk
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Client Quotation
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
          Prepare one-time pricing based on assessment scope, number of assets,
          remediation complexity, report requirements, and optional training.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {[
          ["Assessment Fee", "Initial website, asset, risk, DNS, SSL, and exposure review."],
          ["Optional Fixing Fee", "Security improvements based on approved remediation scope."],
          ["Optional Training Fee", "Client training session for team awareness and report understanding."],
        ].map(([title, text]) => (
          <div
            key={title}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-6"
          >
            <h2 className="text-lg font-black text-white">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">{text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-xl font-black text-white">Quotation Notes</h2>

        <div className="mt-5 space-y-3">
          {[
            "Pricing depends on number of websites, assets, and issues found.",
            "Fixing work should start only after the assessment report is approved.",
            "Final report should include before/after score comparison.",
            "Training can be added for non-technical teams and business owners.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}