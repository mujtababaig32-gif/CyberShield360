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
import { GRADE_COLOR, SEV_COLOR } from "../components/ui";

function riskLabel(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Moderate";
  if (score >= 50) return "Elevated Risk";
  return "High Risk";
}

function riskClass(score: number) {
  if (score >= 85) return "text-green-400";
  if (score >= 70) return "text-yellow-400";
  if (score >= 50) return "text-orange-400";
  return "text-red-400";
}

function riskBadgeClass(score: number) {
  if (score >= 85) return "border-green-500/30 bg-green-500/10 text-green-300";
  if (score >= 70) return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  if (score >= 50) return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  return "border-red-500/30 bg-red-500/10 text-red-300";
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

const GRADE_CRITERIA = [
  {
    grade: "A",
    range: "90-100",
    meaning: "Excellent posture",
    description:
      "Strong security controls, low exposure, strong scan coverage, and minimal critical findings.",
  },
  {
    grade: "B",
    range: "80-89",
    meaning: "Good posture",
    description: "Mostly healthy posture with a few important improvement areas.",
  },
  {
    grade: "C",
    range: "70-79",
    meaning: "Moderate posture",
    description:
      "Acceptable baseline, but multiple controls need remediation and follow-up.",
  },
  {
    grade: "D",
    range: "60-69",
    meaning: "Weak posture",
    description:
      "High exposure, poor coverage, or repeated failures across important checks.",
  },
  {
    grade: "F",
    range: "0-59",
    meaning: "Critical posture",
    description:
      "Immediate attention required because serious security gaps are present.",
  },
];

function slugifyFilePart(value: unknown) {
  const text = String(value ?? "client")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return text || "client";
}

function getClientName(data: PostureDashboard) {
  const dynamicData = data as any;

  return (
    dynamicData.clientName ||
    dynamicData.companyName ||
    dynamicData.organizationName ||
    dynamicData.tenantName ||
    dynamicData.workspaceName ||
    "client"
  );
}

function getLatestScore(data: PostureDashboard) {
  const latestScan = data.latestScans?.[0];

  return {
    score: latestScan?.score ?? data.overallScore,
    checkName: "Full Posture",
  };
}

function DarkTooltip({ active, payload, label, suffix = "" }: any) {
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

function MetricTile({
  label,
  value,
  hint,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "brand" | "green" | "orange" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-300"
      : tone === "orange"
        ? "text-orange-300"
        : tone === "red"
          ? "text-red-300"
          : "text-brand-300";

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-xl shadow-black/10">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-black ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{hint}</div>
    </div>
  );
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

    const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
    const clientSlug = slugifyFilePart(getClientName(data));

    downloadTextFile(`cybershield360-dashboard-summary-${clientSlug}.csv`, csv);
  };

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-center text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  const scanCoverage =
    data.assetCount > 0
      ? Math.round(((data.fullPostureAssets ?? 0) / data.assetCount) * 100)
      : 0;

  const severityData = data.findingBySeverity?.length
    ? data.findingBySeverity
    : data.vulnerabilityBySeverity ?? [];

  const scoreTrend = data.scoreTrend ?? [];
  const latestScore = getLatestScore(data);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Command Center
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Security Posture Dashboard
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Real-time tenant overview across assets, scans, vulnerabilities, risks,
              security posture, executive actions, and Full Posture scan coverage.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={load} disabled={loading} className="btn-ghost">
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button onClick={exportSummary} className="btn-primary">
              Export Summary
            </button>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-brand-500/20 bg-slate-950 p-6 shadow-2xl shadow-black/30">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <div
              className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl text-5xl font-black text-white shadow-2xl shadow-black/30"
              style={{ background: GRADE_COLOR[data.overallGrade] ?? "#6b7280" }}
              aria-label={`Overall grade ${data.overallGrade}`}
            >
              {data.overallGrade}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                Overall Security Score
              </div>

              <div className={`mt-2 text-5xl font-black ${riskClass(data.overallScore)}`}>
                {data.overallScore}/100
              </div>

              <div
                className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${riskBadgeClass(
                  data.overallScore
                )}`}
              >
                {data.postureStatus || riskLabel(data.overallScore)} Posture
              </div>

              <div className="mt-3 text-sm text-slate-400">
                Latest Score:{" "}
                <span className="font-black text-white">{latestScore.score}/100</span>{" "}
                <span className="text-brand-300">{latestScore.checkName}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[620px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <div className="text-xs font-bold text-slate-500">Coverage</div>
              <div className="mt-1 text-2xl font-black text-brand-300">{scanCoverage}%</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <div className="text-xs font-bold text-slate-500">Checks</div>
              <div className="mt-1 text-2xl font-black text-white">{data.totalChecks ?? 0}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <div className="text-xs font-bold text-slate-500">Failed</div>
              <div className="mt-1 text-2xl font-black text-red-300">
                {data.failedFindings ?? 0}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
              <div className="text-xs font-bold text-slate-500">High/Critical</div>
              <div className="mt-1 text-2xl font-black text-orange-300">
                {data.highCriticalFindings ?? 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Monitored Assets"
          value={data.monitoredAssetCount ?? data.assetCount}
          hint="Assets under security review"
          tone="brand"
        />
        <MetricTile
          label="Open Vulnerabilities"
          value={data.openVulnerabilities}
          hint="Unresolved vulnerability items"
          tone="orange"
        />
        <MetricTile
          label="Critical Vulnerabilities"
          value={data.criticalVulnerabilities}
          hint="Highest priority technical risks"
          tone="red"
        />
        <MetricTile
          label="Open Risks"
          value={data.openRisks}
          hint="Risk register items"
          tone="green"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Security Advisor</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Practical next-step guidance based on Full Posture scans and tenant data.
          </p>

          <div className="mt-5 rounded-3xl border border-brand-500/20 bg-brand-500/10 p-5 text-sm font-semibold leading-7 text-slate-200">
            {advisorText}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Priority
              </div>
              <div className="mt-1 font-black text-white">
                {data.overallScore >= 85
                  ? "Maintain"
                  : data.overallScore >= 70
                    ? "Improve"
                    : "Urgent"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Latest Scan
              </div>
              <div className="mt-1 font-black text-white">
                {data.latestScanUtc ? new Date(data.latestScanUtc).toLocaleDateString() : "No scan"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Training
              </div>
              <div className="mt-1 font-black text-white">
                {data.trainingCompletionPercent}% Complete
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Executive Actions</h2>

          <div className="mt-5 space-y-3">
            {(data.executiveActions?.length
              ? data.executiveActions
              : ["Run Full Posture scans and review failed findings."]
            ).map((action, index) => (
              <div
                key={`${action}-${index}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-widest text-brand-300">
                  Action #{index + 1}
                </div>
                <div className="text-sm font-semibold leading-6 text-slate-300">{action}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <div className="mb-5">
          <h2 className="text-xl font-black text-white">CyberShield360 Grading Criteria</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The overall grade is calculated from security posture score, scan coverage,
            failed checks, high/critical findings, vulnerabilities, and unresolved risks.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {GRADE_CRITERIA.map((item) => (
            <div
              key={item.grade}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
            >
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white"
                style={{ background: GRADE_COLOR[item.grade] ?? "#6b7280" }}
              >
                {item.grade}
              </div>

              <div className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                {item.range}
              </div>

              <div className="mt-2 text-sm font-black text-white">{item.meaning}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">{item.description}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Full Posture Score Trend</h2>
          <p className="mt-2 text-sm text-slate-500">
            Score movement from recent Full Posture scans.
          </p>

          <div className="mt-5 h-[260px]">
            {scoreTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-center text-sm text-slate-500">
                No Full Posture scan trend available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreTrend}>
                  <defs>
                    <linearGradient id="dashboardTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B5A6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#10B5A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#33415566" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip content={<DarkTooltip suffix="/100" />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke="#10B5A6"
                    strokeWidth={3}
                    fill="url(#dashboardTrend)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Failures by Severity</h2>
          <p className="mt-2 text-sm text-slate-500">
            Failed findings grouped by severity.
          </p>

          <div className="mt-5 h-[260px]">
            {severityData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-center text-sm text-slate-500">
                No failed findings found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33415566" />
                  <XAxis dataKey="severity" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    content={<DarkTooltip />}
                    cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                  />
                  <Bar dataKey="count" name="Findings" radius={[8, 8, 0, 0]}>
                    {severityData.map((item) => (
                      <Cell
                        key={item.severity}
                        fill={SEV_COLOR[item.severity] ?? "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Weakest Assets</h2>

          {data.weakestAssets?.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-3 py-3 text-center">Domain</th>
                    <th className="px-3 py-3 text-center">Score</th>
                    <th className="px-3 py-3 text-center">Failed</th>
                    <th className="px-3 py-3 text-center">Last Scan</th>
                  </tr>
                </thead>

                <tbody>
                  {data.weakestAssets.map((asset) => (
                    <tr key={asset.domain} className="border-b border-white/10 text-center">
                      <td className="break-all px-3 py-4 text-center font-semibold text-white">
                        {asset.domain}
                      </td>
                      <td className={`px-3 py-4 text-center font-black ${riskClass(asset.score)}`}>
                        {asset.score}/100
                      </td>
                      <td className="px-3 py-4 text-center text-slate-300">
                        {asset.failedFindings ?? 0}
                      </td>
                      <td className="px-3 py-4 text-center text-slate-500">
                        {asset.lastScanUtc ? new Date(asset.lastScanUtc).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-500">
              Run Full Posture scans to populate weakest assets.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Latest Full Posture Scans</h2>

          {data.latestScans?.length ? (
            <div className="mt-5 space-y-3">
              {data.latestScans.map((scan) => (
                <div
                  key={scan.scanId}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 text-center sm:text-left">
                      <div className="break-all font-black text-white">{scan.domain}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {scan.completedUtc
                          ? new Date(scan.completedUtc).toLocaleString()
                          : "No completion time"}
                      </div>
                    </div>

                    <div className="shrink-0 text-center sm:text-right">
                      <div className={`font-black ${riskClass(scan.score)}`}>
                        {scan.score}/100
                      </div>
                      <div className="text-xs text-slate-500">
                        Full Posture • {scan.failedFindings} failed
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-500">
              No completed Full Posture scans found yet.
            </div>
          )}
        </div>
      </section>

      <div className="text-center text-xs text-slate-500">
        Generated: {data.generatedUtc ? new Date(data.generatedUtc).toLocaleString() : "-"}
      </div>
    </div>
  );
}