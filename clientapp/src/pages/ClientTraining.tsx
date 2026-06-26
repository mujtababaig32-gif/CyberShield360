const TRAINING_TOPICS = [
  "Basic cybersecurity awareness",
  "Phishing and fake email detection",
  "Password safety and MFA",
  "Email spoofing and DMARC awareness",
  "Website admin safety",
  "How to read CyberShield360 reports",
  "What to do when a new risk appears",
  "How to avoid repeating fixed issues",
];

export default function ClientTraining() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-brand-300">
          Human Defense
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Client Training
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
          CyberShield360 should not only deliver a report. It should help clients
          understand security risks, avoid repeated mistakes, and know what to do
          when a new issue appears.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {TRAINING_TOPICS.map((topic) => (
          <div
            key={topic}
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-4 text-sm font-semibold text-slate-300"
          >
            {topic}
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-xl font-black text-white">Training Promise</h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          We do not just give the client a report and leave. We explain the
          findings, train the team, and help them understand how to stay secure
          after the remediation work is completed.
        </p>
      </section>
    </div>
  );
}