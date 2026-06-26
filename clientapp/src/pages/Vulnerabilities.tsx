import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AssetApi, VulnApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import type { Asset, Vulnerability } from "../types";

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

function daysUntil(date?: string | null) {
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

function businessImpact(vulnerability: Vulnerability) {
  const severity = severityLabel(vulnerability.severity);

  if (severity === "Critical") {
    return "Immediate business risk. This issue may expose sensitive systems or create a serious compromise path.";
  }

  if (severity === "High") {
    return "High business impact. Attackers may abuse this weakness if it remains unresolved.";
  }

  if (severity === "Medium") {
    return "Moderate risk. This should be planned for remediation before it becomes a larger exposure.";
  }

  if (severity === "Low") {
    return "Lower risk, but fixing it improves the overall security posture.";
  }

  return "Informational finding that helps improve visibility and reporting quality.";
}

function recommendedFix(vulnerability: Vulnerability) {
  if (vulnerability.description?.trim()) {
    return vulnerability.description;
  }

  const title = vulnerability.title.toLowerCase();

  if (title.includes("dmarc")) {
    return "Add or strengthen the DMARC DNS record and verify it through a rescan.";
  }

  if (title.includes("spf")) {
    return "Review SPF records and limit authorized senders to trusted mail providers.";
  }

  if (title.includes("ssl") || title.includes("tls") || title.includes("certificate")) {
    return "Update the certificate/TLS configuration and confirm HTTPS is enforced.";
  }

  if (title.includes("header") || title.includes("hsts")) {
    return "Add the recommended HTTP security headers and verify them after deployment.";
  }

  if (title.includes("admin")) {
    return "Restrict admin access, enable MFA, and harden authentication controls.";
  }

  return "Review the finding evidence, apply the recommended remediation, and verify with a follow-up scan.";
}

function trainingRequired(vulnerability: Vulnerability) {
  const title = vulnerability.title.toLowerCase();
  const severity = severityLabel(vulnerability.severity);

  if (title.includes("dmarc") || title.includes("spf") || title.includes("email")) {
    return "Email spoofing awareness";
  }

  if (title.includes("admin") || title.includes("password") || title.includes("mfa")) {
    return "Website admin safety";
  }

  if (severity === "Critical" || severity === "High") {
    return "Security awareness briefing";
  }

  return "Not required";
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
    void load();
  }, [statusFilter, severityFilter]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((v) =>
      [
        v.title,
        v.cveId,
        v.assignedToUserId,
        statusLabel(v.status),
        severityLabel(v.severity),
      ]
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
      overdue: open.filter(
        (v) => v.dueDateUtc && new Date(v.dueDateUtc).getTime() < Date.now()
      ).length,
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

  const create = async (e: FormEvent<HTMLFormElement>) => {
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
      [
        "Title",
        "CVE",
        "CVSS",
        "Severity",
        "Status",
        "Business Impact",
        "Recommended Fix",
        "Training Required",
        "Due Date",
        "Assigned To",
      ],
      ...filteredItems.map((v) => [
        v.title,
        v.cveId ?? "",
        v.cvssScore ?? "",
        severityLabel(v.severity),
        statusLabel(v.status),
        businessImpact(v),
        recommendedFix(v),
        trainingRequired(v),
        v.dueDateUtc ?? "",
        v.assignedToUserId ?? "",
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Vulnerabilities</h1>
          <p className="text-sm text-gray-500">
            Track scan findings, business impact, recommended fixes, and remediation status.
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

          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredItems.length === 0}
            className="btn-ghost disabled:opacity-50"
          >
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="btn-primary"
          >
            {showCreate ? "Close Form" : "Add Vulnerability"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <CyberStatCard label="Total Findings" value={stats.total} hint="All tracked issues" tone="brand" />
        <CyberStatCard label="Open" value={stats.open} hint="Need attention" tone="red" />
        <CyberStatCard label="Critical Open" value={stats.critical} hint="Highest priority" tone="red" />
        <CyberStatCard label="High Open" value={stats.high} hint="Important risks" tone="orange" />
        <CyberStatCard label="Overdue" value={stats.overdue} hint="Past due date" tone="red" />
      </section>

      {msg && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-300">
          {msg}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={create} className="card grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h2 className="font-semibold">Create Vulnerability</h2>
            <p className="text-sm text-gray-500">
              Use this for findings that need to be tracked outside regular scans.
            </p>
          </div>

          <input
            className="input"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <input
            className="input"
            placeholder="CVE ID, e.g. CVE-2026-0001"
            value={form.cveId}
            onChange={(e) => setForm({ ...form, cveId: e.target.value })}
          />

          <select
            className="input"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          >
            {SEVERITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <input
            className="input"
            type="number"
            min="0"
            max="10"
            step="0.1"
            placeholder="CVSS score"
            value={form.cvssScore}
            onChange={(e) => setForm({ ...form, cvssScore: e.target.value })}
          />

          <select
            className="input"
            value={form.assetId}
            onChange={(e) => setForm({ ...form, assetId: e.target.value })}
          >
            <option value="">No asset selected</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.domain}
              </option>
            ))}
          </select>

          <input
            className="input"
            type="date"
            value={form.dueDateUtc}
            onChange={(e) => setForm({ ...form, dueDateUtc: e.target.value })}
          />

          <textarea
            className="input min-h-24 lg:col-span-2"
            placeholder="Description / evidence / remediation context"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="flex justify-end gap-2 lg:col-span-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn-ghost"
            >
              Cancel
            </button>

            <button className="btn-primary disabled:opacity-50" disabled={saving}>
              {saving ? "Saving..." : "Create Vulnerability"}
            </button>
          </div>
        </form>
      )}

      <section className="card grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          className="input"
          placeholder="Search title, CVE, status, severity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </section>

      <CyberTable
        title="Security Findings"
        description="Client-friendly view of detected issues, impact, recommended fixes, and remediation status."
        data={filteredItems}
        emptyText={loading ? "Loading vulnerabilities..." : "No vulnerabilities found."}
        columns={[
          {
            key: "issue",
            label: "Issue",
            render: (v) => (
              <div className="min-w-72">
                <div className="font-semibold text-white">{v.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {v.assignedToUserId ? `Owner: ${v.assignedToUserId}` : "Unassigned"}
                </div>
              </div>
            ),
          },
          {
            key: "cve",
            label: "CVE / CVSS",
            render: (v) => (
              <div className="whitespace-nowrap">
                <div>{v.cveId ?? "-"}</div>
                <div className="mt-1 text-xs text-slate-500">
                  CVSS: {v.cvssScore ?? "-"}
                </div>
              </div>
            ),
          },
          {
            key: "severity",
            label: "Severity",
            render: (v) => <CyberStatusBadge value={severityLabel(v.severity)} />,
          },
          {
            key: "impact",
            label: "Business Impact",
            render: (v) => (
              <div className="min-w-80 text-sm leading-6 text-slate-400">
                {businessImpact(v)}
              </div>
            ),
          },
          {
            key: "fix",
            label: "Recommended Fix",
            render: (v) => (
              <div className="min-w-80 text-sm leading-6 text-slate-400">
                {recommendedFix(v)}
              </div>
            ),
          },
          {
            key: "training",
            label: "Training",
            render: (v) => <CyberStatusBadge value={trainingRequired(v)} />,
          },
          {
            key: "status",
            label: "Status",
            render: (v) => <CyberStatusBadge value={statusLabel(v.status)} />,
          },
          {
            key: "due",
            label: "Due",
            render: (v) => (
              <div className="whitespace-nowrap text-slate-400">
                {daysUntil(v.dueDateUtc)}
              </div>
            ),
          },
          {
            key: "action",
            label: "Action",
            render: (v) => {
              const currentStatus = statusValue(v.status);

              return (
                <select
                  className="input min-w-40 py-1"
                  value={currentStatus}
                  onChange={(e) => updateStatus(v.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              );
            },
          },
        ]}
      />
    </div>
  );
}
