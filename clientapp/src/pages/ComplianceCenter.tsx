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
import { ComplianceApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type FrameworkScore = {
  name: string;
  score: number;
  status: string;
};

type CategoryScore = {
  name: string;
  score: number;
};

type FailedControl = {
  domain: string;
  checkKey: string;
  title: string;
  severity: string;
  framework: string;
  control: string;
  recommendation: string;
};

type DomainCompliance = {
  domain: string;
  score: number;
  grade: string;
  completedUtc?: string;
  totalChecks?: number;
  failedChecks?: number;
};

type ComplianceSummary = {
  generatedUtc: string;
  assetCount: number;
  scannedAssets?: number;
  totalControls: number;
  passedControls: number;
  failedControlsCount: number;
  criticalFailed: number;
  highFailed: number;
  overallScore: number;
  frameworks: FrameworkScore[];
  domains: DomainCompliance[];
  categories: CategoryScore[];
  failedControls: FailedControl[];
  recommendations: string[];
  dataQuality?: {
    source?: string;
    assetsWithoutFullPostureScan?: number;
    note?: string;
  };
};

const TABS = [
  "Overview",
  "Frameworks",
  "Controls",
  "Assets",
  "Recommendations",
  "Export",
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

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
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

function controlPriority(control: FailedControl) {
  const severity = control.severity.toLowerCase();

  if (severity.includes("critical")) return "Immediate";
  if (severity.includes("high")) return "Priority";
  if (severity.includes("medium")) return "Planned";

  return "Monitor";
}

function DarkTooltip({ active, payload, label, suffix = "%" }: any) {
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
            <span className="font-black text-white">
              {item.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ComplianceCenter() {
  const [data, setData] = useState<ComplianceSummary | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await ComplianceApi.summary();
      setData(result);
    } catch {
      setError("Failed to load compliance center.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredControls = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    if (!q) return data.failedControls;

    return data.failedControls.filter((item) =>
      [
        item.domain,
        item.checkKey,
        item.title,
        item.framework,
        item.control,
        item.severity,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, query]);

  const exportControls = () => {
    if (!data) return;

    downloadCsv("cybershield360-compliance-controls.csv", [
      [
        "Domain",
        "Framework",
        "Control",
        "Check Key",
        "Title",
        "Severity",
        "Recommendation",
      ],
      ...data.failedControls.map((control) => [
        control.domain,
        control.framework,
        control.control,
        control.checkKey,
        control.title,
        control.severity,
        control.recommendation,
      ]),
    ]);
  };

  const exportFrameworks = () => {
    if (!data) return;

    downloadCsv("cybershield360-compliance-frameworks.csv", [
      ["Framework", "Score", "Status"],
      ...data.frameworks.map((framework) => [
        framework.name,
        framework.score,
        framework.status,
      ]),
    ]);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400 shadow-2xl shadow-black/10">
        Loading compliance center...
      </div>
    );
  }

  const frameworks = data.frameworks ?? [];
  const domains = data.domains ?? [];
  const categories = data.categories ?? [];
  const recommendations = data.recommendations ?? [];

  const scannedAssets = data.scannedAssets ?? domains.length;
  const unscanned =
    data.dataQuality?.assetsWithoutFullPostureScan ??
    Math.max(0, data.assetCount - scannedAssets);

  const highCritical = data.highFailed + data.criticalFailed;
  const passRate =
    data.totalControls > 0
      ? Math.round((data.passedControls / data.totalControls) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Risk & Trust
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Compliance Center
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Compliance readiness calculated from latest Full Posture scans,
              mapped control families, failed security checks, asset evidence,
              and tenant-level remediation recommendations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button type="button" onClick={exportControls} className="btn-primary">
              Export Controls
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard
          label="Overall Readiness"
          value={`${data.overallScore}%`}
          hint={scoreStatus(data.overallScore)}
          tone={scoreTone(data.overallScore)}
        />
        <CyberStatCard
          label="Assets in Scope"
          value={data.assetCount}
          hint={`${scannedAssets} with full scans`}
          tone="brand"
        />
        <CyberStatCard
          label="Controls Tested"
          value={data.totalControls}
          hint={`${data.passedControls} passed`}
          tone="green"
        />
        <CyberStatCard
          label="Rule Failures"
          value={data.failedControlsCount}
          hint="Require review"
          tone={data.failedControlsCount > 0 ? "red" : "green"}
        />
        <CyberStatCard
          label="High/Critical"
          value={highCritical}
          hint="Priority controls"
          tone={highCritical > 0 ? "orange" : "green"}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Pass Rate
          </div>
          <div className="mt-2 text-3xl font-black text-brand-300">{passRate}%</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Passed controls out of total tested controls.
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Critical Failed
          </div>
          <div className="mt-2 text-3xl font-black text-red-300">
            {data.criticalFailed}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Immediate remediation controls.
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            High Failed
          </div>
          <div className="mt-2 text-3xl font-black text-orange-300">
            {data.highFailed}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Priority controls for governance readiness.
          </div>
        </div>
      </section>

      {unscanned > 0 && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-center text-sm font-medium text-orange-300">
          {unscanned} asset(s) do not have a completed Full Posture scan yet.
          Run Full Posture scans to improve compliance confidence.
        </div>
      )}

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <CyberChartCard
                title="Control Category Readiness"
                description="Readiness score by compliance control category."
                insight={
                  categories.length > 0
                    ? "Use the lowest category scores to prioritize remediation planning."
                    : "Run Full Posture scans to populate control category readiness."
                }
              >
                {categories.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-center text-sm text-slate-500">
                    No category readiness data available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                      />
                      <Tooltip
                        content={<DarkTooltip suffix="%" />}
                        cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                      />
                      <Bar
                        dataKey="score"
                        name="Readiness"
                        radius={[10, 10, 0, 0]}
                        fill="#10B5A6"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CyberChartCard>
            </div>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Framework Readiness
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Current readiness across mapped frameworks.
                </p>
              </div>

              <div className="space-y-3">
                {frameworks.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No framework readiness data available.
                  </div>
                ) : (
                  frameworks.map((framework) => (
                    <div
                      key={framework.name}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="font-black text-white">{framework.name}</div>

                      <div className="mt-2 text-3xl font-black text-white">
                        {framework.score}%
                      </div>

                      <div className="mx-auto mt-3 h-2 w-full max-w-48 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${framework.score}%` }}
                        />
                      </div>

                      <div className="mt-3 flex justify-center">
                        <CyberStatusBadge value={framework.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
            <h2 className="text-xl font-black text-white">Compliance Confidence</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Compliance readiness becomes more accurate when every asset has a completed Full Posture scan and failed controls are tied to real remediation evidence.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Data Source
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  {data.dataQuality?.source ?? "Latest tenant security records"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Evidence Coverage
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-300">
                  {scannedAssets}/{data.assetCount} assets scanned
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Next Step
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-300">
                  Fix failed controls, rescan, and export evidence.
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "Frameworks" && (
        <CyberTable
          title="Framework Readiness"
          description="Framework-level readiness derived from mapped scan control families."
          data={frameworks}
          emptyText="No framework readiness data available."
          columns={[
            {
              key: "framework",
              label: "Framework",
              render: (framework) => (
                <div className="mx-auto min-w-64 text-center font-semibold text-white">
                  {framework.name}
                </div>
              ),
            },
            {
              key: "score",
              label: "Score",
              render: (framework) => (
                <div className="text-center">
                  <div className="text-2xl font-black text-white">
                    {framework.score}%
                  </div>
                  <div className="mx-auto mt-3 h-2 w-28 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${framework.score}%` }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (framework) => (
                <div className="flex justify-center">
                  <CyberStatusBadge value={framework.status} />
                </div>
              ),
            },
            {
              key: "readiness",
              label: "Readiness",
              render: (framework) => (
                <div className="flex justify-center">
                  <CyberStatusBadge value={scoreStatus(framework.score)} />
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Controls" && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Search Controls
            </label>
            <input
              className="input mt-3"
              placeholder="Search domain, control, framework, severity..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </section>

          <CyberTable
            title="Priority Controls Requiring Review"
            description="Failed controls are shown first to support remediation and audit planning."
            data={filteredControls}
            emptyText="No failed compliance controls matched your filter."
            columns={[
              {
                key: "control",
                label: "Control",
                render: (item) => (
                  <div className="mx-auto min-w-72 text-center">
                    <div className="font-semibold leading-6 text-white">
                      {item.control}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.framework} · {item.checkKey}
                    </div>
                  </div>
                ),
              },
              {
                key: "domain",
                label: "Domain",
                render: (item) => (
                  <div className="mx-auto min-w-56 break-all text-center text-slate-300">
                    {item.domain}
                  </div>
                ),
              },
              {
                key: "severity",
                label: "Severity",
                render: (item) => (
                  <div className="flex justify-center">
                    <CyberStatusBadge value={item.severity} />
                  </div>
                ),
              },
              {
                key: "issue",
                label: "Issue",
                render: (item) => (
                  <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">
                    {item.title}
                  </div>
                ),
              },
              {
                key: "recommendation",
                label: "Recommended Fix",
                render: (item) => (
                  <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                    {item.recommendation}
                  </div>
                ),
              },
              {
                key: "priority",
                label: "Priority",
                render: (item) => (
                  <div className="flex justify-center">
                    <CyberStatusBadge value={controlPriority(item)} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {tab === "Assets" && (
        <CyberTable
          title="Asset Compliance Ranking"
          description="Asset-level compliance score, grade, check count, and latest Full Posture evidence."
          data={domains}
          emptyText="No completed Full Posture scans found yet."
          columns={[
            {
              key: "domain",
              label: "Domain",
              render: (domain) => (
                <div className="mx-auto min-w-64 break-all text-center font-semibold text-white">
                  {domain.domain}
                </div>
              ),
            },
            {
              key: "score",
              label: "Score",
              render: (domain) => (
                <div className="text-center">
                  <div className="text-2xl font-black text-white">{domain.score}%</div>
                  <div className="mt-2 flex justify-center">
                    <CyberStatusBadge value={scoreStatus(domain.score)} />
                  </div>
                </div>
              ),
            },
            {
              key: "grade",
              label: "Grade",
              render: (domain) => (
                <div className="flex justify-center">
                  <CyberStatusBadge value={`Grade ${domain.grade}`} />
                </div>
              ),
            },
            {
              key: "checks",
              label: "Checks",
              render: (domain) => (
                <div className="text-center font-black text-white">
                  {domain.totalChecks ?? "-"}
                </div>
              ),
            },
            {
              key: "failed",
              label: "Failed",
              render: (domain) => (
                <div className="text-center font-black text-red-300">
                  {domain.failedChecks ?? "-"}
                </div>
              ),
            },
            {
              key: "last",
              label: "Last Full Scan",
              render: (domain) => (
                <div className="mx-auto min-w-48 whitespace-nowrap text-center text-slate-400">
                  {dateText(domain.completedUtc)}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Recommendations" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Compliance Recommendations
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Priority actions to improve audit readiness and reduce failed controls.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {recommendations.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-500 lg:col-span-2">
                No compliance recommendations available.
              </div>
            ) : (
              recommendations.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
                >
                  <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                    Priority #{index + 1}
                  </div>
                  <div className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                    {item}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {tab === "Export" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">Compliance Controls CSV</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Export failed controls with framework mappings and remediation recommendations.
            </p>
            <button type="button" onClick={exportControls} className="btn-primary mt-4">
              Download Controls CSV
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">Framework Readiness CSV</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Export framework readiness percentages and status labels.
            </p>
            <button type="button" onClick={exportFrameworks} className="btn-primary mt-4">
              Download Frameworks CSV
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10 md:col-span-2">
            <h2 className="font-black text-white">Data Source</h2>
            <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {data.dataQuality?.source ?? "Latest tenant security records"}
            </p>
            {data.dataQuality?.note && (
              <p className="mx-auto mt-2 max-w-3xl text-xs leading-5 text-slate-500">
                {data.dataQuality.note}
              </p>
            )}
          </section>
        </div>
      )}

      <div className="text-center text-xs text-slate-500">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
      </div>
    </div>
  );
}