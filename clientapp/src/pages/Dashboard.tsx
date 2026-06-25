import { useEffect, useState } from "react";
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

function scoreLabel(score: number) {
  if (score >= 85) return "Strong posture";
  if (score >= 70) return "Moderate posture";
  if (score >= 50) return "Elevated risk";
  return "High risk posture";
}

function priorityLabel(score: number) {
  if (score >= 85) return "Maintain";
  if (score >= 70) return "Improve";
  return "Urgent";
}

function riskLabel(score: number) {
  if (score >= 85) return "Low";
  if (score >= 70) return "Medium";
  return "High";
}

export default function Dashboard() {
  const [data, setData] = useState<PostureDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    DashboardApi.posture()
      .then(setData)
      .catch(() => setError("Failed to load dashboard."));
  }, []);

  if (error) {
    return (
      <div className="card border-red-500/30 bg-red-500/10 text-red-200">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="card text-slate-400">Loading dashboard...</div>;
  }

  const lastScore = data.scoreTrend?.length
    ? data.scoreTrend[data.scoreTrend.length - 1].score
    : data.overallScore;

  const grade = String(data.overallGrade ?? "-");
  const gradeColor = GRADE_COLOR[data.overallGrade] ?? "#64748b";

  const aiAdvice =
    lastScore >= 85
      ? "Security posture looks strong. Continue scheduled monitoring and maintain current controls."
      : lastScore >= 70
        ? "Security posture is moderate. Focus on failed high-impact controls such as HSTS, CSP, DKIM, and DMARC."
        : "Security posture needs attention. Prioritize missing security headers, email authentication, TLS hygiene, and recurring scans.";

  return (
    <div className="dashboard-page">
      <header className="mb-5 sm:mb-6">
        <h1 className="section-title text-2xl font-black tracking-tight sm:text-3xl">
          Security Posture Dashboard
        </h1>
        <p className="section-subtitle mt-1 text-sm text-slate-400">
          Real-time tenant overview across assets, scans, vulnerabilities, risks, and security posture.
        </p>
      </header>

      <section className="card dashboard-score-card mb-5 sm:mb-6">
        <div className="dashboard-score-inner">
          <div
            className="grade-badge"
            style={{ background: gradeColor }}
            aria-label={`Overall grade ${grade}`}
          >
            {grade}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Overall Security Score
            </div>
            <div className="score-number" style={{ color: gradeColor }}>
              {data.overallScore}/100
            </div>
            <div className="text-sm font-semibold text-slate-300">
              {scoreLabel(data.overallScore)}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 sm:mb-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monitored Assets" value={data.assetCount} />
        <StatCard label="Open Vulnerabilities" value={data.openVulnerabilities} />
        <StatCard
          label="Critical Vulnerabilities"
          value={data.criticalVulnerabilities}
          accent="#dc2626"
        />
        <StatCard label="Open Risks" value={data.openRisks} />
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 sm:mb-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="section-title mb-2 text-lg font-bold">Security Advisor</h2>
          <p className="section-subtitle mb-4 text-sm text-slate-400">
            Practical next-step guidance based on real Full Posture scans and tenant data.
          </p>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-950/35 p-4">
            <div className="mb-1 text-xs text-slate-500">Current Recommendation</div>
            <div className="text-sm font-semibold leading-6 text-slate-100">{aiAdvice}</div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-800/70 p-4">
              <div className="text-xs text-slate-400">Priority</div>
              <div className="mt-1 font-bold">{priorityLabel(lastScore)}</div>
            </div>

            <div className="rounded-2xl bg-slate-800/70 p-4">
              <div className="text-xs text-slate-400">Risk Level</div>
              <div className="mt-1 font-bold">{riskLabel(lastScore)}</div>
            </div>

            <div className="rounded-2xl bg-slate-800/70 p-4">
              <div className="text-xs text-slate-400">Next Action</div>
              <div className="mt-1 font-bold">Review Failed Checks</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title mb-3 text-lg font-bold">SaaS Readiness</h2>
          <div className="space-y-3 text-sm text-slate-300">
            <div>✅ Asset Discovery</div>
            <div>✅ Security Scanning</div>
            <div>✅ PDF / Excel Reports</div>
            <div>✅ AI Recommendations</div>
            <div>⚠️ Scheduled Scan Monitoring</div>
            <div>⚠️ Email Alert Validation</div>
          </div>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 sm:mb-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="section-title mb-3 text-lg font-bold">Score Trend</h2>
          {data.scoreTrend?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.scoreTrend}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B5A6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#10B5A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#10B5A6" fill="url(#scoreGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5 text-sm text-slate-400">
              No Full Posture scan trend available yet.
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="section-title mb-3 text-lg font-bold">Vulnerabilities by Severity</h2>
          {data.vulnerabilityBySeverity?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.vulnerabilityBySeverity}>
                <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count">
                  {data.vulnerabilityBySeverity.map((s) => (
                    <Cell key={s.severity} fill={SEV_COLOR[s.severity] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-5 text-sm text-slate-400">
              No failed findings found.
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active Brand Alerts" value={data.activeBrandAlerts} />
        <StatCard label="Training Completion" value={`${data.trainingCompletionPercent}%`} />
        <StatCard label="Current Grade" value={grade} />
      </section>
    </div>
  );
}
