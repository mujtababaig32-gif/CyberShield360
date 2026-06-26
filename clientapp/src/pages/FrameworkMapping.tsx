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
import { FrameworkMappingApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type Framework = {
  name: string;
  version: string;
  readiness: number;
  status: string;
  mappedControls: number;
  passedControls: number;
  failedControls: number;
};

type Control = {
  framework: string;
  controlId: string;
  title: string;
  domain: string;
  status: string;
  evidence: string;
  owner: string;
  gap: string;
};

type Gap = {
  framework: string;
  controlId: string;
  title: string;
  severity: string;
  owner: string;
  gap: string;
  recommendation: string;
};

type EvidenceMapping = {
  framework: string;
  controlId: string;
  title: string;
  evidenceSource: string;
  evidenceStatus: string;
  owner: string;
};

type FrameworkMappingSummary = {
  generatedUtc: string;
  totalFrameworks: number;
  averageReadiness: number;
  totalMappedControls: number;
  totalGaps: number;
  totalSecurityChecks: number;
  passedSecurityChecks: number;
  failedSecurityChecks: number;
  highCriticalFailed?: number;
  assetCoverage?: number;
  frameworks: Framework[];
  controls: Control[];
  gaps: Gap[];
  evidenceMappings: EvidenceMapping[];
  recommendations: string[];
  dataQuality?: {
    source?: string;
    note?: string;
  };
};

const TABS = ["Overview", "Frameworks", "Controls", "Gaps", "Evidence", "Export"];

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

function gapPriority(gap: Gap) {
  const severity = gap.severity.toLowerCase();

  if (severity.includes("critical")) return "Immediate";
  if (severity.includes("high")) return "Priority";
  if (severity.includes("medium")) return "Planned";

  return "Monitor";
}

function controlPriority(control: Control) {
  const status = control.status.toLowerCase();

  if (status.includes("missing") || status.includes("gap")) return "Priority";
  if (status.includes("partial") || status.includes("progress")) return "Planned";
  if (status.includes("implemented") || status.includes("mapped")) return "Ready";

  return "Review";
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

export default function FrameworkMapping() {
  const [data, setData] = useState<FrameworkMappingSummary | null>(null);
  const [tab, setTab] = useState("Overview");
  const [frameworkFilter, setFrameworkFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await FrameworkMappingApi.summary();
      setData(result);
    } catch {
      setError("Failed to load framework mapping.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const frameworkNames = useMemo(() => {
    if (!data) return [];
    return ["All", ...data.frameworks.map((item) => item.name)];
  }, [data]);

  const filteredControls = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    return data.controls.filter((item) => {
      const frameworkMatch = frameworkFilter === "All" || item.framework === frameworkFilter;
      const queryMatch =
        !q ||
        [item.framework, item.controlId, item.title, item.domain, item.status, item.owner]
          .join(" ")
          .toLowerCase()
          .includes(q);

      return frameworkMatch && queryMatch;
    });
  }, [data, frameworkFilter, query]);

  const filteredGaps = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    return data.gaps.filter((item) => {
      const frameworkMatch = frameworkFilter === "All" || item.framework === frameworkFilter;
      const queryMatch =
        !q ||
        [item.framework, item.controlId, item.title, item.severity, item.owner, item.gap]
          .join(" ")
          .toLowerCase()
          .includes(q);

      return frameworkMatch && queryMatch;
    });
  }, [data, frameworkFilter, query]);

  const filteredEvidence = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    return data.evidenceMappings.filter((item) => {
      const frameworkMatch = frameworkFilter === "All" || item.framework === frameworkFilter;
      const queryMatch =
        !q ||
        [item.framework, item.controlId, item.title, item.evidenceSource, item.owner]
          .join(" ")
          .toLowerCase()
          .includes(q);

      return frameworkMatch && queryMatch;
    });
  }, [data, frameworkFilter, query]);

  const exportControls = () => {
    if (!data) return;

    downloadCsv("cybershield360-framework-controls.csv", [
      ["Framework", "Control ID", "Title", "Domain", "Status", "Evidence", "Owner", "Gap"],
      ...data.controls.map((control) => [
        control.framework,
        control.controlId,
        control.title,
        control.domain,
        control.status,
        control.evidence,
        control.owner,
        control.gap,
      ]),
    ]);
  };

  const exportGaps = () => {
    if (!data) return;

    downloadCsv("cybershield360-framework-gaps.csv", [
      ["Framework", "Control ID", "Title", "Severity", "Owner", "Gap", "Recommendation"],
      ...data.gaps.map((gap) => [
        gap.framework,
        gap.controlId,
        gap.title,
        gap.severity,
        gap.owner,
        gap.gap,
        gap.recommendation,
      ]),
    ]);
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
        Loading framework mapping...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">
            Control Mapping
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Framework Mapping
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Map CyberShield360 findings and tenant records to ISO 27001, NIST CSF,
            SOC 2, and CIS Controls.
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

          <button type="button" onClick={exportControls} className="btn-primary">
            Export Controls
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard
          label="Average Readiness"
          value={`${data.averageReadiness}%`}
          hint={scoreStatus(data.averageReadiness)}
          tone={scoreTone(data.averageReadiness)}
        />
        <CyberStatCard
          label="Frameworks"
          value={data.totalFrameworks}
          hint="Mapped standards"
          tone="brand"
        />
        <CyberStatCard
          label="Mapped Controls"
          value={data.totalMappedControls}
          hint="Controls in scope"
          tone="green"
        />
        <CyberStatCard
          label="Open Gaps"
          value={data.totalGaps}
          hint="Need review"
          tone={data.totalGaps > 0 ? "orange" : "green"}
        />
        <CyberStatCard
          label="Asset Coverage"
          value={`${data.assetCoverage ?? 0}%`}
          hint="Evidence coverage"
          tone={scoreTone(data.assetCoverage ?? 0)}
        />
      </section>

      <ModuleTabs
        tabs={TABS.map((tabName) => ({ key: tabName, label: tabName }))}
        activeKey={tab}
        onChange={setTab}
      />

      {(tab === "Controls" || tab === "Gaps" || tab === "Evidence") && (
        <section className="card grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
          <select
            className="input"
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
          >
            {frameworkNames.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>

          <input
            className="input"
            placeholder="Search controls, owners, gaps..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </section>
      )}

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <CyberChartCard
                title="Framework Readiness"
                description="Readiness percentage across mapped compliance frameworks."
                insight={
                  data.frameworks.length > 0
                    ? "Use the lowest readiness scores to prioritize control evidence and remediation work."
                    : "No framework readiness data is available yet."
                }
              >
                {data.frameworks.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-sm text-slate-500">
                    No framework readiness data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.frameworks}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
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
                      <Bar dataKey="readiness" radius={[10, 10, 0, 0]} fill="#10B5A6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CyberChartCard>
            </div>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Security Evidence Summary
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Evidence quality from tenant security records.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  ["Total security checks", data.totalSecurityChecks],
                  ["Passed checks", data.passedSecurityChecks],
                  ["Failed checks", data.failedSecurityChecks],
                  ["High/Critical failed", data.highCriticalFailed ?? 0],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"
                  >
                    <span className="text-slate-400">{label}</span>
                    <span className="font-black text-white">{value}</span>
                  </div>
                ))}

                <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-wide text-brand-300">
                    Source
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-200">
                    {data.dataQuality?.source ?? "Tenant security records"}
                  </div>
                  {data.dataQuality?.note && (
                    <div className="mt-2 text-xs leading-5 text-slate-500">
                      {data.dataQuality.note}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </section>
        </div>
      )}

      {tab === "Frameworks" && (
        <CyberTable
          title="Framework Readiness"
          description="Framework-level mapping status, readiness score, and control coverage."
          data={data.frameworks}
          emptyText="No frameworks are available yet."
          columns={[
            {
              key: "framework",
              label: "Framework",
              render: (framework) => (
                <div className="mx-auto min-w-64 text-center">
                  <div className="font-semibold text-white">{framework.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{framework.version}</div>
                </div>
              ),
            },
            {
              key: "readiness",
              label: "Readiness",
              render: (framework) => (
                <div className="text-center">
                  <div className="text-2xl font-black text-white">
                    {framework.readiness}%
                  </div>
                  <div className="mx-auto mt-3 h-2 w-28 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${framework.readiness}%` }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (framework) => <CyberStatusBadge value={framework.status} />,
            },
            {
              key: "mapped",
              label: "Mapped",
              render: (framework) => (
                <div className="font-black text-white">{framework.mappedControls}</div>
              ),
            },
            {
              key: "passed",
              label: "Passed",
              render: (framework) => (
                <div className="font-black text-emerald-300">
                  {framework.passedControls}
                </div>
              ),
            },
            {
              key: "gaps",
              label: "Gaps",
              render: (framework) => (
                <div className="font-black text-orange-300">
                  {framework.failedControls}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Controls" && (
        <CyberTable
          title="Mapped Controls"
          description="Mapped controls with framework, domain, status, evidence owner, and priority."
          data={filteredControls}
          emptyText="No mapped controls match your filter."
          columns={[
            {
              key: "framework",
              label: "Framework",
              render: (control) => (
                <div className="font-semibold text-white">{control.framework}</div>
              ),
            },
            {
              key: "control",
              label: "Control",
              render: (control) => (
                <div className="mx-auto min-w-64 text-center">
                  <div className="font-semibold text-white">{control.controlId}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {control.title}
                  </div>
                </div>
              ),
            },
            {
              key: "domain",
              label: "Domain",
              render: (control) => (
                <div className="mx-auto min-w-48 break-all text-center text-slate-300">
                  {control.domain}
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (control) => <CyberStatusBadge value={control.status} />,
            },
            {
              key: "owner",
              label: "Owner",
              render: (control) => (
                <div className="min-w-40 text-slate-300">{control.owner}</div>
              ),
            },
            {
              key: "priority",
              label: "Priority",
              render: (control) => <CyberStatusBadge value={controlPriority(control)} />,
            },
          ]}
        />
      )}

      {tab === "Gaps" && (
        <CyberTable
          title="Gap Register"
          description="Open framework gaps with ownership, severity, and recommended action."
          data={filteredGaps}
          emptyText="No open framework gaps matched your filter."
          columns={[
            {
              key: "control",
              label: "Control",
              render: (gap) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">
                    {gap.controlId} · {gap.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{gap.framework}</div>
                </div>
              ),
            },
            {
              key: "severity",
              label: "Severity",
              render: (gap) => <CyberStatusBadge value={gap.severity} />,
            },
            {
              key: "owner",
              label: "Owner",
              render: (gap) => (
                <div className="min-w-40 text-slate-300">{gap.owner}</div>
              ),
            },
            {
              key: "gap",
              label: "Gap",
              render: (gap) => (
                <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">
                  {gap.gap}
                </div>
              ),
            },
            {
              key: "recommendation",
              label: "Recommended Action",
              render: (gap) => (
                <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                  {gap.recommendation}
                </div>
              ),
            },
            {
              key: "priority",
              label: "Priority",
              render: (gap) => <CyberStatusBadge value={gapPriority(gap)} />,
            },
          ]}
        />
      )}

      {tab === "Evidence" && (
        <CyberTable
          title="Evidence Mapping"
          description="Evidence sources, status, and owners for mapped controls."
          data={filteredEvidence}
          emptyText="No evidence mappings match your filter."
          columns={[
            {
              key: "framework",
              label: "Framework",
              render: (item) => (
                <div className="font-semibold text-white">{item.framework}</div>
              ),
            },
            {
              key: "control",
              label: "Control",
              render: (item) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">
                    {item.controlId}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {item.title}
                  </div>
                </div>
              ),
            },
            {
              key: "source",
              label: "Evidence Source",
              render: (item) => (
                <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">
                  {item.evidenceSource}
                </div>
              ),
            },
            {
              key: "status",
              label: "Evidence Status",
              render: (item) => <CyberStatusBadge value={item.evidenceStatus} />,
            },
            {
              key: "owner",
              label: "Owner",
              render: (item) => (
                <div className="min-w-40 text-slate-300">{item.owner}</div>
              ),
            },
          ]}
        />
      )}

      {tab === "Export" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">Control Mapping Export</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Download mapped controls, evidence sources, owners, and gaps.
            </p>
            <button type="button" onClick={exportControls} className="btn-primary mt-4">
              Download Controls CSV
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">Gap Register Export</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Download open gaps and recommended actions.
            </p>
            <button type="button" onClick={exportGaps} className="btn-primary mt-4">
              Download Gaps CSV
            </button>
          </section>
        </div>
      )}

      <div className="text-xs text-slate-400">
        Generated: {dateText(data.generatedUtc)}
      </div>
    </div>
  );
}
