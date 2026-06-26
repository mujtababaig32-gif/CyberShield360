import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

const PRICING_LINES = [
  {
    name: "Assessment Fee",
    description: "Initial website, asset, risk, DNS, SSL, and exposure review.",
    dependsOn: "Assets, websites, report depth",
    status: "Required",
  },
  {
    name: "Optional Fixing Fee",
    description: "Security improvements based on approved remediation scope.",
    dependsOn: "Issue count and complexity",
    status: "Optional",
  },
  {
    name: "Optional Training Fee",
    description: "Client training session for team awareness and report understanding.",
    dependsOn: "Team size and session length",
    status: "Optional",
  },
];

const QUOTATION_NOTES = [
  "Pricing depends on number of websites, assets, and issues found.",
  "Fixing work should start only after the assessment report is approved.",
  "Final report should include before/after score comparison.",
  "Training can be added for non-technical teams and business owners.",
];

export default function ClientQuotation() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
          Deal Desk
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Client Quotation
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
          Prepare one-time pricing based on assessment scope, number of assets,
          remediation complexity, report requirements, and optional training.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Pricing Model" value="One-Time" hint="Assessment based" tone="brand" />
        <CyberStatCard label="Core Fee" value="Assessment" hint="Required scope" tone="green" />
        <CyberStatCard label="Fixing" value="Optional" hint="Quoted after assessment" tone="orange" />
        <CyberStatCard label="Training" value="Optional" hint="Client handover" tone="brand" />
      </section>

      <CyberTable
        title="Quotation Structure"
        description="Clear pricing components for assessment, approved fixing, and client training."
        data={PRICING_LINES}
        emptyText="No quotation lines available."
        columns={[
          {
            key: "name",
            label: "Line Item",
            render: (line) => <div className="font-semibold text-white">{line.name}</div>,
          },
          {
            key: "description",
            label: "Description",
            render: (line) => (
              <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">{line.description}</div>
            ),
          },
          {
            key: "depends",
            label: "Depends On",
            render: (line) => (
              <div className="mx-auto min-w-64 text-center text-sm leading-6 text-slate-400">{line.dependsOn}</div>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (line) => <CyberStatusBadge value={line.status} />,
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Quotation Notes</h2>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {QUOTATION_NOTES.map((item, index) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-sm text-slate-300"
            >
              <div className="mb-2 text-xs font-black uppercase tracking-widest text-brand-300">
                Note #{index + 1}
              </div>
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
