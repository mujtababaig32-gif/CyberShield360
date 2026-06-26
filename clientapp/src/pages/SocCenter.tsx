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
import { SocApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type SocAlert = {
  title: string;
  severity: string;
  source: string;
  recommendation?: string;
  createdUtc: string;
};

type SocSummary = {
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  openIncidents: number;
  resolvedIncidents: number;
  mttrHours: number;
  alerts: SocAlert[];
};

function alertPriority(severity: string) {
  if (severity === "Critical") return "Immediate";
  if (severity === "High") return "Priority";
  if (severity === "Medium") return "Planned";
  return "Monitor";
}

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function SocCenter() {
  const [data, setData] = useState<SocSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await SocApi.summary();
      setData(result);
    } catch {
      setError("Failed to load SOC center.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const severityData = useMemo(() => {
    if (!data) return [];

    return [
      { severity: "Critical", count: data.criticalAlerts },
      { severity: "High", count: data.highAlerts },
      { severity: "Medium", count: data.mediumAlerts },
      { severity: "Low", count: data.lowAlerts },
    ];
  }, [data]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-500">Loading SOC center...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            Security Operations
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            SOC / Incident Response Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Security operations view for alerts, incidents, severity triage, and analyst response.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} className="btn-ghost">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Critical Alerts" value={data.criticalAlerts} hint="Immediate attention" tone="red" />
        <CyberStatCard label="High Alerts" value={data.highAlerts} hint="Priority alerts" tone="red" />
        <CyberStatCard label="Medium Alerts" value={data.mediumAlerts} hint="Planned triage" tone="orange" />
        <CyberStatCard label="Low Alerts" value={data.lowAlerts} hint="Monitor" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CyberStatCard label="Open Incidents" value={data.openIncidents} hint="Active response items" tone={data.openIncidents > 0 ? "orange" : "green"} />
        <CyberStatCard label="Resolved Signals" value={data.resolvedIncidents} hint="Closed or handled" tone="green" />
        <CyberStatCard label="MTTR" value={`${data.mttrHours}h`} hint="Mean time to respond" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CyberChartCard
            title="Alert Severity Distribution"
            description="Current alert volume by severity level."
            insight={
              data.criticalAlerts > 0
                ? `${data.criticalAlerts} critical alert(s) should be reviewed first.`
                : "No critical alerts are currently reported."
            }
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="severity" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "14px",
                    color: "#e2e8f0",
                    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
                  }}
                  labelStyle={{ color: "#99f6e4", fontWeight: 800 }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#10B5A6" />
              </BarChart>
            </ResponsiveContainer>
          </CyberChartCard>
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              MITRE ATT&CK Mapping
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Common tactics represented by current alert sources.
            </p>
          </div>

          <div className="space-y-3">
            {[
              ["Initial Access", "Public exposure and weak web controls"],
              ["Discovery", "Technology fingerprinting and exposed services"],
              ["Credential Access", "Email authentication and spoofing weaknesses"],
              ["Impact", "Weak posture increasing business risk"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
              >
                <div className="font-semibold text-white">{title}</div>
                <div className="mt-1 text-xs text-slate-500">{text}</div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <CyberTable
        title="Alert Queue"
        description="Current alert queue with source, created time, recommendation, and priority."
        data={data.alerts}
        emptyText="No active alerts."
        columns={[
          {
            key: "alert",
            label: "Alert",
            render: (alert) => (
              <div className="mx-auto min-w-72 text-center">
                <div className="font-semibold leading-6 text-white">{alert.title}</div>
                <div className="mt-1 text-xs text-slate-500">Source: {alert.source}</div>
              </div>
            ),
          },
          {
            key: "severity",
            label: "Severity",
            render: (alert) => <CyberStatusBadge value={alert.severity} />,
          },
          {
            key: "created",
            label: "Created",
            render: (alert) => (
              <div className="whitespace-nowrap text-slate-400">{dateText(alert.createdUtc)}</div>
            ),
          },
          {
            key: "recommendation",
            label: "Recommended Action",
            render: (alert) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                {alert.recommendation ?? "Review and investigate this alert."}
              </div>
            ),
          },
          {
            key: "priority",
            label: "Priority",
            render: (alert) => <CyberStatusBadge value={alertPriority(alert.severity)} />,
          },
        ]}
      />
    </div>
  );
}
