import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

const REPORT_SECTIONS = [
  { section: "Executive Summary", purpose: "Board-level overview of score, risk, and action required.", audience: "Business Owner" },
  { section: "Security Score", purpose: "Shows current posture and grade in simple language.", audience: "Management" },
  { section: "What This Means", purpose: "Explains technical findings without jargon.", audience: "Non-Technical Client" },
  { section: "Business Impact", purpose: "Connects each issue to trust, fraud, downtime, or compliance risk.", audience: "Business Owner" },
  { section: "Recommended Fix", purpose: "Clear next action for each issue.", audience: "IT / Web Team" },
  { section: "Difficulty Level", purpose: "Shows how hard the fix is to complete.", audience: "Project Owner" },
  { section: "Who Should Fix It", purpose: "Assigns the likely responsible person or team.", audience: "Client Team" },
  { section: "Before / After Score", purpose: "Shows improvement after remediation.", audience: "Management" },
  { section: "Fix Status", purpose: "Tracks planned, approved, in-progress, or completed fixes.", audience: "Project Owner" },
  { section: "Training Required", purpose: "Highlights whether the team needs awareness training.", audience: "Client Success" },
];

export default function ReportBuilder() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
          Deal Desk
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Report Builder
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
          Build client-ready reports that explain technical findings in simple business language.
          Reports should show what is wrong, why it matters, how to fix it, and whether CyberShield360 can help remediate it.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Report Sections" value={REPORT_SECTIONS.length} hint="Client-ready format" tone="brand" />
        <CyberStatCard label="Language" value="Simple" hint="Non-technical friendly" tone="green" />
        <CyberStatCard label="Fix Tracking" value="Included" hint="Status and owner" tone="orange" />
        <CyberStatCard label="Training Flag" value="Yes/No" hint="Client handover" tone="brand" />
      </section>

      <CyberTable
        title="Client Report Structure"
        description="Recommended report sections for a professional non-technical security assessment."
        data={REPORT_SECTIONS}
        emptyText="No report sections available."
        columns={[
          {
            key: "section",
            label: "Section",
            render: (row) => (
              <div className="mx-auto min-w-72 text-center font-semibold text-white">{row.section}</div>
            ),
          },
          {
            key: "purpose",
            label: "Purpose",
            render: (row) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">{row.purpose}</div>
            ),
          },
          {
            key: "audience",
            label: "Audience",
            render: (row) => <CyberStatusBadge value={row.audience} />,
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Client Report Purpose</h2>

        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          A non-technical client should be able to read the report and understand
          the problem, the business risk, the recommended action, and the next service step
          without needing cybersecurity expertise.
        </p>
      </section>
    </div>
  );
}
