import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

const FIX_ITEMS = [
  {
    issue: "Missing DMARC Record",
    meaning: "Your email domain has weaker protection against spoofed messages.",
    impact: "Email spoofing risk",
    fix: "Add a DMARC DNS record in monitoring mode.",
    difficulty: "Medium",
    owner: "Domain / IT Admin",
    status: "Planned",
    priority: "High",
  },
  {
    issue: "Weak Security Headers",
    meaning: "The website is missing browser protections that reduce common web risks.",
    impact: "Browser-side protection gaps",
    fix: "Add recommended HTTP security headers.",
    difficulty: "Low",
    owner: "Web Developer",
    status: "Ready",
    priority: "Medium",
  },
  {
    issue: "Public Admin Panel",
    meaning: "The admin login is visible publicly and may be targeted by attackers.",
    impact: "Higher brute-force and exposure risk",
    fix: "Restrict access, enable MFA, and harden login controls.",
    difficulty: "High",
    owner: "Website Admin",
    status: "Needs Approval",
    priority: "Critical",
  },
];

export default function FixPlan() {
  const ready = FIX_ITEMS.filter((item) => item.status === "Ready").length;
  const approval = FIX_ITEMS.filter((item) => item.status.includes("Approval")).length;
  const highPriority = FIX_ITEMS.filter((item) => ["Critical", "High"].includes(item.priority)).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
          Remediation Workflow
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Fix Plan
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
          The Fix Plan converts scan findings into a simple remediation workflow:
          what the issue means, business impact, recommended fix, difficulty,
          responsible person, and current fix status.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Fix Items" value={FIX_ITEMS.length} hint="Current plan" tone="brand" />
        <CyberStatCard label="Ready" value={ready} hint="Can start now" tone="green" />
        <CyberStatCard label="Need Approval" value={approval} hint="Client decision" tone="orange" />
        <CyberStatCard label="High Priority" value={highPriority} hint="Critical/high fixes" tone="red" />
      </section>

      <CyberTable
        title="Remediation Plan"
        description="Client-friendly fix plan with issue explanation, impact, owner, difficulty, and status."
        data={FIX_ITEMS}
        emptyText="No fix items available."
        columns={[
          {
            key: "issue",
            label: "Issue",
            render: (item) => (
              <div className="mx-auto min-w-72 text-center">
                <div className="font-semibold leading-6 text-white">{item.issue}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{item.meaning}</div>
              </div>
            ),
          },
          {
            key: "impact",
            label: "Business Impact",
            render: (item) => (
              <div className="mx-auto min-w-60 text-center text-sm leading-6 text-slate-400">{item.impact}</div>
            ),
          },
          {
            key: "fix",
            label: "Recommended Fix",
            render: (item) => (
              <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">{item.fix}</div>
            ),
          },
          {
            key: "difficulty",
            label: "Difficulty",
            render: (item) => <CyberStatusBadge value={item.difficulty} />,
          },
          {
            key: "owner",
            label: "Who Should Fix It",
            render: (item) => <div className="min-w-44 text-slate-300">{item.owner}</div>,
          },
          {
            key: "priority",
            label: "Priority",
            render: (item) => <CyberStatusBadge value={item.priority} />,
          },
          {
            key: "status",
            label: "Status",
            render: (item) => <CyberStatusBadge value={item.status} />,
          },
        ]}
      />
    </div>
  );
}
