import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardApi } from "../api/endpoints";
import type { PostureDashboard } from "../types";
import { GRADE_COLOR, SEV_COLOR, StatCard } from "../components/ui";

function riskLabel(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Moderate";
  if (score >= 50) return "Elevated Risk";
  return "High Risk";
}

function riskClass(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 50) return "text-orange-600";
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

export default function Dashboard() {
  const [data, setData] = useState<PostureDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await DashboardApi.posture();
      setData(result);
    } catch {
      setError("Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const advisorText = useMemo(() => {
    if (!data) return "";

    if ((data.fullPostureAssets ?? 0) < data.assetCount) {
      return "Complete Full Posture scan coverage across all monitored assets before relying on executive reporting.";
    }

    if (data.overallScore >= 85) {
      return "Security posture is strong. Keep scheduled scans enabled and monitor for drift across assets, vulnerabilities, and risks.";
    }

    if (data.overallScore >= 70) {
      return "Security posture is moderate. Prioritize high-impact scanner rule failures and keep remediation work tied to assets.";
    }

    return "Security posture needs attention. Focus on Full Posture scan failures, open vulnerabilities, and unresolved risk register items first.";
  }, [data]);

  const exportSummary = () => {
    if (!data) return;

    const rows = [
	  ["Metric", "Value"],
  	["Generated UTC", data.generatedUtc || ""],
  	["Overall Score", data.overallScore],
  	["Overall Grade", data.overallGrade],
  	["Posture Status", data.postureStatus || riskLabel(data.overallScore)],
  	["Assets", data.assetCount],
  	["Full Posture Assets", data.fullPostureAssets ?? 0],
  	["Open Vulnerabilities", data.openVulnerabilities],
  	["Critical Vulnerabilities", data.criticalVulnerabilities],
  	["Open Risks", data.openRisks],
  	["Active Brand Alerts", data.activeBrandAlerts],
  	["Total Evaluated Checks", data.totalChecks ?? 0],
  	["Passed Findings", data.passedFindings ?? 0],
  	["Failed Findings", data.failedFindings ?? 0],
  	["High/Critical Findings", data.highCriticalFindings ?? 0],
];

    const csv = rows.map((r) => r.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-dashboard-summary.csv", csv);
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="card text-sm text-gray-500">Loading dashboard...</div>;
  }

  const scanCoverage =
    data.assetCount > 0
      ? Math.round(((data.fullPostureAssets ?? 0) / data.assetCount) * 100)
      : 0;

  const severityData = data.findingBySeverity?.length
    ? data.findingBySeverity
    : data.vulnerabilityBySeverity;

  return (
    <div className="space-y-6">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Security Posture Dashboard</h1>
          <p className="text-sm text-gray-500">
            Real-time tenant overview across assets, scans, vulnerabilities, risks, and security posture.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button onClick={exportSummary} className="btn-primary">
            Export Summary
          </button>
        </div>
      </header>

      <section className="card card-3d relative mb-6 overflow-hidden border-brand-500/20">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="dashboard-grade-badge"
              style={{ background: GRADE_COLOR[data.overallGrade] ?? "#6b7280" }}
              aria-label={`Overall grade ${data.overallGrade}`}
            >
              <span>{data.overallGrade}</span>
            </div>

            <div className="min-w-0">
              <div className="text-xs text-gray-500">Overall Security Score</div>

              <div className={`text-4xl font-bold ${riskClass(data.overallScore)}`}>
                {data.overallScore}/100
              </div>

              <div className="text-sm text-gray-500">
                {data.postureStatus || riskLabel(data.overallScore)} posture
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[560px]">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="text-xs text-gray-500">Scan Coverage</div>
              <div className="text-2xl font-bold">{scanCoverage}%</div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="text-xs text-gray-500">Checks</div>
              <div className="text-2xl font-bold">{data.totalChecks ?? 0}</div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="text-xs text-gray-500">Failed</div>
              <div className="text-2xl font-bold text-red-600">{data.failedFindings ?? 0}</div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="text-xs text-gray-500">High/Critical</div>
              <div className="text-2xl font-bold text-orange-600">{data.highCriticalFindings ?? 0}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monitored Assets" value={data.monitoredAssetCount ?? data.assetCount} icon="🌐" />
        <StatCard label="Open Vulnerabilities" value={data.openVulnerabilities} accent="#ea580c" icon="🛡️" />
        <StatCard label="Critical Vulnerabilities" value={data.criticalVulnerabilities} accent="#dc2626" icon="🔥" />
        <StatCard label="Open Risks" value={data.openRisks} icon="⚠️" />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-2 font-semibold">Security Advisor</h2>
          <p className="mb-4 text-sm text-gray-500">
            Practical next-step guidance based on real Full Posture scans and tenant data.
          </p>

          <div className="rounded-xl border border-gray-200 p-4 text-sm font-medium dark:border-gray-700">
            {advisorText}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="text-xs text-gray-500">Priority</div>
              <div className="font-semibold">
                {data.overallScore >= 85 ? "Maintain" : data.overallScore >= 70 ? "Improve" : "Urgent"}
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="text-xs text-gray-500">Latest Scan</div>
              <div className="font-semibold">
                {data.latestScanUtc ? new Date(data.latestScanUtc).toLocaleDateString() : "No scan"}
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              <div className="text-xs text-gray-500">Training</div>
              <div className="font-semibold">{data.trainingCompletionPercent}% complete</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold">Executive Actions</h2>

          <div className="space-y-3">
            {(data.executiveActions?.length
              ? data.executiveActions
              : ["Run Full Posture scans and review failed findings."]
            ).map((action, index) => (
              <div key={`${action}-${index}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <div className="mb-1 text-xs text-gray-500">Action #{index + 1}</div>
                <div className="text-sm font-medium">{action}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Full Posture Score Trend</h2>

          {data.scoreTrend.length === 0 ? (
            <div className="text-sm text-gray-500">No Full Posture scan trend available yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.scoreTrend}>
                <defs>
                  <linearGradient id="dashboardTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B5A6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#10B5A6" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#10B5A6" fill="url(#dashboardTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Failures by Severity</h2>

          {severityData.length === 0 ? (
            <div className="text-sm text-gray-500">No failed findings found.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={severityData}>
                <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count">
                  {severityData.map((s) => (
                    <Cell key={s.severity} fill={SEV_COLOR[s.severity] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">Weakest Assets</h2>

          {data.weakestAssets?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                    <th className="py-2">Domain</th>
                    <th>Score</th>
                    <th>Failed</th>
                    <th>Last Scan</th>
                  </tr>
                </thead>

                <tbody>
                  {data.weakestAssets.map((asset) => (
                    <tr key={asset.domain} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 font-medium break-all">{asset.domain}</td>
                      <td className={riskClass(asset.score)}>{asset.score}/100</td>
                      <td>{asset.failedFindings ?? 0}</td>
                      <td className="text-gray-500">
                        {asset.lastScanUtc ? new Date(asset.lastScanUtc).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Run Full Posture scans to populate weakest assets.</div>
          )}
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold">Latest Full Posture Scans</h2>

          {data.latestScans?.length ? (
            <div className="space-y-3">
              {data.latestScans.map((scan) => (
                <div key={scan.scanId} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-all font-semibold">{scan.domain}</div>
                      <div className="text-xs text-gray-500">
                        {scan.completedUtc ? new Date(scan.completedUtc).toLocaleString() : "No completion time"}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className={`font-bold ${riskClass(scan.score)}`}>{scan.score}/100</div>
                      <div className="text-xs text-gray-500">{scan.failedFindings} failed</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No completed Full Posture scans found yet.</div>
          )}
        </div>
      </section>

      <div className="text-xs text-gray-400">
        Generated: {data.generatedUtc ? new Date(data.generatedUtc).toLocaleString() : "-"}
      </div>
    </div>
  );
}