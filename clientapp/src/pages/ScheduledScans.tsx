import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AssetApi, ScheduledScanApi } from "../api/endpoints";
import type { Asset, ScheduledScan } from "../types";

const FREQUENCIES = [
  { label: "Daily at 2 AM UTC", cron: "0 2 * * *" },
  { label: "Weekdays at 2 AM UTC", cron: "0 2 * * 1-5" },
  { label: "Weekly on Monday at 2 AM UTC", cron: "0 2 * * 1" },
  { label: "Monthly on 1st at 2 AM UTC", cron: "0 2 1 * *" },
  { label: "Custom cron", cron: "custom" },
];

const SCAN_TYPES = [
  { value: 6, label: "Full Posture" },
  { value: 0, label: "SSL/TLS" },
  { value: 1, label: "HTTP Headers" },
  { value: 2, label: "DNS" },
  { value: 3, label: "SPF" },
  { value: 4, label: "DKIM" },
  { value: 5, label: "DMARC" },
];

function scanTypeLabel(value: number | string | undefined) {
  if (typeof value === "string" && Number.isNaN(Number(value))) return value;
  const numeric = Number(value);
  return SCAN_TYPES.find((s) => s.value === numeric)?.label ?? "Security Scan";
}

function cronLabel(cron: string) {
  return FREQUENCIES.find((f) => f.cron === cron)?.label ?? cron;
}

function dateText(value?: string) {
  return value ? new Date(value).toLocaleString() : "Not scheduled yet";
}

function statusBadge(enabled: boolean) {
  return enabled ? "bg-green-600" : "bg-gray-500";
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

export default function ScheduledScans() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [schedules, setSchedules] = useState<ScheduledScan[]>([]);

  const [assetId, setAssetId] = useState("");
  const [scanType, setScanType] = useState(6);
  const [frequency, setFrequency] = useState("0 2 * * 1");
  const [customCron, setCustomCron] = useState("0 2 * * *");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCron = frequency === "custom" ? customCron : frequency;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const [assetResult, scheduleResult] = await Promise.all([
        AssetApi.list(),
        ScheduledScanApi.list(),
      ]);

      setAssets(assetResult);
      setSchedules(scheduleResult);

      if (!assetId && assetResult.length > 0) {
        setAssetId(assetResult[0].id);
      }
    } catch {
      setError("Failed to load scheduled scans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();

    return {
      total: schedules.length,
      enabled: schedules.filter((s) => s.enabled).length,
      paused: schedules.filter((s) => !s.enabled).length,
      due: schedules.filter((s) => s.enabled && s.nextRunUtc && new Date(s.nextRunUtc).getTime() <= now).length,
    };
  }, [schedules]);

  const create = async (e: FormEvent) => {
    e.preventDefault();

    if (!assetId) {
      setError("Add an asset first before creating a schedule.");
      return;
    }

    if (!selectedCron.trim() || selectedCron.trim().split(/\s+/).length !== 5) {
      setError("Cron must be a standard 5-field expression, for example 0 2 * * *.");
      return;
    }

    try {
      setCreating(true);
      setMsg("Creating scheduled scan...");
      setError(null);

      await ScheduledScanApi.create(assetId, scanType, selectedCron.trim());

      setMsg("Scheduled scan created successfully.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create scheduled scan.");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (schedule: ScheduledScan) => {
    try {
      setBusyId(schedule.id);
      setError(null);
      await ScheduledScanApi.toggle(schedule.id, !schedule.enabled);
      setMsg(schedule.enabled ? "Schedule paused." : "Schedule enabled.");
      await load();
    } catch {
      setError("Failed to update schedule.");
    } finally {
      setBusyId(null);
    }
  };

  const runNow = async (schedule: ScheduledScan) => {
    try {
      setBusyId(schedule.id);
      setError(null);
      setMsg(`Running ${schedule.assetDomain ?? "asset"} scan now...`);
      await ScheduledScanApi.runNow(schedule.id);
      setMsg("Scheduled scan ran successfully.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to run scheduled scan now.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteSchedule = async (schedule: ScheduledScan) => {
    const ok = window.confirm(`Delete schedule for ${schedule.assetDomain ?? schedule.assetId}?`);
    if (!ok) return;

    try {
      setBusyId(schedule.id);
      setError(null);
      await ScheduledScanApi.delete(schedule.id);
      setMsg("Scheduled scan deleted.");
      await load();
    } catch {
      setError("Failed to delete schedule. Tenant Admin role may be required.");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    downloadCsv("cybershield360-scheduled-scans.csv", [
      ["Asset", "Scan Type", "Cron", "Status", "Last Run UTC", "Next Run UTC"],
      ...schedules.map((s) => [
        s.assetDomain ?? s.assetId,
        s.typeName ?? scanTypeLabel(s.type),
        s.cronExpression,
        s.enabled ? "Enabled" : "Paused",
        s.lastRunUtc ?? "",
        s.nextRunUtc ?? "",
      ]),
    ]);
  };

  return (
    <div>
      <header className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Scheduled Scans</h1>
          <p className="text-sm text-gray-500">
            Automate recurring posture scans, run schedules on demand, and manage scan cadence per asset.
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
            disabled={schedules.length === 0}
            className="btn-ghost border border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">Total Schedules</div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">Enabled</div>
          <div className="text-3xl font-bold text-green-600">{stats.enabled}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">Paused</div>
          <div className="text-3xl font-bold">{stats.paused}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">Due Now</div>
          <div className="text-3xl font-bold text-orange-500">{stats.due}</div>
        </div>
      </section>

      {msg && (
        <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-500 p-3 text-sm mb-4">
          {msg}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 p-3 text-sm mb-4 dark:bg-red-950 dark:border-red-900">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <form onSubmit={create} className="card xl:col-span-1 space-y-4">
          <div>
            <h2 className="font-semibold">Create Schedule</h2>
            <p className="text-sm text-gray-500">Full Posture is recommended for executive reports.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Asset</label>
            <select
              className="input mt-1"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              disabled={assets.length === 0}
            >
              {assets.length === 0 && <option value="">No assets available</option>}
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.domain}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Scan Type</label>
            <select
              className="input mt-1"
              value={scanType}
              onChange={(e) => setScanType(Number(e.target.value))}
            >
              {SCAN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Frequency</label>
            <select
              className="input mt-1"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.cron} value={f.cron}>{f.label}</option>
              ))}
            </select>
          </div>

          {frequency === "custom" && (
            <div>
              <label className="text-sm font-medium">Custom Cron</label>
              <input
                className="input mt-1 font-mono"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="0 2 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">Use standard 5-field cron format.</p>
            </div>
          )}

          <button
            className="btn-primary w-full justify-center disabled:opacity-50"
            disabled={creating || assets.length === 0}
          >
            {creating ? "Creating..." : "Create Scheduled Scan"}
          </button>
        </form>

        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold">Schedules</h2>
              <p className="text-sm text-gray-500">Run, pause, resume, or remove existing schedules.</p>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-sm text-gray-500">
              No scheduled scans yet. Create one from the form on the left.
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => {
                const isBusy = busyId === schedule.id;

                return (
                  <div
                    key={schedule.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <div className="font-semibold break-all">{schedule.assetDomain ?? schedule.assetId}</div>
                          <span className={`badge ${statusBadge(schedule.enabled)}`}>
                            {schedule.enabled ? "Enabled" : "Paused"}
                          </span>
                          <span className="badge bg-brand-600">
                            {schedule.typeName ?? scanTypeLabel(schedule.type)}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500">Frequency: {cronLabel(schedule.cronExpression)}</div>
                        <div className="text-xs text-gray-500">Cron: {schedule.cronExpression}</div>
                        <div className="text-xs text-gray-500">Last Run: {dateText(schedule.lastRunUtc)}</div>
                        <div className="text-xs text-gray-500">Next Run: {dateText(schedule.nextRunUtc)}</div>
                      </div>

                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          onClick={() => runNow(schedule)}
                          disabled={isBusy}
                          className="btn-primary text-xs disabled:opacity-50"
                        >
                          {isBusy ? "Working..." : "Run Now"}
                        </button>

                        <button
                          onClick={() => toggle(schedule)}
                          disabled={isBusy}
                          className="btn-ghost text-xs border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                        >
                          {schedule.enabled ? "Pause" : "Resume"}
                        </button>

                        <button
                          onClick={() => deleteSchedule(schedule)}
                          disabled={isBusy}
                          className="btn-ghost text-xs border border-red-200 text-red-600 dark:border-red-900 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

