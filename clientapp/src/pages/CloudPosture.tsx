import { useEffect, useMemo, useState } from "react";
import { CloudPostureApi } from "../api/endpoints";

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

const TABS = ["Overview", "Accounts", "Findings", "IAM", "Storage", "Network", "Reports", "Settings"];
const SEVERITIES = ["All", "Critical", "High", "Medium", "Low", "Info"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("critical") || v.includes("high") || v.includes("open")) return "bg-red-600";
  if (v.includes("medium") || v.includes("review")) return "bg-orange-500";
  if (v.includes("connected") || v.includes("passed")) return "bg-green-600";
  if (v.includes("not") || v.includes("info")) return "bg-slate-600";
  return "bg-brand-600";
}

function scoreClass(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 50) return "text-orange-500";
  return "text-red-600";
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
      setData(await CloudPostureApi.summary());
    } catch {
      setError("Failed to load cloud posture.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredFindings = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.findings.filter((f) => {
      const matchesSeverity = severity === "All" || f.severity === severity;
      const text = `${f.title} ${f.provider} ${f.resource} ${f.category} ${f.recommendation}`.toLowerCase();
      return matchesSeverity && (!q || text.includes(q));
    });
  }, [data, search, severity]);

  const exportFindings = () => {
    if (!data) return;
    const rows = [
      ["Provider", "Resource", "Category", "Title", "Severity", "Status", "Recommendation"],
      ...filteredFindings.map((f) => [
        f.provider,
        f.resource,
        f.category,
        f.title,
        f.severity,
        f.status,
        f.recommendation,
      ]),
    ];
    downloadTextFile("cybershield360-cloud-posture-findings.csv", rows.map((r) => r.map(csvSafe).join(",")).join("\n"));
  };

  const renderFindings = (items: CloudFinding[]) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="empty-state">
          <div className="text-3xl mb-2">☁️</div>
          <h3 className="font-semibold">No findings in this view</h3>
          <p className="section-subtitle mt-1">Connect a cloud provider or run posture scans to populate evidence-backed findings.</p>
        </div>
      ) : (
        items.map((f) => (
          <div key={f.id} className="card card-hover p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold break-words">{f.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {f.provider} · {f.resource} · {f.category}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <span className={`badge ${badgeColor(f.severity)}`}>{f.severity}</span>
                <span className={`badge ${badgeColor(f.status)}`}>{f.status}</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{f.recommendation}</p>
          </div>
        ))
      )}
    </div>
  );

  if (loading && !data) return <div className="card text-sm text-slate-500">Loading cloud posture...</div>;
  if (error) return <div className="card text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-500">Cloud Security</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cloud Security Posture</h1>
          <p className="section-subtitle mt-1">AWS, Azure, and GCP readiness with evidence from connected cloud sources and tenant scan signals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="btn-ghost">{loading ? "Refreshing..." : "Refresh"}</button>
          <button onClick={exportFindings} className="btn-primary">Export Findings</button>
        </div>
      </header>

      <div className="card mb-5 border-brand-500/30 bg-brand-500/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold">Connector status: {data.connectorMode ?? "Cloud connectors not connected"}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{data.evidenceQuality ?? "Cloud findings are limited until provider integrations are configured."}</div>
          </div>
          <div className="text-xs text-slate-500">Generated: {new Date(data.generatedUtc).toLocaleString()}</div>
        </div>
      </div>

      <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
            <div className="metric-card"><div className="section-subtitle">Connected Accounts</div><div className="text-3xl font-bold">{data.connectedAccounts}/{data.totalAccounts}</div></div>
            <div className="metric-card"><div className="section-subtitle">Cloud Score</div><div className={`text-3xl font-bold ${scoreClass(data.averagePostureScore)}`}>{data.averagePostureScore}/100</div></div>
            <div className="metric-card"><div className="section-subtitle">Open Findings</div><div className="text-3xl font-bold text-red-600">{data.openFindings}</div></div>
            <div className="metric-card"><div className="section-subtitle">High/Critical</div><div className="text-3xl font-bold text-orange-500">{data.highFindings}</div></div>
            <div className="metric-card"><div className="section-subtitle">Assets in Scope</div><div className="text-3xl font-bold">{data.assetsInScope}</div></div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card lg:col-span-1">
              <h2 className="section-title mb-4">Risk Breakdown</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>IAM risks</span><b>{data.iamRiskCount}</b></div>
                <div className="flex justify-between"><span>Storage risks</span><b>{data.storageRiskCount}</b></div>
                <div className="flex justify-between"><span>Network exposure</span><b>{data.networkRiskCount}</b></div>
              </div>
            </div>
            <div className="card lg:col-span-2">
              <h2 className="section-title mb-4">Recommended Actions</h2>
              {data.recommendations.length === 0 ? (
                <p className="section-subtitle">No cloud-specific remediation actions are available yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.recommendations.map((r, i) => <div key={i} className="rounded-xl border p-4 text-sm dark:border-slate-700"><b>#{i + 1}</b> {r}</div>)}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "Accounts" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.accounts.map((a) => (
            <div key={a.id} className="card card-hover">
              <div className="flex items-start justify-between gap-3">
                <div><div className="font-semibold">{a.accountName}</div><div className="text-xs text-slate-500">{a.provider} · {a.accountId}</div></div>
                <span className={`badge ${badgeColor(a.status)}`}>{a.status}</span>
              </div>
              <div className={`text-3xl font-bold mt-4 ${scoreClass(a.postureScore)}`}>{a.postureScore}/100</div>
              <div className="text-sm text-slate-500 mt-2">Regions: {a.regionCount}</div>
              <div className="text-xs text-slate-500 mt-1">Last scanned: {a.lastScannedUtc ? new Date(a.lastScannedUtc).toLocaleString() : "Not scanned"}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "Findings" && <div className="card"><h2 className="section-title mb-4">Cloud Findings</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"><input className="input md:col-span-2" placeholder="Search findings..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></div>{renderFindings(filteredFindings)}</div>}
      {tab === "IAM" && <div className="card"><h2 className="section-title mb-4">IAM Risks</h2>{renderFindings(data.iamRisks)}</div>}
      {tab === "Storage" && <div className="card"><h2 className="section-title mb-4">Storage Risks</h2>{renderFindings(data.storageRisks)}</div>}
      {tab === "Network" && <div className="card"><h2 className="section-title mb-4">Network Exposure</h2>{renderFindings(data.networkRisks)}</div>}

      {tab === "Reports" && (
        <div className="card">
          <h2 className="section-title mb-4">Cloud Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ["Cloud Posture Export", "Exports current cloud posture findings."],
              ["IAM Risk Review", "Use the IAM tab to review identity-related risks."],
              ["Connector Readiness", "Use Settings to configure provider integrations."],
            ].map(([titleText, body]) => (
              <div key={titleText} className="rounded-2xl border p-4 dark:border-slate-700"><div className="font-semibold">{titleText}</div><p className="section-subtitle mt-1">{body}</p><button onClick={exportFindings} className="btn-primary mt-4">Export CSV</button></div>
            ))}
          </div>
        </div>
      )}

      {tab === "Settings" && (
        <div className="card">
          <h2 className="section-title mb-3">Cloud Integration Settings</h2>
          <p className="section-subtitle mb-4">No real AWS/Azure/GCP connector secrets are stored in this module yet. Configure provider credentials through environment variables before enabling production cloud posture scans.</p>
          <div className="space-y-3">{data.integrations.map((i) => <div key={i.provider} className="rounded-xl border p-4 flex justify-between gap-3 dark:border-slate-700"><div><b>{i.provider}</b><div className="text-sm text-slate-500">{i.method}</div></div><span className={`badge ${badgeColor(i.status)}`}>{i.status}</span></div>)}</div>
        </div>
      )}
    </div>
  );
}
