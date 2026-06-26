import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

const STEPS = [
  {
    title: "Client Information",
    text: "Collect business name, website, contact person, industry, and assessment scope.",
    owner: "Sales / Client Success",
    status: "Required",
  },
  {
    title: "Asset Collection",
    text: "Add domains, applications, cloud assets, email domains, and public-facing systems.",
    owner: "Security Analyst",
    status: "Required",
  },
  {
    title: "Assessment Scope",
    text: "Define what CyberShield360 will scan, report, explain, and optionally fix.",
    owner: "Project Owner",
    status: "Required",
  },
  {
    title: "Approval & Start",
    text: "Confirm package, timeline, deliverables, and start the assessment workflow.",
    owner: "Client",
    status: "Approval",
  },
];

const CHECKLIST = [
  { item: "Website/domain added", owner: "Security Analyst", status: "Ready" },
  { item: "Business contact added", owner: "Client Success", status: "Ready" },
  { item: "Assessment package selected", owner: "Deal Desk", status: "Needs Approval" },
  { item: "Fixing scope discussed", owner: "Remediation Lead", status: "Planned" },
  { item: "Training requirement confirmed", owner: "Client Success", status: "Planned" },
  { item: "Report delivery timeline agreed", owner: "Project Owner", status: "Needs Approval" },
];

export default function ClientOnboarding() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
          Client Success Hub
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Client Onboarding
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
          Start every client engagement with a clean intake process. Capture client details,
          assets, assessment scope, service package, and approval before the security review begins.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Client Intake" value="4 Steps" hint="Structured onboarding" tone="brand" />
        <CyberStatCard label="Assets" value="Required" hint="Scope foundation" tone="orange" />
        <CyberStatCard label="Approval" value="Client" hint="Before assessment starts" tone="green" />
        <CyberStatCard label="Deliverables" value="Defined" hint="Report, fix, training" tone="brand" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-xl shadow-black/10"
          >
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-sm font-black text-brand-300">
              {index + 1}
            </div>

            <h2 className="text-base font-black text-white">{step.title}</h2>
            <p className="mt-2 min-h-24 text-sm leading-6 text-slate-400">{step.text}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <CyberStatusBadge value={step.status} />
              <CyberStatusBadge value={step.owner} />
            </div>
          </div>
        ))}
      </section>

      <CyberTable
        title="Onboarding Checklist"
        description="Client-ready checklist for assessment launch readiness."
        data={CHECKLIST}
        emptyText="No onboarding checklist items."
        columns={[
          {
            key: "item",
            label: "Checklist Item",
            render: (row) => (
              <div className="mx-auto min-w-72 text-center font-semibold text-white">{row.item}</div>
            ),
          },
          {
            key: "owner",
            label: "Owner",
            render: (row) => <div className="text-slate-300">{row.owner}</div>,
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <CyberStatusBadge value={row.status} />,
          },
        ]}
      />
    </div>
  );
}
