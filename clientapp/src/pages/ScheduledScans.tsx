import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AssetApi, ScheduledScanApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import type { Asset, ScheduledScan } from "../types";

const FREQUENCIES = [
  { label: "Daily at 2 AM UTC", cron: "0 2 * * *" },
  { label: "Weekdays at 2 AM UTC", cron: "0 2 * * 1-5" },
  { label: "Weekly on Monday at 2 AM UTC", cron: "0 2 * * 1" },
  { label: "Monthly on 1st at 2 AM UTC", cron: "0 2 1 * *" },
  { label: "Custom cron", cron: "custom" },
];

const SCAN_TYPES = [
  { value: 6, label: "Full Posture", description: "Complete assessment for reports" },
  { value: 0, label: "SSL/TLS", description: "Certificate and encryption check" },
  { value: 1, label: "HTTP Headers", description: "Browser protection checks" },
  { value: 2, label: "DNS", description: "Domain records review" },
  { value: 3, label: "SPF", description: "Sender policy validation" },
  { value: 4, label: "DKIM", description: "Email signing validation" },
  { value: 5, label: "DMARC", description: "Email spoofing protection" },
];

function scanTypeLabel(value: number | string | undefined) {
  if (typeof value === "string" && Number.isNaN(Number(value))) return value;

  const numeric = Number(value);
  return SCAN_TYPES.find((scanType) => scanType.value === numeric)?.label ?? "Security Scan";
}

function scanTypeDescription(value: number | string | undefined) {
  const numeric = Number(value);
  return SCAN_TYPES.find((scanType) => scanType.value === numeric)?.description ?? "Scheduled security check";
}

function cronLabel(cron: string) {
  return FREQUENCIES.find((frequency) => frequency.cron === cron)?.label ?? cron;
}

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not scheduled yet";
}

function nextRunStatus(schedule: ScheduledScan) {
  if (!schedule.enabled) return "Paused";
  if (!schedule.nextRunUtc) return "Not Scheduled";

  const nextRun = new Date(schedule.nextRunUtc).getTime();

  if (nextRun <= Date.now()) return "Due Now";

  return "Scheduled";
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
    void load();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();

    return {
      total: schedules.length,
      enabled: schedules.filter((schedule) => schedule.enabled).length,
      paused: schedules.filter((schedule) => !schedule.enabled).length,
      due: schedules.filter(
        (schedule) =>
          schedule.enabled &&
          schedule.nextRunUtc &&
          new Date(schedule.nextRunUtc).getTime() <= now
      ).length,
    };
  }, [schedules]);

  const create = async (e: FormEvent<HTMLFormElement>) => {
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
      ...schedules.map((schedule) => [
        schedule.assetDomain ?? schedule.assetId,
        schedule.typeName ?? scanTypeLabel(schedule.type),
        schedule.cronExpression,
        schedule.enabled ? "Enabled" : "Paused",
        schedule.lastRunUtc ?? "",
        schedule.nextRunUtc ?? "",
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Scheduled Scans</h1>
          <p className="text-sm text-gray-500">
            Schedule recurring posture checks, run scans on demand, and manage review cadence per asset.
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
            disabled={schedules.length === 0}
            className="btn-ghost disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard
          label="Total Schedules"
          value={stats.total}
          hint="All recurring scan plans"
          tone="brand"
        />
        <CyberStatCard
          label="Enabled"
          value={stats.enabled}
          hint="Currently active"
          tone="green"
        />
        <CyberStatCard
          label="Paused"
          value={stats.paused}
          hint="Not currently running"
          tone="slate"
        />
        <CyberStatCard
          label="Due Now"
          value={stats.due}
          hint="Ready to run"
          tone="orange"
        />
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

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <form
          onSubmit={create}
          className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10 xl:col-span-1"
        >
          <div className="mb-5">
            <h2 className="text-lg font-black tracking-tight text-white">
              Create Schedule
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Full Posture is recommended when the client needs executive reports and before/after comparisons.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-200">Asset</label>
              <select
                className="input mt-1"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                disabled={assets.length === 0}
              >
                {assets.length === 0 && <option value="">No assets available</option>}
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.domain}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-200">Scan Type</label>
              <select
                className="input mt-1"
                value={scanType}
                onChange={(e) => setScanType(Number(e.target.value))}
              >
                {SCAN_TYPES.map((scanTypeOption) => (
                  <option key={scanTypeOption.value} value={scanTypeOption.value}>
                    {scanTypeOption.label}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-xs text-slate-500">
                {scanTypeDescription(scanType)}
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-200">Frequency</label>
              <select
                className="input mt-1"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                {FREQUENCIES.map((frequencyOption) => (
                  <option key={frequencyOption.cron} value={frequencyOption.cron}>
                    {frequencyOption.label}
                  </option>
                ))}
              </select>
            </div>

            {frequency === "custom" && (
              <div>
                <label className="text-sm font-bold text-slate-200">Custom Cron</label>
                <input
                  className="input mt-1 font-mono"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="0 2 * * *"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use standard 5-field cron format.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-400">
              Selected cadence:{" "}
              <span className="font-semibold text-slate-200">
                {cronLabel(selectedCron)}
              </span>
            </div>

            <button
              className="btn-primary w-full justify-center disabled:opacity-50"
              disabled={creating || assets.length === 0}
            >
              {creating ? "Creating..." : "Create Scheduled Scan"}
            </button>
          </div>
        </form>

        <div className="xl:col-span-2">
          <CyberTable
            title="Scan Schedule Register"
            description="Run, pause, resume, or remove scheduled scans for each client asset."
            data={schedules}
            emptyText={
              loading
                ? "Loading schedules..."
                : "No scheduled scans yet. Create one from the form."
            }
            columns={[
              {
                key: "asset",
                label: "Asset",
                render: (schedule) => (
                  <div className="min-w-64">
                    <div className="break-all font-semibold text-white">
                      {schedule.assetDomain ?? schedule.assetId}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {schedule.typeName ?? scanTypeLabel(schedule.type)}
                    </div>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (schedule) => (
                  <div className="space-y-2">
                    <CyberStatusBadge value={schedule.enabled ? "Enabled" : "Paused"} />
                    <CyberStatusBadge value={nextRunStatus(schedule)} />
                  </div>
                ),
              },
              {
                key: "frequency",
                label: "Frequency",
                render: (schedule) => (
                  <div className="min-w-56">
                    <div className="font-semibold text-slate-200">
                      {cronLabel(schedule.cronExpression)}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-500">
                      {schedule.cronExpression}
                    </div>
                  </div>
                ),
              },
              {
                key: "last",
                label: "Last Run",
                render: (schedule) => (
                  <div className="whitespace-nowrap text-slate-400">
                    {dateText(schedule.lastRunUtc)}
                  </div>
                ),
              },
              {
                key: "next",
                label: "Next Run",
                render: (schedule) => (
                  <div className="whitespace-nowrap text-slate-400">
                    {dateText(schedule.nextRunUtc)}
                  </div>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (schedule) => {
                  const isBusy = busyId === schedule.id;

                  return (
                    <div className="flex min-w-64 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => runNow(schedule)}
                        disabled={isBusy}
                        className="btn-primary text-xs disabled:opacity-50"
                      >
                        {isBusy ? "Working..." : "Run Now"}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggle(schedule)}
                        disabled={isBusy}
                        className="btn-ghost text-xs disabled:opacity-50"
                      >
                        {schedule.enabled ? "Pause" : "Resume"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteSchedule(schedule)}
                        disabled={isBusy}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
