import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

const TRAINING_TOPICS = [
  { topic: "Basic cybersecurity awareness", audience: "All staff", outcome: "Understand common security risks" },
  { topic: "Phishing and fake email detection", audience: "All staff", outcome: "Report suspicious messages faster" },
  { topic: "Password safety and MFA", audience: "All staff", outcome: "Reduce account takeover risk" },
  { topic: "Email spoofing and DMARC awareness", audience: "Managers / IT", outcome: "Understand email impersonation risk" },
  { topic: "Website admin safety", audience: "Website owners", outcome: "Avoid admin-panel exposure and weak login controls" },
  { topic: "How to read CyberShield360 reports", audience: "Business owners", outcome: "Understand score, risk, and fixes" },
  { topic: "What to do when a new risk appears", audience: "IT / Operations", outcome: "Follow clear response steps" },
  { topic: "How to avoid repeating fixed issues", audience: "Client team", outcome: "Maintain improved posture" },
];

export default function ClientTraining() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
          Human Defense
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Client Training
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
          CyberShield360 should not only deliver a report. It should help clients
          understand security risks, avoid repeated mistakes, and know what to do when a new issue appears.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Training Topics" value={TRAINING_TOPICS.length} hint="Client-ready topics" tone="brand" />
        <CyberStatCard label="Audience" value="Team" hint="Staff + owners" tone="green" />
        <CyberStatCard label="Report Handover" value="Included" hint="Explain findings" tone="orange" />
        <CyberStatCard label="Outcome" value="Safer Team" hint="Reduce repeat issues" tone="brand" />
      </section>

      <CyberTable
        title="Training Topics"
        description="Client-friendly training topics with audience and expected outcome."
        data={TRAINING_TOPICS}
        emptyText="No training topics available."
        columns={[
          {
            key: "topic",
            label: "Topic",
            render: (row) => (
              <div className="mx-auto min-w-72 text-center font-semibold text-white">{row.topic}</div>
            ),
          },
          {
            key: "audience",
            label: "Audience",
            render: (row) => <CyberStatusBadge value={row.audience} />,
          },
          {
            key: "outcome",
            label: "Outcome",
            render: (row) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">{row.outcome}</div>
            ),
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Training Promise</h2>

        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          We do not just give the client a report and leave. We explain the findings,
          train the team, and help them understand how to stay secure after the remediation work is completed.
        </p>
      </section>
    </div>
  );
}
