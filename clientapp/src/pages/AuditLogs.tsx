import { useEffect, useMemo, useState } from "react";
import { AuditLogsApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type AuditLog = {
  id: string;
  eventType: string;
  category: string;
  actor: string;
  target: string;
  status: string;
  ipAddress: string;
  description?: string;
  userAgent?: string;
  createdUtc: string;
};

type AuditSummary = {
  generatedUtc: string;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  last24hEvents?: number;
  privilegedEvents?: number;
  categories: { name: string; count: number }[];
  logs: AuditLog[];
  recommendations: string[];
};

const TABS = ["Overview", "Events", "Authentication", "Privileged", "Reports", "Settings"];

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

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function AuditLogs() {
  const [data, setData] = useState<AuditSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await AuditLogsApi.summary();
      setData(result);
    } catch {
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredLogs = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    return data.logs.filter((log) => {
      const matchesQuery =
        !q ||
        [log.eventType, log.category, log.actor, log.target, log.ipAddress, log.description].some((value) =>
          String(value ?? "").toLowerCase().includes(q)
        );
      const matchesStatus = statusFilter === "All" || log.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || log.category === categoryFilter;

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [data, query, statusFilter, categoryFilter]);

  const visibleLogs = useMemo(() => {
    if (tab === "Authentication") {
      return filteredLogs.filter((log) => log.category === "Authentication");
    }

    if (tab === "Privileged") {
      return filteredLogs.filter((log) =>
        ["User Management", "RBAC", "Settings", "Billing"].includes(log.category)
      );
    }

    return filteredLogs;
  }, [filteredLogs, tab]);

  const exportLogs = () => {
    downloadCsv("cybershield360-audit-logs.csv", [
      ["Event", "Category", "Actor", "Target", "Status", "IP Address", "Description", "Created UTC"],
      ...visibleLogs.map((log) => [
        log.eventType,
        log.category,
        log.actor,
        log.target,
        log.status,
        log.ipAddress,
        log.description ?? "",
        log.createdUtc,
      ]),
    ]);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (loading || !data) {
    return <div className="card text-sm text-slate-500">Loading audit logs...</div>;
  }

  const privilegedLogs = data.logs.filter((log) =>
    ["User Management", "RBAC", "Settings", "Billing"].includes(log.category)
  );

  const statuses = ["All", ...Array.from(new Set(data.logs.map((log) => log.status)))];
  const categories = ["All", ...data.categories.map((item) => item.name)];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Audit Logs</h1>
          <p className="section-subtitle">
            Compliance-grade history for authentication, privileged activity, exports, and system events.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={exportLogs} className="btn-primary">
            Export CSV
          </button>
        </div>
      </header>

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CyberStatCard label="Total Events" value={data.totalEvents} hint="Audit records" tone="brand" />
            <CyberStatCard label="Successful" value={data.successfulEvents} hint="Completed events" tone="green" />
            <CyberStatCard label="Failed" value={data.failedEvents} hint="Failed events" tone={data.failedEvents > 0 ? "red" : "green"} />
            <CyberStatCard label="Last 24 Hours" value={data.last24hEvents ?? 0} hint="Recent activity" tone="brand" />
            <CyberStatCard label="Privileged Events" value={data.privilegedEvents ?? privilegedLogs.length} hint="Admin-sensitive" tone="orange" />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Audit Recommendations
                </h2>
              </div>

              <div className="space-y-3">
                {data.recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No audit recommendations available.
                  </div>
                ) : (
                  data.recommendations.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                        Recommendation #{index + 1}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                        {item}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Event Categories
                </h2>
              </div>

              <div className="space-y-3">
                {data.categories.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"
                  >
                    <span className="font-semibold text-white">{item.name}</span>
                    <CyberStatusBadge value={String(item.count)} />
                  </div>
                ))}
              </div>
            </section>
          </section>
        </div>
      )}

      {(tab === "Events" || tab === "Authentication" || tab === "Privileged") && (
        <div className="space-y-6">
          <section className="card grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px]">
            <input
              className="input"
              placeholder="Search events, actor, target, IP..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              className="input"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </section>

          <CyberTable
            title={tab === "Events" ? "Audit Events" : tab === "Authentication" ? "Authentication Events" : "Privileged Events"}
            description={`${visibleLogs.length} event(s) shown from ${data.logs.length} audit records.`}
            data={visibleLogs}
            emptyText="No audit events match this view."
            columns={[
              {
                key: "event",
                label: "Event",
                render: (log) => (
                  <div className="mx-auto min-w-80 text-center">
                    <div className="font-semibold leading-6 text-white">{log.eventType}</div>
                    <div className="mt-1 text-xs text-slate-500">{log.description || log.target}</div>
                  </div>
                ),
              },
              {
                key: "category",
                label: "Category",
                render: (log) => <CyberStatusBadge value={log.category} />,
              },
              {
                key: "status",
                label: "Status",
                render: (log) => <CyberStatusBadge value={log.status} />,
              },
              {
                key: "actor",
                label: "Actor",
                render: (log) => (
                  <div className="mx-auto min-w-56 break-all text-center text-slate-300">
                    {log.actor || "System"}
                  </div>
                ),
              },
              {
                key: "target",
                label: "Target",
                render: (log) => (
                  <div className="mx-auto min-w-56 break-all text-center text-slate-300">
                    {log.target || "-"}
                  </div>
                ),
              },
              {
                key: "ip",
                label: "IP Address",
                render: (log) => <div className="whitespace-nowrap text-slate-300">{log.ipAddress || "-"}</div>,
              },
              {
                key: "created",
                label: "Created",
                render: (log) => (
                  <div className="whitespace-nowrap text-slate-400">
                    {dateText(log.createdUtc)}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {tab === "Reports" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <h2 className="font-black text-white">Audit Log Export</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Export the visible audit log view for compliance review, investigations, and evidence records.
          </p>
          <button type="button" onClick={exportLogs} className="btn-primary mt-4">
            Download CSV
          </button>
        </section>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">Audit Settings</h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Keep audit logging enabled in production and define retention before onboarding clients.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {["Audit logging enabled", "Retention policy defined", "Privileged activity reviewed"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
              >
                <CyberStatusBadge value="Recommended" />
                <div className="mt-3 font-semibold text-white">{item}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="text-xs text-slate-400">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
      </div>
    </div>
  );
}
