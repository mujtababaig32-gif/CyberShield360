const FIX_ITEMS = [
  {
    issue: "Missing DMARC Record",
    impact: "Email spoofing risk",
    fix: "Add a DMARC DNS record in monitoring mode.",
    difficulty: "Medium",
    owner: "Domain / IT Admin",
    status: "Planned",
  },
  {
    issue: "Weak Security Headers",
    impact: "Browser-side protection gaps",
    fix: "Add recommended HTTP security headers.",
    difficulty: "Low",
    owner: "Web Developer",
    status: "Ready",
  },
  {
    issue: "Public Admin Panel",
    impact: "Higher brute-force and exposure risk",
    fix: "Restrict access, enable MFA, and harden login controls.",
    difficulty: "High",
    owner: "Website Admin",
    status: "Needs Approval",
  },
];

export default function FixPlan() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
          Remediation Workflow
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Fix Plan
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
          The Fix Plan converts scan findings into a simple remediation workflow:
          what the issue means, business impact, recommended fix, difficulty,
          responsible person, and current fix status.
        </p>
      </section>

      <section className="grid gap-4">
        {FIX_ITEMS.map((item) => (
          <div
            key={item.issue}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-white">{item.issue}</h2>
                <p className="mt-2 text-sm text-slate-400">{item.impact}</p>
              </div>

              <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-300">
                {item.status}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white/[0.03] p-4">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Recommended Fix
                </div>
                <div className="mt-2 text-sm text-slate-300">{item.fix}</div>
              </div>

              <div className="rounded-2xl bg-white/[0.03] p-4">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Difficulty
                </div>
                <div className="mt-2 text-sm text-slate-300">{item.difficulty}</div>
              </div>

              <div className="rounded-2xl bg-white/[0.03] p-4">
                <div className="text-xs font-bold uppercase text-slate-500">
                  Who Should Fix It
                </div>
                <div className="mt-2 text-sm text-slate-300">{item.owner}</div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}