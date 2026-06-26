import { useEffect, useMemo, useState } from "react";
import { FrameworkMappingApi } from "../api/endpoints";

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

function scoreTone(score: number) {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-yellow-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

function scoreBar(score: number) {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 50) return "bg-orange-500";
  return "bg-red-500";
}

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("implemented") || v.includes("mapped") || v.includes("ready")) return "bg-emerald-600";
  if (v.includes("partial") || v.includes("progress") || v.includes("needs evidence")) return "bg-orange-500";
  if (v.includes("missing") || v.includes("gap") || v.includes("review")) return "bg-red-600";
  return "bg-slate-600";
}

function severityColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("high")) return "bg-red-600";
  if (v.includes("medium")) return "bg-orange-500";
  return "bg-yellow-500";
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
    load();
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
      const queryMatch = !q || [item.framework, item.controlId, item.title, item.domain, item.status, item.owner]
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
      const queryMatch = !q || [item.framework, item.controlId, item.title, item.severity, item.owner, item.gap]
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
      ...data.controls.map((c) => [c.framework, c.controlId, c.title, c.domain, c.status, c.evidence, c.owner, c.gap]),
    ]);
  };

  const exportGaps = () => {
    if (!data) return;

    downloadCsv("cybershield360-framework-gaps.csv", [
      ["Framework", "Control ID", "Title", "Severity", "Owner", "Gap", "Recommendation"],
      ...data.gaps.map((g) => [g.framework, g.controlId, g.title, g.severity, g.owner, g.gap, g.recommendation]),
    ]);
  };

  if (error) {
    return <div className="card border-red-500/30 bg-red-500/10 text-red-500">{error}</div>;
  }

  if (loading || !data) {
    return <div className="card text-sm text-slate-500">Loading framework mapping...</div>;
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Control Mapping</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Framework Mapping</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Map CyberShield360 findings and tenant records to ISO 27001, NIST CSF, SOC 2, and CIS Controls.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="btn-ghost disabled:opacity-50">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={exportControls} className="btn-primary">Export Controls</button>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card">
          <div className="text-xs text-slate-500">Average Readiness</div>
          <div className={`mt-1 text-4xl font-black ${scoreTone(data.averageReadiness)}`}>{data.averageReadiness}%</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Frameworks</div>
          <div className="mt-1 text-4xl font-black">{data.totalFrameworks}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Mapped Controls</div>
          <div className="mt-1 text-4xl font-black">{data.totalMappedControls}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Open Gaps</div>
          <div className="mt-1 text-4xl font-black text-orange-500">{data.totalGaps}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Asset Coverage</div>
          <div className={`mt-1 text-4xl font-black ${scoreTone(data.assetCoverage ?? 0)}`}>{data.assetCoverage ?? 0}%</div>
        </div>
      </section>

      <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />

      {(tab === "Controls" || tab === "Gaps" || tab === "Evidence") && (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <select className="input max-w-xs" value={frameworkFilter} onChange={(e) => setFrameworkFilter(e.target.value)}>
            {frameworkNames.map((name) => <option key={name}>{name}</option>)}
          </select>
          <input className="input max-w-md" placeholder="Search controls, owners, gaps..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <h2 className="mb-4 font-bold">Framework Readiness</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.frameworks.map((item) => (
                <div key={item.name} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.version}</div>
                    </div>
                    <span className={`badge ${badgeColor(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="mt-4 flex items-end gap-2">
                    <span className={`text-4xl font-black ${scoreTone(item.readiness)}`}>{item.readiness}%</span>
                    <span className="pb-1 text-xs text-slate-500">readiness</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={`h-2 rounded-full ${scoreBar(item.readiness)}`} style={{ width: `${item.readiness}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 font-bold">Security Evidence Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Total security checks</span><span className="font-bold">{data.totalSecurityChecks}</span></div>
              <div className="flex justify-between"><span>Passed checks</span><span className="font-bold text-emerald-500">{data.passedSecurityChecks}</span></div>
              <div className="flex justify-between"><span>Failed checks</span><span className="font-bold text-red-500">{data.failedSecurityChecks}</span></div>
              <div className="flex justify-between"><span>High/Critical failed</span><span className="font-bold text-orange-500">{data.highCriticalFailed ?? 0}</span></div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm dark:bg-slate-900">
              <div className="text-slate-500">Source</div>
              <div className="mt-1 font-medium">{data.dataQuality?.source ?? "Tenant security records"}</div>
              <div className="mt-2 text-xs text-slate-500">{data.dataQuality?.note}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "Frameworks" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.frameworks.map((item) => (
            <div key={item.name} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black">{item.name}</div>
                  <div className="text-sm text-slate-500">{item.version}</div>
                </div>
                <span className={`badge ${badgeColor(item.status)}`}>{item.status}</span>
              </div>
              <div className={`mt-5 text-5xl font-black ${scoreTone(item.readiness)}`}>{item.readiness}%</div>
              <div className="mt-4 h-3 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className={`h-3 rounded-full ${scoreBar(item.readiness)}`} style={{ width: `${item.readiness}%` }} />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900"><div className="text-slate-500">Mapped</div><div className="text-xl font-black">{item.mappedControls}</div></div>
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900"><div className="text-slate-500">Passed</div><div className="text-xl font-black text-emerald-500">{item.passedControls}</div></div>
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900"><div className="text-slate-500">Gaps</div><div className="text-xl font-black text-orange-500">{item.failedControls}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Controls" && (
        <div className="card">
          <h2 className="mb-4 font-bold">Mapped Controls</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                  <th className="py-3">Framework</th><th>Control</th><th>Title</th><th>Domain</th><th>Status</th><th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {filteredControls.map((item) => (
                  <tr key={`${item.framework}-${item.controlId}`} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-semibold">{item.framework}</td>
                    <td>{item.controlId}</td>
                    <td>{item.title}</td>
                    <td>{item.domain}</td>
                    <td><span className={`badge ${badgeColor(item.status)}`}>{item.status}</span></td>
                    <td>{item.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Gaps" && (
        <div className="space-y-3">
          {filteredGaps.length === 0 ? (
            <div className="card text-sm text-slate-500">No open framework gaps matched your filter.</div>
          ) : (
            filteredGaps.map((gap) => (
              <div key={`${gap.framework}-${gap.controlId}`} className="card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-bold">{gap.controlId} · {gap.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{gap.framework} · Owner: {gap.owner}</div>
                  </div>
                  <span className={`badge ${severityColor(gap.severity)}`}>{gap.severity}</span>
                </div>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{gap.gap}</div>
                <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-900">{gap.recommendation}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "Evidence" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.evidenceMappings
            .filter((item) => frameworkFilter === "All" || item.framework === frameworkFilter)
            .filter((item) => !query || [item.framework, item.controlId, item.title, item.evidenceSource, item.owner].join(" ").toLowerCase().includes(query.toLowerCase()))
            .map((item) => (
              <div key={`${item.framework}-${item.controlId}`} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{item.controlId} · {item.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{item.framework}</div>
                  </div>
                  <span className={`badge ${badgeColor(item.evidenceStatus)}`}>{item.evidenceStatus}</span>
                </div>
                <div className="mt-4 text-sm text-slate-500">Evidence: {item.evidenceSource}</div>
                <div className="mt-2 text-sm text-slate-500">Owner: {item.owner}</div>
              </div>
            ))}
        </div>
      )}

      {tab === "Export" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card">
            <h2 className="font-bold">Control Mapping Export</h2>
            <p className="mt-2 text-sm text-slate-500">Download mapped controls, evidence sources, owners, and gaps.</p>
            <button onClick={exportControls} className="btn-primary mt-4">Download Controls CSV</button>
          </div>
          <div className="card">
            <h2 className="font-bold">Gap Register Export</h2>
            <p className="mt-2 text-sm text-slate-500">Download open gaps and recommended actions.</p>
            <button onClick={exportGaps} className="btn-primary mt-4">Download Gaps CSV</button>
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-slate-400">Generated: {new Date(data.generatedUtc).toLocaleString()}</div>
    </div>
  );
}
