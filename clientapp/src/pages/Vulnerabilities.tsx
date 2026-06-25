import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AssetApi, VulnApi } from "../api/endpoints";
import type { Asset, Vulnerability } from "../types";
import { SeverityBadge } from "../components/ui";

const STATUSES = ["Open", "InProgress", "Remediated", "Accepted", "FalsePositive"];
const SEVERITIES = ["Critical", "High", "Medium", "Low", "Info"];

const STATUS_LABELS: Record<string, string> = {
  "0": "Open",
  "1": "InProgress",
  "2": "Remediated",
  "3": "Accepted",
  "4": "FalsePositive",
  Open: "Open",
  InProgress: "In Progress",
  Remediated: "Remediated",
  Accepted: "Accepted",
  FalsePositive: "False Positive",
};

const SEVERITY_LABELS: Record<string, string> = {
  "0": "Info",
  "1": "Low",
  "2": "Medium",
  "3": "High",
  "4": "Critical",
  Info: "Info",
  Low: "Low",
  Medium: "Medium",
  High: "High",
  Critical: "Critical",
};

function severityLabel(value: string | number | undefined) {
  return SEVERITY_LABELS[String(value ?? "")] ?? String(value ?? "Unknown");
}

function statusValue(value: string | number | undefined) {
  const label = STATUS_LABELS[String(value ?? "")] ?? String(value ?? "Open");
  return label.replace(" ", "");
}

function statusLabel(value: string | number | undefined) {
  return STATUS_LABELS[String(value ?? "")] ?? String(value ?? "Unknown");
}

function statusBadge(status: string) {
  if (status === "Open") return "bg-red-600";
  if (status === "InProgress") return "bg-orange-500";
  if (status === "Remediated") return "bg-green-600";
  if (status === "Accepted") return "bg-gray-600";
  return "bg-brand-600";
}

function daysUntil(date?: string) {
  if (!date) return "No due date";
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  return `${days} days left`;
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((r) => r.map(csvSafe).join(",")).join("\n");
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

export default function Vulnerabilities() {
  const [items, setItems] = useState<Vulnerability[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    cveId: "",
    cvssScore: "",
    severity: "High",
    assetId: "",
    dueDateUtc: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const [vulnResult, assetResult] = await Promise.all([
        VulnApi.list({
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
          pageSize: 100,
        }),
        AssetApi.list(),
      ]);

      setItems(vulnResult.items);
      setAssets(assetResult);
    } catch {
      setError("Failed to load vulnerabilities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, severityFilter]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((v) =>
      [v.title, v.cveId, v.assignedToUserId, statusLabel(v.status), severityLabel(v.severity)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [items, search]);

  const stats = useMemo(() => {
    const open = items.filter((v) => statusValue(v.status) === "Open");
    return {
      total: items.length,
      open: open.length,
      critical: open.filter((v) => severityLabel(v.severity) === "Critical").length,
      high: open.filter((v) => severityLabel(v.severity) === "High").length,
      overdue: open.filter((v) => v.dueDateUtc && new Date(v.dueDateUtc).getTime() < Date.now()).length,
    };
  }, [items]);

  const updateStatus = async (id: string, status: string) => {
    try {
      setMsg("Updating vulnerability status...");
      setError(null);
      await VulnApi.updateStatus(id, status);
      setMsg("Vulnerability status updated.");
      await load();
    } catch {
      setError("Failed to update vulnerability status.");
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      setSaving(true);
      setMsg("Creating vulnerability...");
      setError(null);

      await VulnApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        cveId: form.cveId.trim() || undefined,
        cvssScore: form.cvssScore ? Number(form.cvssScore) : null,
        severity: form.severity,
        assetId: form.assetId || null,
        dueDateUtc: form.dueDateUtc ? new Date(form.dueDateUtc).toISOString() : null,
      });

      setForm({
        title: "",
        description: "",
        cveId: "",
        cvssScore: "",
        severity: "High",
        assetId: "",
        dueDateUtc: "",
      });
      setShowCreate(false);
      setMsg("Vulnerability created successfully.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create vulnerability.");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    downloadCsv("cybershield360-vulnerabilities.csv", [
      ["Title", "CVE", "CVSS", "Severity", "Status", "Due Date", "Assigned To"],
      ...filteredItems.map((v) => [
        v.title,
        v.cveId ?? "",
        v.cvssScore ?? "",
        severityLabel(v.severity),
        statusLabel(v.status),
        v.dueDateUtc ?? "",
        v.assignedToUserId ?? "",
      ]),
    ]);
  };

  return (
    <div>
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vulnerabilities</h1>
          <p className="text-sm text-gray-500">
            Track scanner-created and manually-added vulnerabilities through remediation.
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
          <button
            onClick={exportCsv}
            disabled={filteredItems.length === 0}
            className="btn-ghost border border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button onClick={() => setShowCreate((v) => !v)} className="btn-primary">
            {showCreate ? "Close Form" : "Add Vulnerability"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card"><div className="text-xs text-gray-500">Total</div><div className="text-3xl font-bold">{stats.total}</div></div>
        <div className="card"><div className="text-xs text-gray-500">Open</div><div className="text-3xl font-bold text-red-600">{stats.open}</div></div>
        <div className="card"><div className="text-xs text-gray-500">Critical Open</div><div className="text-3xl font-bold text-red-700">{stats.critical}</div></div>
        <div className="card"><div className="text-xs text-gray-500">High Open</div><div className="text-3xl font-bold text-orange-500">{stats.high}</div></div>
        <div className="card"><div className="text-xs text-gray-500">Overdue</div><div className="text-3xl font-bold text-red-600">{stats.overdue}</div></div>
      </section>

      {msg && <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-500 p-3 text-sm mb-4">{msg}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 p-3 text-sm mb-4 dark:bg-red-950 dark:border-red-900">{error}</div>}

      {showCreate && (
        <form onSubmit={create} className="card mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <h2 className="font-semibold">Create Vulnerability</h2>
            <p className="text-sm text-gray-500">Use this for manual findings that are not generated by scans.</p>
          </div>

          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="CVE ID, e.g. CVE-2026-0001" value={form.cveId} onChange={(e) => setForm({ ...form, cveId: e.target.value })} />

          <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>

          <input className="input" type="number" min="0" max="10" step="0.1" placeholder="CVSS score" value={form.cvssScore} onChange={(e) => setForm({ ...form, cvssScore: e.target.value })} />

          <select className="input" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
            <option value="">No asset selected</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.domain}</option>)}
          </select>

          <input className="input" type="date" value={form.dueDateUtc} onChange={(e) => setForm({ ...form, dueDateUtc: e.target.value })} />

          <textarea
            className="input lg:col-span-2 min-h-24"
            placeholder="Description / evidence / remediation context"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="lg:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost border border-gray-200 dark:border-gray-700">Cancel</button>
            <button className="btn-primary disabled:opacity-50" disabled={saving}>{saving ? "Saving..." : "Create Vulnerability"}</button>
          </div>
        </form>
      )}

      <div className="card mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="input"
          placeholder="Search title, CVE, status, severity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>

        <select className="input" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <th className="py-2">Title</th>
                <th>CVE</th>
                <th>CVSS</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Due</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-6 text-center text-gray-500">Loading vulnerabilities...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-gray-500">No vulnerabilities found.</td></tr>
              ) : filteredItems.map((v) => {
                const currentStatus = statusValue(v.status);

                return (
                  <tr key={v.id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                    <td className="py-3 min-w-72">
                      <div className="font-semibold">{v.title}</div>
                      <div className="text-xs text-gray-500">{v.assignedToUserId ? `Owner: ${v.assignedToUserId}` : "Unassigned"}</div>
                    </td>
                    <td className="text-gray-500 whitespace-nowrap">{v.cveId ?? "-"}</td>
                    <td>{v.cvssScore ?? "-"}</td>
                    <td><SeverityBadge severity={severityLabel(v.severity)} /></td>
                    <td><span className={`badge ${statusBadge(currentStatus)}`}>{statusLabel(v.status)}</span></td>
                    <td className="text-gray-500 whitespace-nowrap">{daysUntil(v.dueDateUtc)}</td>
                    <td>
                      <select
                        className="input py-1 min-w-40"
                        value={currentStatus}
                        onChange={(e) => updateStatus(v.id, e.target.value)}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

