import { useEffect, useMemo, useState } from "react";
import { AuditLogsApi } from "../api/endpoints";

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

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("success") || v.includes("enabled") || v.includes("active")) return "bg-green-600";
  if (v.includes("fail") || v.includes("critical")) return "bg-red-600";
  if (v.includes("auth")) return "bg-orange-500";
  if (v.includes("rbac") || v.includes("user")) return "bg-brand-600";
  return "bg-gray-600";
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

function AuditEventCard({ log }: { log: AuditLog }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${badgeColor(log.status)}`}>{log.status}</span>
            <span className={`badge ${badgeColor(log.category)}`}>{log.category}</span>
          </div>
          <div className="mt-3 break-words text-base font-black">{log.eventType}</div>
          <div className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">{log.description || log.target}</div>
        </div>
        <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
          {new Date(log.createdUtc).toLocaleString()}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <div className="min-w-0 rounded-xl bg-slate-100 p-3 dark:bg-slate-900/70">
          <div className="section-subtitle">Actor</div>
          <div className="break-all font-semibold">{log.actor || "System"}</div>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-100 p-3 dark:bg-slate-900/70">
          <div className="section-subtitle">Target</div>
          <div className="break-all font-semibold">{log.target || "-"}</div>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-100 p-3 dark:bg-slate-900/70">
          <div className="section-subtitle">IP Address</div>
          <div className="break-all font-semibold">{log.ipAddress || "-"}</div>
        </div>
      </div>
    </div>
  );
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
      setData(await AuditLogsApi.summary());
    } catch {
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredLogs = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.logs.filter((log) => {
      const matchesQuery = !q || [log.eventType, log.category, log.actor, log.target, log.ipAddress, log.description]
        .some((x) => String(x ?? "").toLowerCase().includes(q));
      const matchesStatus = statusFilter === "All" || log.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || log.category === categoryFilter;
      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [data, query, statusFilter, categoryFilter]);

  const visibleLogs = useMemo(() => {
    if (tab === "Authentication") return filteredLogs.filter((log) => log.category === "Authentication");
    if (tab === "Privileged") return filteredLogs.filter((log) => ["User Management", "RBAC", "Settings", "Billing"].includes(log.category));
    return filteredLogs;
  }, [filteredLogs, tab]);

  const exportLogs = () => {
    downloadCsv("cybershield360-audit-logs.csv", [
      ["Event", "Category", "Actor", "Target", "Status", "IP Address", "Description", "Created UTC"],
      ...visibleLogs.map((log) => [log.eventType, log.category, log.actor, log.target, log.status, log.ipAddress, log.description ?? "", log.createdUtc]),
    ]);
  };

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900 dark:bg-red-950">{error}</div>;
  if (loading || !data) return <div className="card text-sm text-slate-500">Loading audit logs...</div>;

  const privilegedLogs = data.logs.filter((x) => ["User Management", "RBAC", "Settings", "Billing"].includes(x.category));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Audit Logs</h1>
          <p className="section-subtitle">Compliance-grade history for authentication, privileged activity, exports, and system events.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={load} className="btn-ghost">Refresh</button>
          <button onClick={exportLogs} className="btn-primary">Export CSV</button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={tab === t ? "btn-primary" : "btn-ghost"}>{t}</button>)}
      </div>

      {tab === "Overview" && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="metric-card"><div className="section-subtitle">Total Events</div><div className="mt-2 text-3xl font-black">{data.totalEvents}</div></div>
            <div className="metric-card"><div className="section-subtitle">Successful</div><div className="mt-2 text-3xl font-black text-green-600">{data.successfulEvents}</div></div>
            <div className="metric-card"><div className="section-subtitle">Failed</div><div className="mt-2 text-3xl font-black text-red-600">{data.failedEvents}</div></div>
            <div className="metric-card"><div className="section-subtitle">Last 24 Hours</div><div className="mt-2 text-3xl font-black text-brand-500">{data.last24hEvents ?? 0}</div></div>
            <div className="metric-card"><div className="section-subtitle">Privileged Events</div><div className="mt-2 text-3xl font-black text-orange-500">{data.privilegedEvents ?? privilegedLogs.length}</div></div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="card">
              <h2 className="section-title mb-4">Audit Recommendations</h2>
              <div className="space-y-3">
                {data.recommendations.map((item, i) => (
                  <div key={item} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="text-xs font-bold uppercase tracking-wide text-brand-500">Recommendation {i + 1}</div>
                    <div className="mt-1 font-medium">{item}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h2 className="section-title mb-4">Event Categories</h2>
              <div className="space-y-3">
                {data.categories.map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                    <span className="font-semibold">{c.name}</span>
                    <span className={`badge ${badgeColor(c.name)}`}>{c.count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-slate-500">Generated: {new Date(data.generatedUtc).toLocaleString()}</div>
            </div>
          </section>
        </>
      )}

      {(tab === "Events" || tab === "Authentication" || tab === "Privileged") && (
        <div className="card">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="section-title">{tab === "Events" ? "Audit Event Log" : tab === "Authentication" ? "Authentication Events" : "Privileged Activity"}</h2>
              <p className="section-subtitle">Failed and privileged events are prioritized for investigation. Cards prevent horizontal overflow on smaller screens.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input className="input" placeholder="Search actor, event, target, IP..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option><option>Success</option><option>Failed</option>
              </select>
              <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option>All</option>
                {data.categories.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {visibleLogs.length === 0 ? (
            <div className="empty-state">No audit events match your filters.</div>
          ) : (
            <div className="space-y-3">
              {visibleLogs.map((log) => <AuditEventCard key={log.id} log={log} />)}
            </div>
          )}
        </div>
      )}

      {tab === "Reports" && (
        <div className="card">
          <h2 className="section-title mb-2">Audit Reports</h2>
          <p className="section-subtitle mb-4">Export filtered audit evidence for compliance reviews.</p>
          <button onClick={exportLogs} className="btn-primary">Download Filtered Audit CSV</button>
        </div>
      )}

      {tab === "Settings" && (
        <div className="card">
          <h2 className="section-title mb-2">Audit Retention Settings</h2>
          <p className="section-subtitle">Retention policy controls should be enforced in production storage and backup configuration.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              ["Retention", "12 months recommended"],
              ["Privileged Review", "Weekly admin review"],
              ["Export Evidence", "Before each audit"],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="font-bold">{title}</div>
                <div className="text-sm text-slate-500">{body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
