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
import { NotificationsApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

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

      const result = await NotificationsApi.summary();
      setData(result);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    return data.notifications.filter((notification) => {
      const matchesQuery =
        !q ||
        [notification.title, notification.message, notification.category, notification.recipient, notification.status].some((value) =>
          String(value ?? "").toLowerCase().includes(q)
        );
      const matchesCategory = category === "All" || notification.category === category;
      const matchesSeverity = severity === "All" || notification.severity === severity;

      return matchesQuery && matchesCategory && matchesSeverity;
    });
  }, [data, query, category, severity]);

  const visibleNotifications = useMemo(() => {
    if (tab === "Critical") {
      return filtered.filter((item) => item.severity === "Critical");
    }

    if (tab === "Delivery") {
      return filtered.filter(
        (item) => item.channel || item.recipient || item.sentAtUtc || item.error
      );
    }

    return filtered;
  }, [filtered, tab]);

  const exportNotifications = () =>
    downloadCsv("cybershield360-notifications.csv", [
      ["Title", "Category", "Severity", "Status", "Channel", "Recipient", "Message", "Error", "Created UTC"],
      ...visibleNotifications.map((notification) => [
        notification.title,
        notification.category,
        notification.severity,
        notification.status,
        notification.channel ?? "",
        notification.recipient ?? "",
        notification.message,
        notification.error ?? "",
        notification.createdUtc,
      ]),
    ]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (loading || !data) {
    return <div className="card text-sm text-slate-500">Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
          <p className="section-subtitle">
            Email delivery, system alerts, security reminders, and owner notifications.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={exportNotifications} className="btn-primary">
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
            <CyberStatCard label="Total" value={data.totalNotifications} hint="All notifications" tone="brand" />
            <CyberStatCard label="Pending / Unread" value={data.unreadNotifications} hint="Needs attention" tone="orange" />
            <CyberStatCard label="Critical" value={data.criticalNotifications} hint="Critical alerts" tone="red" />
            <CyberStatCard label="Open Risks" value={data.openRisks ?? 0} hint="Risk notifications" tone="brand" />
            <CyberStatCard label="Open Vulns" value={data.openVulnerabilities ?? 0} hint="Finding notifications" tone="orange" />
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CyberChartCard
                title="Notification Categories"
                description="Current notification volume by category."
                insight={
                  data.criticalNotifications > 0
                    ? `${data.criticalNotifications} critical notification(s) should be reviewed first.`
                    : "No critical notifications are currently reported."
                }
              >
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.categories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
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
                  Delivery Recommendations
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Improve routing, ownership, and delivery confidence.
                </p>
              </div>

              <div className="space-y-3">
                {data.recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No recommendations available.
                  </div>
                ) : (
                  data.recommendations.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                        Action #{index + 1}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                        {item}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      )}

      {(tab === "Inbox" || tab === "Critical" || tab === "Delivery") && (
        <div className="space-y-6">
          <section className="card grid grid-cols-1 gap-3 xl:grid-cols-[1fr_220px_220px]">
            <input
              className="input"
              placeholder="Search notifications..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>All</option>
              {data.categories.map((item) => (
                <option key={item.name}>{item.name}</option>
              ))}
            </select>
            <select className="input" value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option>All</option>
              <option>Critical</option>
              <option>Warning</option>
              <option>Info</option>
            </select>
          </section>

          <CyberTable
            title={tab === "Inbox" ? "Notification Inbox" : tab === "Critical" ? "Critical Alerts" : "Delivery Health"}
            description="SMTP delivery depends on backend configuration and verified sender credentials."
            data={visibleNotifications}
            emptyText="No notifications match this view."
            columns={[
              {
                key: "notification",
                label: "Notification",
                render: (notification) => (
                  <div className="mx-auto min-w-80 text-center">
                    <div className="font-semibold leading-6 text-white">{notification.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{notification.category}</div>
                  </div>
                ),
              },
              {
                key: "severity",
                label: "Severity",
                render: (notification) => <CyberStatusBadge value={notification.severity} />,
              },
              {
                key: "status",
                label: "Status",
                render: (notification) => <CyberStatusBadge value={notification.status} />,
              },
              {
                key: "delivery",
                label: "Delivery",
                render: (notification) => (
                  <div className="mx-auto min-w-56 text-center text-sm text-slate-300">
                    {notification.channel ?? "System"}
                    <br />
                    {notification.recipient ?? "No recipient"}
                  </div>
                ),
              },
              {
                key: "message",
                label: "Message",
                render: (notification) => (
                  <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                    {notification.message}
                    {notification.error ? (
                      <div className="mt-2 text-red-300">Error: {notification.error}</div>
                    ) : null}
                  </div>
                ),
              },
              {
                key: "created",
                label: "Created",
                render: (notification) => (
                  <div className="whitespace-nowrap text-slate-400">
                    {dateText(notification.createdUtc)}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Notification Settings
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Before production, verify SMTP sender domain, recipient routing, and alert owners.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {["SMTP verified", "Owners assigned", "Critical routing enabled"].map((item) => (
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
