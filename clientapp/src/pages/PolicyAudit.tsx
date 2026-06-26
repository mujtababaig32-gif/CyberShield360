import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PolicyAuditApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type Policy = {
  id: string;
  title: string;
  owner: string;
  category: string;
  status: string;
  version: string;
  lastReviewedUtc: string;
  nextReviewUtc: string;
  acknowledgementRate: number;
};

type Evidence = {
  id: string;
  name: string;
  control: string;
  type: string;
  status: string;
  owner: string;
  collectedUtc?: string | null;
};

type Audit = {
  id: string;
  name: string;
  framework: string;
  status: string;
  readiness: number;
  openFindings: number;
  dueDateUtc: string;
};

type Finding = {
  id: string;
  title: string;
  severity: string;
  status: string;
  owner: string;
  recommendation: string;
};

type PolicyAuditSummary = {
  generatedUtc: string;
  totalPolicies: number;
  approvedPolicies: number;
  policiesNeedingReview: number;
  evidenceCollected: number;
  evidenceMissing: number;
  activeAudits: number;
  averageAuditReadiness: number;
  usersInScope: number;
  assetsInScope: number;
  policies: Policy[];
  evidence: Evidence[];
  audits: Audit[];
  findings: Finding[];
  recommendations: string[];
  dataQuality?: {
    fullScanCoverage?: number;
    avgScanScore?: number;
    source?: string;
  };
};

const TABS = [
  "Overview",
  "Policies",
  "Evidence",
  "Audits",
  "Findings",
  "Reports",
  "Settings",
];

function scoreTone(score: number): "green" | "orange" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "orange";
  return "red";
}

function scoreStatus(score: number) {
  if (score >= 85) return "Ready";
  if (score >= 70) return "Managed";
  if (score >= 50) return "Needs Review";
  return "High Risk";
}

function findingPriority(finding: Finding) {
  const severity = finding.severity.toLowerCase();

  if (severity.includes("critical")) return "Immediate";
  if (severity.includes("high")) return "Priority";
  if (severity.includes("medium")) return "Planned";

  return "Monitor";
}

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function dateOnly(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PolicyAudit() {
  const [data, setData] = useState<PolicyAuditSummary | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await PolicyAuditApi.summary();
      setData(result);
    } catch {
      setError("Failed to load policy audit manager.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredPolicies = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    if (!q) return data.policies;

    return data.policies.filter((policy) =>
      [policy.title, policy.owner, policy.category, policy.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, query]);

  const evidenceChartData = useMemo(() => {
    if (!data) return [];

    return [
      { category: "Collected", count: data.evidenceCollected },
      { category: "Missing", count: data.evidenceMissing },
    ];
  }, [data]);

  const exportPolicies = () => {
    if (!data) return;

    downloadCsv("cybershield360-policy-register.csv", [
      [
        "Policy",
        "Owner",
        "Category",
        "Status",
        "Version",
        "Acknowledgement",
        "Last Reviewed",
        "Next Review",
      ],
      ...data.policies.map((policy) => [
        policy.title,
        policy.owner,
        policy.category,
        policy.status,
        policy.version,
        `${policy.acknowledgementRate}%`,
        policy.lastReviewedUtc,
        policy.nextReviewUtc,
      ]),
    ]);
  };

  const exportEvidence = () => {
    if (!data) return;

    downloadCsv("cybershield360-evidence-register.csv", [
      ["Evidence", "Control", "Type", "Status", "Owner", "Collected UTC"],
      ...data.evidence.map((item) => [
        item.name,
        item.control,
        item.type,
        item.status,
        item.owner,
        item.collectedUtc ?? "",
      ]),
    ]);
  };

  const saveSetting = (name: string) => {
    localStorage.setItem(`cs360_policy_audit_${name}`, "enabled");
    setSettingsMessage(`${name} saved locally for this workspace.`);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="card text-sm text-slate-500">
        Loading policy audit manager...
      </div>
    );
  }

  const evidenceTotal = Math.max(1, data.evidence.length);
  const evidenceCoverage = Math.round((data.evidenceCollected * 100) / evidenceTotal);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">
            Audit Readiness
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Policy & Audit Manager
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Manage policy readiness, evidence coverage, audit findings, and governance actions using tenant security records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-ghost disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button type="button" onClick={exportPolicies} className="btn-primary">
            Export Policies
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard
          label="Audit Readiness"
          value={`${data.averageAuditReadiness}%`}
          hint={scoreStatus(data.averageAuditReadiness)}
          tone={scoreTone(data.averageAuditReadiness)}
        />
        <CyberStatCard
          label="Policies"
          value={data.totalPolicies}
          hint={`${data.approvedPolicies} approved`}
          tone="brand"
        />
        <CyberStatCard
          label="Need Review"
          value={data.policiesNeedingReview}
          hint="Policy updates required"
          tone={data.policiesNeedingReview > 0 ? "red" : "green"}
        />
        <CyberStatCard
          label="Evidence Missing"
          value={data.evidenceMissing}
          hint={`${data.evidenceCollected} collected`}
          tone={data.evidenceMissing > 0 ? "orange" : "green"}
        />
        <CyberStatCard
          label="Scope"
          value={data.assetsInScope}
          hint={`${data.usersInScope} users in scope`}
          tone="brand"
        />
      </section>

      <ModuleTabs
        tabs={TABS.map((tabName) => ({ key: tabName, label: tabName }))}
        activeKey={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <CyberChartCard
                title="Evidence Coverage"
                description="Collected versus missing evidence across the current audit workspace."
                insight={
                  data.evidenceMissing > 0
                    ? `${data.evidenceMissing} evidence item(s) still need collection or owner follow-up.`
                    : "Evidence coverage is complete for the current audit workspace."
                }
              >
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={evidenceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "14px",
                        color: "#e2e8f0",
                        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
                      }}
                      labelStyle={{
                        color: "#99f6e4",
                        fontWeight: 800,
                      }}
                      itemStyle={{
                        color: "#e2e8f0",
                      }}
                    />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#10B5A6" />
                  </BarChart>
                </ResponsiveContainer>
              </CyberChartCard>
            </div>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Governance Recommendations
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Priority actions for audit preparation.
                </p>
              </div>

              <div className="space-y-3">
                {data.recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No urgent governance recommendations.
                  </div>
                ) : (
                  data.recommendations.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                        Recommendation #{index + 1}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                        {item}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Evidence Coverage
                </div>
                <div className="mt-2 text-3xl font-black text-white">
                  {evidenceCoverage}%
                </div>
                <div className="mx-auto mt-3 h-2 max-w-40 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${evidenceCoverage}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Full Scan Coverage
                </div>
                <div className="mt-2 text-3xl font-black text-white">
                  {data.dataQuality?.fullScanCoverage ?? 0}%
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Average scan score: {data.dataQuality?.avgScanScore ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-center">
                <div className="text-xs font-black uppercase tracking-wide text-brand-300">
                  Data Source
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-200">
                  {data.dataQuality?.source ?? "Tenant records"}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Generated: {dateText(data.generatedUtc)}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "Policies" && (
        <div className="space-y-6">
          <section className="card">
            <input
              className="input"
              placeholder="Search policies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </section>

          <CyberTable
            title="Policy Register"
            description="Policy ownership, category, status, version, acknowledgement, and next review date."
            data={filteredPolicies}
            emptyText="No policies match the current search."
            columns={[
              {
                key: "policy",
                label: "Policy",
                render: (policy) => (
                  <div className="mx-auto min-w-72 text-center">
                    <div className="font-semibold leading-6 text-white">
                      {policy.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Last reviewed: {dateOnly(policy.lastReviewedUtc)}
                    </div>
                  </div>
                ),
              },
              {
                key: "owner",
                label: "Owner",
                render: (policy) => (
                  <div className="min-w-40 text-slate-300">{policy.owner}</div>
                ),
              },
              {
                key: "category",
                label: "Category",
                render: (policy) => (
                  <div className="min-w-40 text-slate-300">{policy.category}</div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (policy) => <CyberStatusBadge value={policy.status} />,
              },
              {
                key: "version",
                label: "Version",
                render: (policy) => (
                  <div className="font-semibold text-white">{policy.version}</div>
                ),
              },
              {
                key: "acknowledgement",
                label: "Acknowledgement",
                render: (policy) => (
                  <div className="font-semibold text-white">
                    {policy.acknowledgementRate}%
                  </div>
                ),
              },
              {
                key: "next",
                label: "Next Review",
                render: (policy) => (
                  <div className="whitespace-nowrap text-slate-400">
                    {dateOnly(policy.nextReviewUtc)}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {tab === "Evidence" && (
        <CyberTable
          title="Evidence Register"
          description="Audit evidence status, control mapping, evidence type, owner, and collection date."
          data={data.evidence}
          emptyText="No evidence records available."
          columns={[
            {
              key: "evidence",
              label: "Evidence",
              render: (item) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold leading-6 text-white">{item.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.control} · {item.type}
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (item) => <CyberStatusBadge value={item.status} />,
            },
            {
              key: "owner",
              label: "Owner",
              render: (item) => (
                <div className="min-w-40 text-slate-300">{item.owner}</div>
              ),
            },
            {
              key: "collected",
              label: "Collected",
              render: (item) => (
                <div className="whitespace-nowrap text-slate-400">
                  {item.collectedUtc ? dateText(item.collectedUtc) : "Not collected"}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Audits" && (
        <CyberTable
          title="Audit Register"
          description="Active audit readiness, framework, open findings, and due dates."
          data={data.audits}
          emptyText="No audits available."
          columns={[
            {
              key: "audit",
              label: "Audit",
              render: (audit) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{audit.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{audit.framework}</div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (audit) => <CyberStatusBadge value={audit.status} />,
            },
            {
              key: "readiness",
              label: "Readiness",
              render: (audit) => (
                <div className="text-center">
                  <div className="text-2xl font-black text-white">
                    {audit.readiness}%
                  </div>
                  <div className="mx-auto mt-3 h-2 w-28 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${audit.readiness}%` }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "findings",
              label: "Open Findings",
              render: (audit) => (
                <div className="font-black text-orange-300">
                  {audit.openFindings}
                </div>
              ),
            },
            {
              key: "due",
              label: "Due Date",
              render: (audit) => (
                <div className="whitespace-nowrap text-slate-400">
                  {dateOnly(audit.dueDateUtc)}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Findings" && (
        <CyberTable
          title="Audit Findings"
          description="Open audit findings, ownership, status, severity, and recommended action."
          data={data.findings}
          emptyText="No open audit findings."
          columns={[
            {
              key: "finding",
              label: "Finding",
              render: (finding) => (
                <div className="mx-auto min-w-72 text-center font-semibold leading-6 text-white">
                  {finding.title}
                </div>
              ),
            },
            {
              key: "severity",
              label: "Severity",
              render: (finding) => <CyberStatusBadge value={finding.severity} />,
            },
            {
              key: "status",
              label: "Status",
              render: (finding) => <CyberStatusBadge value={finding.status} />,
            },
            {
              key: "owner",
              label: "Owner",
              render: (finding) => (
                <div className="min-w-40 text-slate-300">{finding.owner}</div>
              ),
            },
            {
              key: "recommendation",
              label: "Recommended Action",
              render: (finding) => (
                <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                  {finding.recommendation}
                </div>
              ),
            },
            {
              key: "priority",
              label: "Priority",
              render: (finding) => <CyberStatusBadge value={findingPriority(finding)} />,
            },
          ]}
        />
      )}

      {tab === "Reports" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">Policy Register Export</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Download current policy status, ownership, versions, and review dates.
            </p>
            <button type="button" onClick={exportPolicies} className="btn-primary mt-4">
              Download CSV
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">Evidence Register Export</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Download audit evidence status and ownership mapping.
            </p>
            <button type="button" onClick={exportEvidence} className="btn-primary mt-4">
              Download CSV
            </button>
          </section>
        </div>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Policy Audit Settings
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Recommended governance controls for stronger audit preparation.
            </p>
          </div>

          {settingsMessage && (
            <div className="mb-4 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-medium text-brand-300">
              {settingsMessage}
            </div>
          )}

          <div className="space-y-3">
            {[
              "Quarterly policy reviews",
              "Evidence owner reminders",
              "Audit readiness alerts",
            ].map((setting) => (
              <div
                key={setting}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-center sm:text-left">
                  <div className="font-semibold text-white">{setting}</div>
                  <div className="text-sm text-slate-500">
                    Recommended control for stronger audit preparation.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => saveSetting(setting)}
                  className="btn-primary"
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
