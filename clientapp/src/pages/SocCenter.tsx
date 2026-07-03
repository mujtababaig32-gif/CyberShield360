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
  id: string;
  title: string;
  severity: string;
  source: string;
  status: string;
  priority: string;
  category: string;
  mitreTactic: string;
  affectedAssetCount: number;
  affectedAssets: string[];
  occurrenceCount: number;
  firstSeenUtc: string;
  lastSeenUtc: string;
  createdUtc: string;
  sourceScanIds?: string[];
  recommendation?: string;
  businessImpact?: string;
};

type SocSummary = {
  generatedUtc?: string;
  monitoredAssets?: number;
  totalSignals?: number;
  groupedAlerts?: number;
  deduplicatedSignals?: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  openIncidents: number;
  resolvedIncidents: number;
  mttrHours: number;
  statusSummary?: { status: string; count: number }[];
  categorySummary?: { category: string; count: number }[];
  alerts: SocAlert[];
};

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

const severityOptions = ["All", "Critical", "High", "Medium", "Low"];
const statusOptions = ["All", "Open", "In Progress", "Monitoring", "Resolved"];

export default function SocCenter() {
  const [data, setData] = useState<SocSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await SocApi.summary();
      setData(result);
    } catch {
      setError("Failed to load SOC center. Please refresh or check backend connectivity.");
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

  const filteredAlerts = useMemo(() => {
    if (!data) return [];

    return data.alerts.filter((alert) => {
      const severityMatch = severityFilter === "All" || alert.severity === severityFilter;
      const statusMatch = statusFilter === "All" || alert.status === statusFilter;
      return severityMatch && statusMatch;
    });
  }, [data, severityFilter, statusFilter]);

  const topCategory = useMemo(() => {
    const categories = data?.categorySummary ?? [];
    return categories.length > 0 ? categories[0] : null;
  }, [data]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm font-semibold text-red-300">
        <div>{error}</div>
        <button type="button" onClick={load} className="mt-4 rounded-xl border border-red-500/30 px-4 py-2 text-xs font-black uppercase tracking-wide">
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <div className="h-4 w-48 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-8 w-80 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-4 max-w-3xl animate-pulse rounded-full bg-white/10" />
        </div>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-3xl border border-white/10 bg-slate-900/70" />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
              Security Operations
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              SOC / Incident Response Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Deduplicated alert queue built from the latest completed Full Posture scan for each monitored asset.
            </p>
          </div>

          <button type="button" onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Source of Truth</div>
            <div className="mt-2 text-sm font-semibold text-white">Latest completed Full Posture scans</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Noise Reduction</div>
            <div className="mt-2 text-sm font-semibold text-white">
              {data.deduplicatedSignals ?? 0} duplicate signal(s) grouped
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Generated</div>
            <div className="mt-2 text-sm font-semibold text-white">{dateText(data.generatedUtc)}</div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Critical Groups" value={data.criticalAlerts} hint="Immediate attention" tone="red" />
        <CyberStatCard label="High Groups" value={data.highAlerts} hint="Priority triage" tone="red" />
        <CyberStatCard label="Medium Groups" value={data.mediumAlerts} hint="Planned handling" tone="orange" />
        <CyberStatCard label="Low Groups" value={data.lowAlerts} hint="Monitor" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <CyberStatCard label="Open Alert Groups" value={data.openIncidents} hint="Deduplicated queue" tone={data.openIncidents > 0 ? "orange" : "green"} />
        <CyberStatCard label="Raw Failed Signals" value={data.totalSignals ?? 0} hint="Before grouping" tone="slate" />
        <CyberStatCard label="Resolved Signals" value={data.resolvedIncidents} hint="Passed latest checks" tone="green" />
        <CyberStatCard label="MTTR Target" value={`${data.mttrHours}h`} hint="Response objective" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CyberChartCard
            title="Deduplicated Alert Severity Distribution"
            description="Grouped by finding type, severity, recommendation, and affected assets."
            insight={
              data.criticalAlerts > 0
                ? `${data.criticalAlerts} critical group(s) should be reviewed first.`
                : topCategory
                  ? `${topCategory.category} is the largest current alert category.`
                  : "No active grouped SOC alerts are currently reported."
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
              Alert Categories
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Grouped operational view by security domain.
            </p>
          </div>

          <div className="space-y-3">
            {(data.categorySummary ?? []).slice(0, 5).map((item) => (
              <div
                key={item.category}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div>
                  <div className="font-semibold text-white">{item.category}</div>
                  <div className="mt-1 text-xs text-slate-500">Grouped alert category</div>
                </div>
                <CyberStatusBadge value={`${item.count} alert${item.count === 1 ? "" : "s"}`} />
              </div>
            ))}

            {(data.categorySummary ?? []).length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-500">
                No alert categories to display.
              </div>
            )}
          </div>
        </section>
      </section>

      <CyberTable
        title="Deduplicated Alert Queue"
        description="Repeated findings are grouped so analysts see actionable alerts instead of duplicated noise."
        data={filteredAlerts}
        emptyText="No alerts match the selected filters."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 outline-none focus:border-brand-500/60"
            >
              {severityOptions.map((option) => (
                <option key={option} value={option}>{option} Severity</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 outline-none focus:border-brand-500/60"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option} Status</option>
              ))}
            </select>
          </div>
        }
        columns={[
          {
            key: "alert",
            label: "Alert Group",
            align: "left",
            render: (alert) => (
              <div className="min-w-80 text-left">
                <div className="font-semibold leading-6 text-white">{alert.title}</div>
                <div className="mt-1 text-xs text-slate-500">Source: {alert.source}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <CyberStatusBadge value={alert.category} />
                  <CyberStatusBadge value={alert.mitreTactic} />
                </div>
              </div>
            ),
          },
          {
            key: "severity",
            label: "Severity",
            render: (alert) => <CyberStatusBadge value={alert.severity} />,
          },
          {
            key: "status",
            label: "Status",
            render: (alert) => <CyberStatusBadge value={alert.status} />,
          },
          {
            key: "assets",
            label: "Affected Assets",
            align: "left",
            render: (alert) => (
              <div className="min-w-64 text-left">
                <div className="font-semibold text-white">{alert.affectedAssetCount} asset{alert.affectedAssetCount === 1 ? "" : "s"}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">
                  {alert.affectedAssets.length > 0 ? alert.affectedAssets.join(", ") : "No asset context"}
                </div>
              </div>
            ),
          },
          {
            key: "signals",
            label: "Signals",
            render: (alert) => (
              <div className="text-center">
                <div className="font-black text-white">{alert.occurrenceCount}</div>
                <div className="text-xs text-slate-500">grouped</div>
              </div>
            ),
          },
          {
            key: "lastSeen",
            label: "Last Seen",
            render: (alert) => (
              <div className="whitespace-nowrap text-slate-400">{dateText(alert.lastSeenUtc ?? alert.createdUtc)}</div>
            ),
          },
          {
            key: "recommendation",
            label: "Recommended Action",
            align: "left",
            render: (alert) => (
              <div className="min-w-96 text-left text-sm leading-6 text-slate-400">
                <div>{alert.recommendation ?? "Review and investigate this grouped alert."}</div>
                {alert.businessImpact && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-500">
                    {alert.businessImpact}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "priority",
            label: "Priority",
            render: (alert) => <CyberStatusBadge value={alert.priority} />,
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
        <h2 className="text-lg font-black tracking-tight text-white">How SOC Noise Is Reduced</h2>
        <p className="mx-auto mt-2 max-w-4xl text-sm leading-7 text-slate-400">
          CyberShield360 now groups repeated scan failures by check type, severity, recommendation, and affected assets.
          This keeps the SOC view useful for demos and operations by showing alert groups instead of flooding the queue with duplicate raw findings.
        </p>
      </section>
    </div>
  );
}
