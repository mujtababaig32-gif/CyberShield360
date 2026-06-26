import { useEffect, useMemo, useState } from "react";
import { PolicyAuditApi } from "../api/endpoints";

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

const TABS = ["Overview", "Policies", "Evidence", "Audits", "Findings", "Reports", "Settings"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("approved") || v.includes("collected") || v.includes("ready")) return "bg-emerald-600";
  if (v.includes("needs") || v.includes("missing") || v.includes("open")) return "bg-red-600";
  if (v.includes("pending") || v.includes("progress") || v.includes("planned")) return "bg-orange-500";
  return "bg-slate-600";
}

function severityColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("critical") || v.includes("high")) return "bg-red-600";
  if (v.includes("medium")) return "bg-orange-500";
  return "bg-yellow-500";
}

function scoreTone(score: number) {
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-yellow-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
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
    load();
  }, []);

  const filteredPolicies = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.policies;
    return data.policies.filter((p) => [p.title, p.owner, p.category, p.status].join(" ").toLowerCase().includes(q));
  }, [data, query]);

  const exportPolicies = () => {
    if (!data) return;

    downloadCsv("cybershield360-policy-register.csv", [
      ["Policy", "Owner", "Category", "Status", "Version", "Acknowledgement", "Last Reviewed", "Next Review"],
      ...data.policies.map((p) => [
        p.title,
        p.owner,
        p.category,
        p.status,
        p.version,
        `${p.acknowledgementRate}%`,
        p.lastReviewedUtc,
        p.nextReviewUtc,
      ]),
    ]);
  };

  const exportEvidence = () => {
    if (!data) return;

    downloadCsv("cybershield360-evidence-register.csv", [
      ["Evidence", "Control", "Type", "Status", "Owner", "Collected UTC"],
      ...data.evidence.map((e) => [e.name, e.control, e.type, e.status, e.owner, e.collectedUtc ?? ""]),
    ]);
  };

  const saveSetting = (name: string) => {
    localStorage.setItem(`cs360_policy_audit_${name}`, "enabled");
    setSettingsMessage(`${name} saved locally for this workspace.`);
  };

  if (error) {
    return <div className="card border-red-500/30 bg-red-500/10 text-red-500">{error}</div>;
  }

  if (loading || !data) {
    return <div className="card text-sm text-slate-500">Loading policy audit manager...</div>;
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">Audit Readiness</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Policy & Audit Manager</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Manage policy readiness, evidence coverage, audit findings, and governance actions using real tenant security records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="btn-ghost disabled:opacity-50">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={exportPolicies} className="btn-primary">Export Policies</button>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card">
          <div className="text-xs text-slate-500">Audit Readiness</div>
          <div className={`mt-1 text-4xl font-black ${scoreTone(data.averageAuditReadiness)}`}>{data.averageAuditReadiness}%</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Policies</div>
          <div className="mt-1 text-4xl font-black">{data.totalPolicies}</div>
          <div className="mt-2 text-xs text-emerald-500">{data.approvedPolicies} approved</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Need Review</div>
          <div className="mt-1 text-4xl font-black text-red-500">{data.policiesNeedingReview}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Evidence Missing</div>
          <div className="mt-1 text-4xl font-black text-orange-500">{data.evidenceMissing}</div>
          <div className="mt-2 text-xs text-slate-500">{data.evidenceCollected} collected</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-500">Scope</div>
          <div className="mt-1 text-4xl font-black">{data.assetsInScope}</div>
          <div className="mt-2 text-xs text-slate-500">assets · {data.usersInScope} users</div>
        </div>
      </section>

      <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="card xl:col-span-2">
            <h2 className="mb-4 font-bold">Governance Recommendations</h2>
            {data.recommendations.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800">
                No urgent governance recommendations.
              </div>
            ) : (
              <div className="space-y-3">
                {data.recommendations.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="text-xs font-semibold uppercase tracking-widest text-brand-500">Recommendation #{index + 1}</div>
                    <div className="mt-2 font-medium">{item}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="mb-4 font-bold">Evidence Coverage</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span>Collected</span>
                  <span className="font-bold text-emerald-500">{data.evidenceCollected}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${Math.round((data.evidenceCollected * 100) / Math.max(1, data.evidence.length))}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4 text-sm dark:bg-slate-900">
                <div className="text-slate-500">Data Source</div>
                <div className="mt-1 font-medium">{data.dataQuality?.source ?? "Tenant records"}</div>
              </div>
              <div className="text-xs text-slate-400">Generated: {new Date(data.generatedUtc).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {tab === "Policies" && (
        <div className="card">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="font-bold">Policy Register</h2>
            <input className="input max-w-md" placeholder="Search policies..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
                  <th className="py-3">Policy</th>
                  <th>Owner</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Acknowledgement</th>
                  <th>Next Review</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-semibold">{policy.title}</td>
                    <td>{policy.owner}</td>
                    <td>{policy.category}</td>
                    <td><span className={`badge ${badgeColor(policy.status)}`}>{policy.status}</span></td>
                    <td>{policy.version}</td>
                    <td>{policy.acknowledgementRate}%</td>
                    <td className="text-slate-500">{new Date(policy.nextReviewUtc).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Evidence" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.evidence.map((item) => (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.control} · {item.type}</div>
                </div>
                <span className={`badge ${badgeColor(item.status)}`}>{item.status}</span>
              </div>
              <div className="mt-4 text-sm text-slate-500">Owner: {item.owner}</div>
              <div className="mt-2 text-xs text-slate-500">
                Collected: {item.collectedUtc ? new Date(item.collectedUtc).toLocaleString() : "Not collected"}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Audits" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.audits.map((audit) => (
            <div key={audit.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold">{audit.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{audit.framework}</div>
                </div>
                <span className={`badge ${badgeColor(audit.status)}`}>{audit.status}</span>
              </div>
              <div className="mt-5 flex justify-between text-sm">
                <span>Readiness</span>
                <span className={scoreTone(audit.readiness)}>{audit.readiness}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-brand-600" style={{ width: `${audit.readiness}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
                  <div className="text-slate-500">Open Findings</div>
                  <div className="text-xl font-black">{audit.openFindings}</div>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
                  <div className="text-slate-500">Due Date</div>
                  <div className="font-semibold">{new Date(audit.dueDateUtc).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Findings" && (
        <div className="card">
          <h2 className="mb-4 font-bold">Audit Findings</h2>
          {data.findings.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-800">
              No open audit findings.
            </div>
          ) : (
            <div className="space-y-3">
              {data.findings.map((finding) => (
                <div key={finding.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-bold">{finding.title}</div>
                      <div className="mt-1 text-xs text-slate-500">Owner: {finding.owner} · Status: {finding.status}</div>
                    </div>
                    <span className={`badge ${severityColor(finding.severity)}`}>{finding.severity}</span>
                  </div>
                  <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-900">{finding.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Reports" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card">
            <h2 className="font-bold">Policy Register Export</h2>
            <p className="mt-2 text-sm text-slate-500">Download current policy status, ownership, versions, and review dates.</p>
            <button onClick={exportPolicies} className="btn-primary mt-4">Download CSV</button>
          </div>
          <div className="card">
            <h2 className="font-bold">Evidence Register Export</h2>
            <p className="mt-2 text-sm text-slate-500">Download audit evidence status and ownership mapping.</p>
            <button onClick={exportEvidence} className="btn-primary mt-4">Download CSV</button>
          </div>
        </div>
      )}

      {tab === "Settings" && (
        <div className="card">
          <h2 className="mb-4 font-bold">Policy Audit Settings</h2>
          {settingsMessage && <div className="mb-4 rounded-xl bg-brand-500/10 p-3 text-sm text-brand-500">{settingsMessage}</div>}
          <div className="space-y-3">
            {["Quarterly policy reviews", "Evidence owner reminders", "Audit readiness alerts"].map((setting) => (
              <div key={setting} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold">{setting}</div>
                  <div className="text-sm text-slate-500">Recommended control for stronger audit preparation.</div>
                </div>
                <button onClick={() => saveSetting(setting)} className="btn-primary">Save</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
