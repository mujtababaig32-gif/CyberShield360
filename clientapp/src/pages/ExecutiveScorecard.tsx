import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExecutiveScorecardApi } from "../api/endpoints";

 type ScorecardData = {
  generatedUtc: string;
  overallScore: number;
  overallGrade?: string;
  maturity: string;
  riskLevel: string;
  assetCount: number;
  monitoredAssetCount?: number;
  fullPostureCoverage?: number;
  totalChecks?: number;
  passedFindings?: number;
  failedFindings: number;
  highFindings: number;
  criticalFindings: number;
  highCriticalFindings?: number;
  attackSurfaceIssues: number;
  complianceReadiness: number;
  latestScanUtc?: string;
  scoreTrend: { date: string; score: number; domain?: string }[];
  weakestAssets: {
    assetId?: string;
    domain: string;
    score: number;
    grade: string;
    failedFindings?: number;
    highCriticalFindings?: number;
    lastScanUtc?: string;
  }[];
  topRisks: {
    title: string;
    severity: string;
    recommendation: string;
    affectedAssets?: string[];
    count?: number;
  }[];
  executiveActions: string[];
};

function scoreColor(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 50) return "text-orange-600";
  return "text-red-600";
}

function riskColor(risk: string) {
  if (risk === "Critical") return "text-red-600";
  if (risk === "High") return "text-orange-600";
  if (risk === "Medium") return "text-yellow-600";
  return "text-green-600";
}

function badgeColor(severity: string) {
  if (severity === "Critical") return "bg-red-700";
  if (severity === "High") return "bg-red-600";
  if (severity === "Medium") return "bg-orange-500";
  if (severity === "Low") return "bg-yellow-600";
  return "bg-gray-600";
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

export default function ExecutiveScorecard() {
  const [data, setData] = useState<ScorecardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ExecutiveScorecardApi.summary();
      setData(result);
    } catch {
      setError("Failed to load executive scorecard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const boardSummary = useMemo(() => {
    if (!data) return "";

    if ((data.fullPostureCoverage ?? 0) < 100) {
      return "Full Posture scan coverage is incomplete. Complete asset coverage before using the scorecard for board or customer reporting.";
    }

    if (data.overallScore >= 85) {
      return "The organization shows strong posture. Continue scheduled scans and maintain evidence for governance reporting.";
    }

    if (data.overallScore >= 70) {
      return "The organization is in a managed posture. Remediation should focus on failed High/Critical controls and recurring posture drift.";
    }

    return "The organization has elevated risk. Leadership should prioritize remediation ownership, due dates, and executive tracking for failed controls.";
  }, [data]);

  const exportScorecard = () => {
    if (!data) return;

    const summaryRows = [
      ["Metric", "Value"],
      ["Generated UTC", data.generatedUtc],
      ["Overall Score", data.overallScore],
      ["Grade", data.overallGrade || ""],
      ["Maturity", data.maturity],
      ["Risk Level", data.riskLevel],
      ["Assets", data.assetCount],
      ["Full Posture Coverage", `${data.fullPostureCoverage ?? 0}%`],
      ["Compliance Readiness", `${data.complianceReadiness}%`],
      ["Failed Findings", data.failedFindings],
      ["High/Critical Findings", data.highCriticalFindings ?? data.highFindings + data.criticalFindings],
      ["Attack Surface Issues", data.attackSurfaceIssues],
      [],
      ["Top Risks"],
      ["Title", "Severity", "Affected Assets", "Recommendation"],
      ...data.topRisks.map((r) => [
        r.title,
        r.severity,
        r.affectedAssets?.join("; ") || "",
        r.recommendation,
      ]),
    ];

    const csv = summaryRows.map((r) => r.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-executive-scorecard.csv", csv);
  };

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 p-4 text-sm dark:bg-red-950 dark:border-red-900">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="card text-sm text-gray-500">Loading executive scorecard...</div>;
  }

  const highCritical = data.highCriticalFindings ?? data.highFindings + data.criticalFindings;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Executive Security Scorecard</h1>
          <p className="text-sm text-gray-500">
            Board-level view of maturity, compliance readiness, and full-posture security risk.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button onClick={exportScorecard} className="btn-primary">
            Export Scorecard
          </button>
        </div>
      </header>

      <section className="card mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
          <div>
            <div className="text-xs text-gray-500">Overall Score</div>
            <div className={`text-5xl font-extrabold ${scoreColor(data.overallScore)}`}>
              {data.overallScore}/100
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Grade {data.overallGrade ?? "-"} · {data.maturity} maturity
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-gray-500 mb-2">Executive Summary</div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm font-medium">
              {boardSummary}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">Risk Level</div>
          <div className={`text-2xl font-bold ${riskColor(data.riskLevel)}`}>{data.riskLevel}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Compliance Ready</div>
          <div className={`text-3xl font-bold ${scoreColor(data.complianceReadiness)}`}>
            {data.complianceReadiness}%
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Full Scan Coverage</div>
          <div className={`text-3xl font-bold ${scoreColor(data.fullPostureCoverage ?? 0)}`}>
            {data.fullPostureCoverage ?? 0}%
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Failed Findings</div>
          <div className="text-3xl font-bold text-red-600">{data.failedFindings}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">High/Critical</div>
          <div className="text-3xl font-bold text-orange-600">{highCritical}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-3">Full Posture Score Trend</h2>
          {data.scoreTrend.length === 0 ? (
            <div className="text-sm text-gray-500">No score trend available yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.scoreTrend}>
                <defs>
                  <linearGradient id="scorecardTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B5A6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#10B5A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#10B5A6" fill="url(#scorecardTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Executive Actions</h2>
          <div className="space-y-3">
            {data.executiveActions.length === 0 ? (
              <div className="text-sm text-gray-500">No actions available.</div>
            ) : (
              data.executiveActions.map((action, index) => (
                <div key={`${action}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">Action #{index + 1}</div>
                  <div className="text-sm font-medium">{action}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Weakest Assets</h2>

          {data.weakestAssets.length === 0 ? (
            <div className="text-sm text-gray-500">Run Full Posture scans to populate weakest assets.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
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
                      <td className={scoreColor(asset.score)}>{asset.score}/100</td>
                      <td>{asset.failedFindings ?? 0}</td>
                      <td className="text-gray-500">
                        {asset.lastScanUtc ? new Date(asset.lastScanUtc).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Top Business Risks</h2>

          {data.topRisks.length === 0 ? (
            <div className="text-sm text-gray-500">No failed high-priority findings found.</div>
          ) : (
            <div className="space-y-3">
              {data.topRisks.map((risk, index) => (
                <div key={`${risk.title}-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-semibold">{risk.title}</div>
                      {risk.affectedAssets?.length ? (
                        <div className="text-xs text-gray-500 mt-1 break-all">
                          Assets: {risk.affectedAssets.join(", ")}
                        </div>
                      ) : null}
                    </div>
                    <span className={`badge ${badgeColor(risk.severity)} shrink-0`}>{risk.severity}</span>
                  </div>
                  <div className="text-sm text-gray-500">{risk.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">Assets</div>
          <div className="text-3xl font-bold">{data.assetCount}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">Total Evaluated Checks</div>
          <div className="text-3xl font-bold">{data.totalChecks ?? 0}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">Attack Surface Issues</div>
          <div className="text-3xl font-bold">{data.attackSurfaceIssues}</div>
        </div>
      </section>

      <div className="text-xs text-gray-400">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
        {data.latestScanUtc ? ` · Latest scan: ${new Date(data.latestScanUtc).toLocaleString()}` : ""}
      </div>
    </div>
  );
}
