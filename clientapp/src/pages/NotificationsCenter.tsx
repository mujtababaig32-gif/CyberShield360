import { useEffect, useMemo, useState } from "react";
import { NotificationsApi } from "../api/endpoints";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  severity: string;
  status: string;
  channel?: string;
  recipient?: string;
  error?: string | null;
  createdUtc: string;
  sentAtUtc?: string | null;
};

type Summary = {
  generatedUtc: string;
  totalNotifications: number;
  unreadNotifications: number;
  criticalNotifications: number;
  warningNotifications: number;
  openRisks?: number;
  openVulnerabilities?: number;
  notifications: NotificationItem[];
  categories: { name: string; count: number }[];
  recommendations: string[];
};

const TABS = ["Overview", "Inbox", "Critical", "Delivery", "Settings"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("critical") || v.includes("failed")) return "bg-red-600";
  if (v.includes("warning") || v.includes("pending")) return "bg-orange-500";
  if (v.includes("delivered") || v.includes("read")) return "bg-green-600";
  if (v.includes("info")) return "bg-brand-600";
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

export default function NotificationsCenter() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [severity, setSeverity] = useState("All");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await NotificationsApi.summary());
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.notifications.filter((n) => {
      const matchesQuery = !q || [n.title, n.message, n.category, n.recipient, n.status].some((x) => String(x ?? "").toLowerCase().includes(q));
      const matchesCategory = category === "All" || n.category === category;
      const matchesSeverity = severity === "All" || n.severity === severity;
      return matchesQuery && matchesCategory && matchesSeverity;
    });
  }, [data, query, category, severity]);

  const exportNotifications = () => downloadCsv("cybershield360-notifications.csv", [
    ["Title", "Category", "Severity", "Status", "Channel", "Recipient", "Message", "Error", "Created UTC"],
    ...filtered.map((n) => [n.title, n.category, n.severity, n.status, n.channel ?? "", n.recipient ?? "", n.message, n.error ?? "", n.createdUtc]),
  ]);

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900 dark:bg-red-950">{error}</div>;
  if (loading || !data) return <div className="card text-sm text-slate-500">Loading notifications...</div>;


  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-black tracking-tight">Notifications</h1><p className="section-subtitle">Email delivery, system alerts, security reminders, and owner notifications.</p></div>
        <div className="flex gap-2"><button onClick={load} className="btn-ghost">Refresh</button><button onClick={exportNotifications} className="btn-primary">Export CSV</button></div>
      </header>

      <div className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={tab === t ? "btn-primary" : "btn-ghost"}>{t}</button>)}</div>

      {tab === "Overview" && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="metric-card"><div className="section-subtitle">Total</div><div className="text-3xl font-black">{data.totalNotifications}</div></div>
            <div className="metric-card"><div className="section-subtitle">Pending / Unread</div><div className="text-3xl font-black text-orange-500">{data.unreadNotifications}</div></div>
            <div className="metric-card"><div className="section-subtitle">Critical</div><div className="text-3xl font-black text-red-600">{data.criticalNotifications}</div></div>
            <div className="metric-card"><div className="section-subtitle">Open Risks</div><div className="text-3xl font-black text-brand-500">{data.openRisks ?? 0}</div></div>
            <div className="metric-card"><div className="section-subtitle">Open Vulns</div><div className="text-3xl font-black text-purple-500">{data.openVulnerabilities ?? 0}</div></div>
          </section>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="card"><h2 className="section-title mb-4">Delivery Recommendations</h2><div className="space-y-3">{data.recommendations.map((r) => <div key={r} className="rounded-2xl border border-slate-200 p-4 font-medium dark:border-slate-800">{r}</div>)}</div></div>
            <div className="card"><h2 className="section-title mb-4">Categories</h2><div className="space-y-3">{data.categories.map((c) => <div key={c.name} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 dark:border-slate-800"><span className="font-semibold">{c.name}</span><span className="badge bg-brand-600">{c.count}</span></div>)}</div></div>
          </section>
        </>
      )}

      {(tab === "Inbox" || tab === "Critical" || tab === "Delivery") && (
        <div className="card">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div><h2 className="section-title">{tab === "Inbox" ? "Notification Inbox" : tab === "Critical" ? "Critical Alerts" : "Delivery Health"}</h2><p className="section-subtitle">SMTP delivery depends on backend configuration and verified sender credentials.</p></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><input className="input" placeholder="Search notifications..." value={query} onChange={(e) => setQuery(e.target.value)} /><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option>{data.categories.map((c) => <option key={c.name}>{c.name}</option>)}</select><select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}><option>All</option><option>Critical</option><option>Warning</option><option>Info</option></select></div>
          </div>
          <div className="space-y-3">
            {filtered.filter((n) => tab === "Inbox" || (tab === "Critical" ? n.severity === "Critical" : n.status !== "Delivered" || n.error)).map((n) => (
              <div key={n.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="font-bold">{n.title}</div><div className="mt-1 text-sm text-slate-500">{n.message}</div><div className="mt-2 text-xs text-slate-500">To: {n.recipient ?? "N/A"} • {new Date(n.createdUtc).toLocaleString()}</div>{n.error && <div className="mt-2 text-xs text-red-500">{n.error}</div>}</div><div className="flex flex-wrap gap-2"><span className={`badge ${badgeColor(n.severity)}`}>{n.severity}</span><span className={`badge ${badgeColor(n.status)}`}>{n.status}</span></div></div>
              </div>
            ))}
            {filtered.length === 0 && <div className="empty-state"><div className="text-3xl">🔔</div><div className="mt-2 font-bold">No notifications match your filters.</div></div>}
          </div>
        </div>
      )}

      {tab === "Settings" && (
        <div className="card"><h2 className="section-title mb-2">Notification Settings</h2><p className="section-subtitle">Configure SMTP in backend settings/environment variables. The UI reflects delivery logs from the database.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">{[["Email SMTP", "Use Gmail App Password, SendGrid, Resend, or another SMTP provider."], ["Risk Reminders", "Notify owners for overdue risks and vulnerabilities."], ["Audit Evidence", "Keep delivery logs for customer support and audit evidence."]].map(([a,b]) => <div key={a} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="font-bold">{a}</div><div className="text-sm text-slate-500">{b}</div></div>)}</div></div>
      )}
    </div>
  );
}
