import { useEffect, useMemo, useState } from "react";
import { ComplianceApi } from "../api/endpoints";

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

const TABS = ["Overview", "Frameworks", "Controls", "Assets", "Recommendations", "Export"];

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

function severityBadge(severity: string) {
  const s = severity.toLowerCase();
  if (s.includes("critical")) return "bg-red-700";
  if (s.includes("high")) return "bg-red-600";
  if (s.includes("medium")) return "bg-orange-500";
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
    load();
  }, []);

  const filteredControls = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.failedControls;

    return data.failedControls.filter((item) =>
      [item.domain, item.checkKey, item.title, item.framework, item.control, item.severity]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, query]);

  const exportControls = () => {
    if (!data) return;

    downloadCsv("cybershield360-compliance-controls.csv", [
      ["Domain", "Framework", "Control", "Check Key", "Title", "Severity", "Recommendation"],
      ...data.failedControls.map((c) => [
        c.domain,
        c.framework,
        c.control,
        c.checkKey,
        c.title,
        c.severity,
        c.recommendation,
      ]),
    ]);
  };

  const exportFrameworks = () => {
    if (!data) return;

    downloadCsv("cybershield360-compliance-frameworks.csv", [
      ["Framework", "Score", "Status"],
      ...data.frameworks.map((f) => [f.name, f.score, f.status]),
    ]);
  };

  if (error) {
    return (
      <div className="card border-red-500/30 bg-red-500/10 text-red-500">
        {error}
      </div>
    );
  }

  if (loading || !data) {
    return <div className="card text-sm text-slate-500">Loading compliance center...</div>;
  }

  const scannedAssets = data.scannedAssets ?? data.domains.length;
  const unscanned = data.dataQuality?.assetsWithoutFullPostureScan ?? Math.max(0, data.assetCount - scannedAssets);

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">
            Governance Risk Compliance
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Compliance Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Real-time compliance readiness calculated from latest Full Posture scans, security controls, and tenant evidence.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="btn-ghost disabled:opacity-50">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={exportControls} className="btn-primary">
            Export Controls
          </button>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card">
          <div className="text-xs text-slate-500">Overall Readiness</div>
          <div className={`mt-1 text-4xl font-black ${scoreTone(data.overallScore)}`}>{data.overallScore}%</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className={`h-2 rounded-full ${scoreBar(data.overallScore)}`} style={{ width: `${data.overallScore}%` }} />
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Assets in Scope</div>
          <div className="mt-1 text-4xl font-black">{data.assetCount}</div>
          <div className="mt-2 text-xs text-slate-500">{scannedAssets} with full scans</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Controls Tested</div>
          <div className="mt-1 text-4xl font-black">{data.totalControls}</div>
          <div className="mt-2 text-xs text-emerald-500">{data.passedControls} passed</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Rule Failures</div>
          <div className="mt-1 text-4xl font-black text-red-500">{data.failedControlsCount}</div>
          <div className="mt-2 text-xs text-slate-500">Require review</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">High/Critical</div>
          <div className="mt-1 text-4xl font-black text-orange-500">{data.highFailed + data.criticalFailed}</div>
          <div className="mt-2 text-xs text-slate-500">Priority controls</div>
        </div>
      </div>

      {unscanned > 0 && (
        <div className="mb-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-700 dark:text-orange-300">
          {unscanned} asset(s) do not have a completed Full Posture scan yet. Run Full Posture scans to improve compliance confidence.
        </div>
      )}

      <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <h2 className="mb-4 font-bold">Framework Readiness</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {data.frameworks.map((f) => (
                <div key={f.name} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-bold">{f.name}</div>
                    <span className={`text-sm font-bold ${scoreTone(f.score)}`}>{f.status}</span>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl font-black">{f.score}%</span>
                    <span className="pb-1 text-xs text-slate-500">readiness</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={`h-2 rounded-full ${scoreBar(f.score)}`} style={{ width: `${f.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 font-bold">Control Categories</h2>
            <div className="space-y-4">
              {data.categories.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className={scoreTone(c.score)}>{c.score}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={`h-2 rounded-full ${scoreBar(c.score)}`} style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "Frameworks" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.frameworks.map((f) => (
            <div key={f.name} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black">{f.name}</div>
                  <div className="text-sm text-slate-500">Readiness derived from mapped scan control families.</div>
                </div>
                <span className={`badge ${f.score >= 85 ? "bg-emerald-600" : f.score >= 70 ? "bg-yellow-500" : f.score >= 50 ? "bg-orange-500" : "bg-red-600"}`}>
                  {f.status}
                </span>
              </div>
              <div className="mt-5 text-5xl font-black">{f.score}%</div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className={`h-3 rounded-full ${scoreBar(f.score)}`} style={{ width: `${f.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Controls" && (
        <div className="card">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold">Priority Controls Requiring Review</h2>
              <p className="text-xs text-slate-500">Failed controls are shown first to support remediation and audit planning.</p>
            </div>
            <input
              className="input max-w-md"
              placeholder="Search domain, control, framework, severity..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filteredControls.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800">
              No failed compliance controls matched your filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredControls.map((item, index) => (
                <div key={`${item.domain}-${item.checkKey}-${index}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-bold">{item.control}</div>
                      <div className="mt-1 break-words text-sm text-slate-500">
                        {item.domain} · {item.framework} · {item.checkKey}
                      </div>
                    </div>
                    <span className={`badge ${severityBadge(item.severity)}`}>{item.severity}</span>
                  </div>
                  <div className="mt-3 text-sm">{item.title}</div>
                  <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    {item.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Assets" && (
        <div className="card">
          <h2 className="mb-4 font-bold">Asset Compliance Ranking</h2>
          {data.domains.length === 0 ? (
            <div className="text-sm text-slate-500">No completed Full Posture scans found yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                    <th className="py-3">Domain</th>
                    <th>Score</th>
                    <th>Grade</th>
                    <th>Checks</th>
                    <th>Failed</th>
                    <th>Last Full Scan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.domains.map((d) => (
                    <tr key={d.domain} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 font-semibold">{d.domain}</td>
                      <td className={scoreTone(d.score)}>{d.score}%</td>
                      <td>{d.grade}</td>
                      <td>{d.totalChecks ?? "-"}</td>
                      <td className="text-red-500">{d.failedChecks ?? "-"}</td>
                      <td className="text-slate-500">{d.completedUtc ? new Date(d.completedUtc).toLocaleString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "Recommendations" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.recommendations.length === 0 ? (
            <div className="card text-sm text-slate-500">No compliance recommendations available.</div>
          ) : (
            data.recommendations.map((item, index) => (
              <div key={index} className="card">
                <div className="text-xs font-semibold uppercase tracking-widest text-brand-500">Priority #{index + 1}</div>
                <div className="mt-2 font-semibold">{item}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "Export" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card">
            <h2 className="font-bold">Compliance Controls CSV</h2>
            <p className="mt-2 text-sm text-slate-500">Export failed controls with framework mappings and remediation recommendations.</p>
            <button onClick={exportControls} className="btn-primary mt-4">Download Controls CSV</button>
          </div>
          <div className="card">
            <h2 className="font-bold">Framework Readiness CSV</h2>
            <p className="mt-2 text-sm text-slate-500">Export framework readiness percentages and status labels.</p>
            <button onClick={exportFrameworks} className="btn-primary mt-4">Download Frameworks CSV</button>
          </div>
          <div className="card md:col-span-2">
            <h2 className="font-bold">Data Source</h2>
            <p className="mt-2 text-sm text-slate-500">{data.dataQuality?.source ?? "Latest tenant security records"}</p>
            <p className="mt-1 text-xs text-slate-400">{data.dataQuality?.note}</p>
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-slate-400">Generated: {new Date(data.generatedUtc).toLocaleString()}</div>
    </div>
  );
}
