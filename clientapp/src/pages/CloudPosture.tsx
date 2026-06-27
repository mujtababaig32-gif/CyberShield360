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
import { CloudPostureApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type CloudAccount = {
  id: string;
  provider: string;
  accountName: string;
  accountId: string;
  status: string;
  postureScore: number;
  regionCount: number;
  lastScannedUtc?: string | null;
};

type CloudFinding = {
  id: string;
  provider: string;
  resource: string;
  category: string;
  title: string;
  severity: string;
  status: string;
  recommendation: string;
};

type Integration = {
  provider: string;
  status: string;
  method: string;
};

type CloudSummary = {
  generatedUtc: string;
  connectedAccounts: number;
  totalAccounts: number;
  averagePostureScore: number;
  openFindings: number;
  highFindings: number;
  iamRiskCount: number;
  storageRiskCount: number;
  networkRiskCount: number;
  assetsInScope: number;
  connectorMode?: string;
  evidenceQuality?: string;
  accounts: CloudAccount[];
  findings: CloudFinding[];
  iamRisks: CloudFinding[];
  storageRisks: CloudFinding[];
  networkRisks: CloudFinding[];
  recommendations: string[];
  integrations: Integration[];
};

const TABS = [
  "Overview",
  "Accounts",
  "Findings",
  "IAM",
  "Storage",
  "Network",
  "Reports",
  "Settings",
];

const SEVERITIES = ["All", "Critical", "High", "Medium", "Low", "Info"];

function scoreTone(score: number): "green" | "orange" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "orange";
  return "red";
}

function scoreStatus(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Managed";
  if (score >= 50) return "Needs Review";
  return "High Risk";
}

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not scanned";
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

function findingPriority(finding: CloudFinding) {
  if (finding.severity === "Critical") return "Immediate";
  if (finding.severity === "High") return "Priority";
  if (finding.severity === "Medium") return "Planned";
  return "Monitor";
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-slate-950/95 px-4 py-3 text-sm shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-brand-300">
        {label}
      </div>

      <div className="space-y-1">
        {payload.map((item: any) => (
          <div
            key={`${item.dataKey}-${item.value}`}
            className="flex items-center justify-between gap-5 text-slate-300"
          >
            <span className="capitalize">{item.name || item.dataKey}</span>
            <span className="font-black text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CloudPosture() {
  const [data, setData] = useState<CloudSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("All");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await CloudPostureApi.summary();
      setData(result);
    } catch {
      setError("Failed to load cloud posture.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredFindings = useMemo(() => {
    if (!data) return [];

    const q = search.trim().toLowerCase();

    return data.findings.filter((finding) => {
      const matchesSeverity = severity === "All" || finding.severity === severity;
      const text = `${finding.title} ${finding.provider} ${finding.resource} ${finding.category} ${finding.recommendation}`.toLowerCase();

      return matchesSeverity && (!q || text.includes(q));
    });
  }, [data, search, severity]);

  const riskBreakdown = useMemo(() => {
    if (!data) return [];

    return [
      { category: "IAM", count: data.iamRiskCount },
      { category: "Storage", count: data.storageRiskCount },
      { category: "Network", count: data.networkRiskCount },
    ];
  }, [data]);

  const exportFindings = () => {
    if (!data) return;

    const rows = [
      ["Provider", "Resource", "Category", "Title", "Severity", "Status", "Recommendation"],
      ...filteredFindings.map((finding) => [
        finding.provider,
        finding.resource,
        finding.category,
        finding.title,
        finding.severity,
        finding.status,
        finding.recommendation,
      ]),
    ];

    downloadTextFile(
      "cybershield360-cloud-posture-findings.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );
  };

  const renderFindingsTable = (
    items: CloudFinding[],
    title: string,
    description: string,
    emptyText = "No findings in this view."
  ) => (
    <CyberTable
      title={title}
      description={description}
      data={items}
      emptyText={emptyText}
      columns={[
        {
          key: "finding",
          label: "Finding",
          render: (finding) => (
            <div className="mx-auto min-w-72 text-center">
              <div className="font-semibold leading-6 text-white">{finding.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                {finding.provider} · {finding.category}
              </div>
            </div>
          ),
        },
        {
          key: "resource",
          label: "Resource",
          render: (finding) => (
            <div className="mx-auto min-w-64 break-all text-center text-slate-300">
              {finding.resource}
            </div>
          ),
        },
        {
          key: "severity",
          label: "Severity",
          render: (finding) => (
            <div className="flex justify-center">
              <CyberStatusBadge value={finding.severity} />
            </div>
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (finding) => (
            <div className="flex justify-center">
              <CyberStatusBadge value={finding.status} />
            </div>
          ),
        },
        {
          key: "recommendation",
          label: "Recommended Fix",
          render: (finding) => (
            <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
              {finding.recommendation}
            </div>
          ),
        },
        {
          key: "priority",
          label: "Priority",
          render: (finding) => (
            <div className="flex justify-center">
              <CyberStatusBadge value={findingPriority(finding)} />
            </div>
          ),
        },
      ]}
    />
  );

  if (loading && !data) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400 shadow-2xl shadow-black/10">
        Loading cloud posture...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const accounts = data.accounts ?? [];
  const findings = data.findings ?? [];
  const iamRisks = data.iamRisks ?? [];
  const storageRisks = data.storageRisks ?? [];
  const networkRisks = data.networkRisks ?? [];
  const recommendations = data.recommendations ?? [];
  const integrations = data.integrations ?? [];

  const connectionRate =
    data.totalAccounts > 0
      ? Math.round((data.connectedAccounts / data.totalAccounts) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Attack Surface
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Cloud Security Posture
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              AWS, Azure, and GCP readiness with evidence from connected cloud sources,
              tenant scan signals, IAM posture, storage exposure, and network risk.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} disabled={loading} className="btn-ghost">
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button type="button" onClick={exportFindings} className="btn-primary">
              Export Findings
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-brand-500/20 bg-brand-500/10 p-5 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-brand-300">
              Connector Status
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {data.connectorMode ?? "Cloud connectors not connected"}
            </div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              {data.evidenceQuality ??
                "Cloud findings are limited until provider integrations are configured."}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-slate-500">
            Generated
            <div className="mt-1 font-semibold text-slate-300">
              {new Date(data.generatedUtc).toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard
          label="Connected Accounts"
          value={`${data.connectedAccounts}/${data.totalAccounts}`}
          hint="Cloud accounts linked"
          tone={data.connectedAccounts > 0 ? "green" : "orange"}
        />
        <CyberStatCard
          label="Cloud Score"
          value={`${data.averagePostureScore}/100`}
          hint={scoreStatus(data.averagePostureScore)}
          tone={scoreTone(data.averagePostureScore)}
        />
        <CyberStatCard
          label="Open Findings"
          value={data.openFindings}
          hint="Needs review"
          tone={data.openFindings > 0 ? "red" : "green"}
        />
        <CyberStatCard
          label="High/Critical"
          value={data.highFindings}
          hint="Priority cloud risks"
          tone={data.highFindings > 0 ? "orange" : "green"}
        />
        <CyberStatCard
          label="Assets in Scope"
          value={data.assetsInScope}
          hint="Cloud-linked assets"
          tone="brand"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Connection Rate
          </div>
          <div className="mt-2 text-3xl font-black text-brand-300">
            {connectionRate}%
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Connected cloud accounts out of total configured accounts.
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            IAM Risks
          </div>
          <div className="mt-2 text-3xl font-black text-orange-300">
            {data.iamRiskCount}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Identity and access issues requiring review.
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Total Findings
          </div>
          <div className="mt-2 text-3xl font-black text-white">
            {findings.length}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Current cloud posture findings in scope.
          </div>
        </div>
      </section>

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CyberChartCard
                title="Cloud Risk Breakdown"
                description="Risk categories currently affecting cloud posture."
                insight={
                  data.highFindings > 0
                    ? `${data.highFindings} high-priority cloud finding(s) should be reviewed first.`
                    : "No high-priority cloud findings are currently reported."
                }
              >
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={riskBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      content={<DarkTooltip />}
                      cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                    />
                    <Bar
                      dataKey="count"
                      name="Findings"
                      radius={[10, 10, 0, 0]}
                      fill="#10B5A6"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CyberChartCard>
            </div>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Recommended Actions
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Priority actions to improve cloud security posture.
                </p>
              </div>

              <div className="space-y-3">
                {recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No cloud-specific remediation actions are available yet.
                  </div>
                ) : (
                  recommendations.map((recommendation, index) => (
                    <div
                      key={`${recommendation}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Action #{index + 1}
                      </div>
                      <div className="text-sm font-medium leading-6 text-slate-300">
                        {recommendation}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      )}

      {tab === "Accounts" && (
        <CyberTable
          title="Cloud Accounts"
          description="Connected cloud accounts, provider status, score, regions, and last scan evidence."
          data={accounts}
          emptyText="No cloud accounts available yet."
          columns={[
            {
              key: "account",
              label: "Account",
              render: (account) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{account.accountName}</div>
                  <div className="mt-1 break-all text-xs text-slate-500">
                    {account.provider} · {account.accountId}
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (account) => (
                <div className="flex justify-center">
                  <CyberStatusBadge value={account.status} />
                </div>
              ),
            },
            {
              key: "score",
              label: "Posture Score",
              render: (account) => (
                <div className="text-center">
                  <div className="font-black text-white">{account.postureScore}/100</div>
                  <div className="mt-2 flex justify-center">
                    <CyberStatusBadge value={scoreStatus(account.postureScore)} />
                  </div>
                </div>
              ),
            },
            {
              key: "regions",
              label: "Regions",
              render: (account) => (
                <div className="text-center font-black text-white">{account.regionCount}</div>
              ),
            },
            {
              key: "last",
              label: "Last Scanned",
              render: (account) => (
                <div className="mx-auto min-w-48 whitespace-nowrap text-center text-slate-400">
                  {dateText(account.lastScannedUtc)}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Findings" && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Search Findings
                </label>
                <input
                  className="input mt-2"
                  placeholder="Search findings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Severity
                </label>
                <select
                  className="input mt-2"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {SEVERITIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {renderFindingsTable(
            filteredFindings,
            "Cloud Findings",
            "Cloud posture findings with provider evidence, severity, status, and recommended fixes.",
            "No cloud findings match the current filters."
          )}
        </div>
      )}

      {tab === "IAM" &&
        renderFindingsTable(
          iamRisks,
          "IAM Risks",
          "Identity and access risks that may affect cloud account security.",
          "No IAM risks in this view."
        )}

      {tab === "Storage" &&
        renderFindingsTable(
          storageRisks,
          "Storage Risks",
          "Storage exposure and access risks that may affect sensitive cloud data.",
          "No storage risks in this view."
        )}

      {tab === "Network" &&
        renderFindingsTable(
          networkRisks,
          "Network Exposure",
          "Network-facing cloud findings that may increase external exposure.",
          "No network exposure findings in this view."
        )}

      {tab === "Reports" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Cloud Reports
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Export cloud posture findings and review readiness areas.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["Cloud Posture Export", "Exports current cloud posture findings."],
              ["IAM Risk Review", "Use the IAM tab to review identity-related risks."],
              ["Connector Readiness", "Use Settings to configure provider integrations."],
            ].map(([titleText, body]) => (
              <div
                key={titleText}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
              >
                <div className="font-black text-white">{titleText}</div>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{body}</p>
                <button type="button" onClick={exportFindings} className="btn-primary mt-4">
                  Export CSV
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Cloud Integration Settings
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Configure provider credentials through environment variables before enabling
              production cloud posture scans.
            </p>
          </div>

          <CyberTable
            title="Provider Integrations"
            description="Cloud provider connection readiness and supported integration method."
            data={integrations}
            emptyText="No cloud integrations are configured yet."
            columns={[
              {
                key: "provider",
                label: "Provider",
                render: (integration) => (
                  <div className="mx-auto min-w-40 text-center font-semibold text-white">
                    {integration.provider}
                  </div>
                ),
              },
              {
                key: "method",
                label: "Method",
                render: (integration) => (
                  <div className="mx-auto min-w-72 text-center text-slate-400">
                    {integration.method}
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (integration) => (
                  <div className="flex justify-center">
                    <CyberStatusBadge value={integration.status} />
                  </div>
                ),
              },
            ]}
          />
        </section>
      )}
    </div>
  );
}