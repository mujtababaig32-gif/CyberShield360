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
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

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
  return value ? new Date(value).toLocaleString() : "-";
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
    void load();
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

    const highCritical =
      data.highCriticalFindings ?? data.highFindings + data.criticalFindings;

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
      ["High/Critical Findings", highCritical],
      ["Attack Surface Issues", data.attackSurfaceIssues],
      [],
      ["Top Risks"],
      ["Title", "Severity", "Affected Assets", "Recommendation"],
      ...data.topRisks.map((risk) => [
        risk.title,
        risk.severity,
        risk.affectedAssets?.join("; ") || "",
        risk.recommendation,
      ]),
    ];

    const csv = summaryRows.map((row) => row.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-executive-scorecard.csv", csv);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400">
        Loading executive scorecard...
      </div>
    );
  }

  const highCritical =
    data.highCriticalFindings ?? data.highFindings + data.criticalFindings;

  const coverage = data.fullPostureCoverage ?? 0;
  const scoreTrend = data.scoreTrend ?? [];
  const weakestAssets = data.weakestAssets ?? [];
  const topRisks = data.topRisks ?? [];
  const executiveActions = data.executiveActions ?? [];

  const scoreInsight =
    scoreTrend.length >= 2
      ? `Latest score is ${
          scoreTrend[scoreTrend.length - 1]?.score ?? data.overallScore
        }/100 across the available score trend.`
      : "Run more Full Posture scans to build a stronger score trend.";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
            Command Center
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            Executive Security Scorecard
          </h1>

          <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-400">
            Board-level view of maturity, compliance readiness, asset coverage, business risk,
            and priority security actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="btn-ghost"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button type="button" onClick={exportScorecard} className="btn-primary">
            Export Scorecard
          </button>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-6">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Overall Security Score
            </div>

            <div className="mt-4 flex items-end gap-3">
              <div className="text-6xl font-black tracking-tight text-white">
                {data.overallScore}
              </div>
              <div className="pb-2 text-xl font-black text-slate-500">/100</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <CyberStatusBadge value={`Grade ${data.overallGrade ?? "-"}`} />
              <CyberStatusBadge value={scoreStatus(data.overallScore)} />
              <CyberStatusBadge value={data.riskLevel} />
            </div>

            <div className="mt-5 text-sm leading-6 text-slate-400">
              {data.maturity} maturity · latest scan {dateText(data.latestScanUtc)}
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Executive Summary
            </div>

            <div className="rounded-3xl border border-brand-500/20 bg-brand-500/10 p-5 text-sm font-medium leading-7 text-slate-200">
              {boardSummary}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Assets
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {data.assetCount}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Checks
                </div>
                <div className="mt-2 text-2xl font-black text-white">
                  {data.totalChecks ?? 0}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Coverage
                </div>
                <div className="mt-2 text-2xl font-black text-white">{coverage}%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard
          label="Risk Level"
          value={data.riskLevel}
          hint="Overall business risk"
          tone={scoreTone(data.overallScore)}
        />
        <CyberStatCard
          label="Compliance Ready"
          value={`${data.complianceReadiness}%`}
          hint="Readiness score"
          tone={scoreTone(data.complianceReadiness)}
        />
        <CyberStatCard
          label="Full Scan Coverage"
          value={`${coverage}%`}
          hint="Assets with full posture"
          tone={scoreTone(coverage)}
        />
        <CyberStatCard
          label="Failed Findings"
          value={data.failedFindings}
          hint="Controls needing attention"
          tone={data.failedFindings > 0 ? "red" : "green"}
        />
        <CyberStatCard
          label="High/Critical"
          value={highCritical}
          hint="Priority risks"
          tone={highCritical > 0 ? "orange" : "green"}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CyberChartCard
            title="Full Posture Score Trend"
            description="Shows how the overall security score changes after scans and remediation work."
            insight={scoreInsight}
          >
            {scoreTrend.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center text-center text-sm text-slate-500">
                No score trend available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={scoreTrend}>
                  <defs>
                    <linearGradient id="scorecardTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B5A6" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#10B5A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip
                    content={<DarkTooltip suffix="/100" />}
                    cursor={{ stroke: "#10B5A6", strokeOpacity: 0.4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke="#10B5A6"
                    fill="url(#scorecardTrend)"
                    strokeWidth={3}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CyberChartCard>
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5">
            <h2 className="text-lg font-black tracking-tight text-white">
              Executive Actions
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Recommended next steps for leadership and security owners.
            </p>
          </div>

          <div className="space-y-3">
            {executiveActions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                No actions available.
              </div>
            ) : (
              executiveActions.map((action, index) => (
                <div
                  key={`${action}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Action #{index + 1}
                  </div>
                  <div className="text-sm font-medium leading-6 text-slate-300">
                    {action}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CyberTable
          title="Weakest Assets"
          description="Assets with the lowest score or highest failed finding count."
          data={weakestAssets}
          emptyText="Run Full Posture scans to populate weakest assets."
          columns={[
            {
              key: "domain",
              label: "Domain",
              render: (asset) => (
                <div className="mx-auto min-w-64 text-center">
                  <div className="break-all font-semibold text-white">{asset.domain}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Last scan: {dateText(asset.lastScanUtc)}
                  </div>
                </div>
              ),
            },
            {
              key: "score",
              label: "Score",
              render: (asset) => (
                <div className="mx-auto min-w-28 text-center">
                  <div className="font-semibold text-white">{asset.score}/100</div>
                  <div className="mt-2 flex justify-center">
                    <CyberStatusBadge value={`Grade ${asset.grade}`} />
                  </div>
                </div>
              ),
            },
            {
              key: "failed",
              label: "Failed",
              render: (asset) => (
                <div className="text-center text-slate-300">
                  {asset.failedFindings ?? 0}
                </div>
              ),
              align: "center",
            },
            {
              key: "priority",
              label: "Priority",
              render: (asset) => (
                <div className="flex justify-center">
                  <CyberStatusBadge value={scoreStatus(asset.score)} />
                </div>
              ),
            },
          ]}
        />

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5">
            <h2 className="text-lg font-black tracking-tight text-white">
              Top Business Risks
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Highest-priority findings translated into business-focused actions.
            </p>
          </div>

          <div className="space-y-3">
            {topRisks.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                No failed high-priority findings found.
              </div>
            ) : (
              topRisks.map((risk, index) => (
                <div
                  key={`${risk.title}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{risk.title}</div>
                      {risk.affectedAssets?.length ? (
                        <div className="mt-1 break-all text-xs text-slate-500">
                          Assets: {risk.affectedAssets.join(", ")}
                        </div>
                      ) : null}
                    </div>

                    <CyberStatusBadge value={risk.severity} />
                  </div>

                  <div className="text-sm leading-6 text-slate-400">
                    {risk.recommendation}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CyberStatCard
          label="Assets"
          value={data.assetCount}
          hint={`${data.monitoredAssetCount ?? data.assetCount} monitored`}
          tone="brand"
        />
        <CyberStatCard
          label="Evaluated Checks"
          value={data.totalChecks ?? 0}
          hint={`${data.passedFindings ?? 0} passed checks`}
          tone="green"
        />
        <CyberStatCard
          label="Attack Surface Issues"
          value={data.attackSurfaceIssues}
          hint="External exposure indicators"
          tone={data.attackSurfaceIssues > 0 ? "orange" : "green"}
        />
      </section>

      <div className="text-center text-xs text-slate-500">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
        {data.latestScanUtc
          ? ` · Latest scan: ${new Date(data.latestScanUtc).toLocaleString()}`
          : ""}
      </div>
    </div>
  );
}