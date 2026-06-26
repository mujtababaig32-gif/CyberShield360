import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AssetApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import type { Asset } from "../types";

const SCAN_TYPES = [
  { v: 6, label: "Full Posture", hint: "Complete assessment" },
  { v: 0, label: "SSL/TLS", hint: "Certificate check" },
  { v: 1, label: "Headers", hint: "Browser protection" },
  { v: 2, label: "DNS", hint: "Domain records" },
  { v: 3, label: "SPF", hint: "Sender policy" },
  { v: 4, label: "DKIM", hint: "Email signing" },
  { v: 5, label: "DMARC", hint: "Spoofing defense" },
];

function formatDate(value?: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function scoreTone(score?: number | null): "green" | "orange" | "red" | "slate" {
  if (score === undefined || score === null) return "slate";
  if (score >= 80) return "green";
  if (score >= 60) return "orange";
  return "red";
}

function scoreStatus(score?: number | null) {
  if (score === undefined || score === null) return "Not Scanned";
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Needs Review";
  return "High Risk";
}

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [domain, setDomain] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [scanAllLoading, setScanAllLoading] = useState(false);
  const [busyAssetId, setBusyAssetId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await AssetApi.list();
      setAssets(result);
    } catch {
      setError("Failed to load assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const scanned = assets.filter(
      (asset) => asset.latestScore !== undefined && asset.latestScore !== null
    );

    const highRisk = assets.filter(
      (asset) => asset.latestScore !== undefined && asset.latestScore !== null && asset.latestScore < 60
    );

    const averageScore =
      scanned.length === 0
        ? "-"
        : Math.round(
            scanned.reduce((total, asset) => total + Number(asset.latestScore ?? 0), 0) /
              scanned.length
          );

    return {
      total: assets.length,
      primary: assets.filter((asset) => asset.isPrimary).length,
      discovered: assets.filter((asset) => !asset.isPrimary).length,
      scanned: scanned.length,
      highRisk: highRisk.length,
      averageScore,
    };
  }, [assets]);

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanDomain = domain.trim().toLowerCase();

    if (!cleanDomain) {
      setMsg("Enter a domain first.");
      return;
    }

    try {
      setAdding(true);
      setMsg("Adding asset...");
      setError(null);

      await AssetApi.create(cleanDomain);

      setDomain("");
      setMsg(`Asset added: ${cleanDomain}`);
      await load();
    } catch {
      setError("Failed to add asset. Make sure the domain is valid and not already added.");
    } finally {
      setAdding(false);
    }
  };

  const scan = async (id: string, type: number) => {
    try {
      setBusyAssetId(id);
      setMsg("Running scan...");
      setError(null);

      const r: any = await AssetApi.runScan(id, type);

      setMsg(
        `Scan complete - Score ${r?.data?.score ?? r?.score ?? "?"}/100 Grade ${
          r?.data?.grade ?? r?.grade ?? "?"
        }`
      );

      await load();
    } catch {
      setError("Scan failed. Check backend logs or try again.");
    } finally {
      setBusyAssetId(null);
    }
  };

  const discover = async (id: string) => {
    try {
      setBusyAssetId(id);
      setMsg("Discovering subdomains...");
      setError(null);

      const r: any = await AssetApi.discoverSubdomains(id);

      setMsg(
        `Found ${r?.discoveredCount ?? 0} subdomains. Added ${
          r?.createdCount ?? 0
        } new assets.`
      );

      await load();
    } catch {
      setError("Subdomain discovery failed. Try again later.");
    } finally {
      setBusyAssetId(null);
    }
  };

  const scanAll = async () => {
    try {
      setScanAllLoading(true);
      setMsg("Scanning all assets...");
      setError(null);

      await AssetApi.scanAll();

      setMsg("All assets scan started/completed.");
      await load();
    } catch {
      setError("Scan all failed. Check backend logs.");
    } finally {
      setScanAllLoading(false);
    }
  };

  const downloadReport = async (assetId: string, format: "pdf" | "xlsx") => {
    try {
      setMsg(`Downloading latest full posture ${format.toUpperCase()} report...`);
      setError(null);

      await AssetApi.downloadReport(assetId, format);

      setMsg(`${format.toUpperCase()} full posture report downloaded.`);
    } catch {
      setError(
        `Full posture ${format.toUpperCase()} report failed. Run a Full Posture scan first.`
      );
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Assets & Scans</h1>
          <p className="text-sm text-gray-500">
            Add client domains, run security assessments, discover subdomains, and download client-ready reports.
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
            onClick={scanAll}
            disabled={scanAllLoading || assets.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {scanAllLoading ? "Scanning..." : "Scan All Assets"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard label="Total Assets" value={stats.total} hint="All domains in scope" tone="brand" />
        <CyberStatCard label="Primary Assets" value={stats.primary} hint="Client-provided targets" tone="green" />
        <CyberStatCard label="Discovered" value={stats.discovered} hint="Found during discovery" tone="slate" />
        <CyberStatCard label="Scanned" value={stats.scanned} hint="Have latest score" tone="brand" />
        <CyberStatCard label="Avg Score" value={stats.averageScore} hint="Across scanned assets" tone="orange" />
      </section>

      <form
        onSubmit={add}
        className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-sm font-bold text-slate-200">Add website or domain</label>
            <p className="mt-1 text-sm text-slate-500">
              Add the client’s main domain. CyberShield360 can then scan posture and discover related assets.
            </p>

            <input
              className="input mt-3"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <button
            className="btn-primary justify-center disabled:opacity-50"
            disabled={adding}
          >
            {adding ? "Adding..." : "Add Asset"}
          </button>
        </div>
      </form>

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

      {loading && (
        <div className="card text-sm text-gray-500">Loading assets...</div>
      )}

      {!loading && assets.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center shadow-2xl shadow-black/10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-2xl">
            🌐
          </div>
          <h2 className="text-xl font-black text-white">No assets added yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
            Add your first domain above. After that, you can run scans, discover subdomains,
            review exposure, and generate client-ready reports.
          </p>
        </div>
      )}

      {!loading && assets.length > 0 && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {assets.map((asset) => {
            const isBusy = busyAssetId === asset.id;
            const latestScore = asset.latestScore ?? null;

            return (
              <section
                key={asset.id}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-all text-lg font-black text-white">
                        {asset.domain}
                      </h2>

                      <CyberStatusBadge value={asset.isPrimary ? "Primary" : "Discovered"} />
                      <CyberStatusBadge value={scoreStatus(latestScore)} />
                    </div>

                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-xs font-bold uppercase text-slate-500">
                          Last Checked
                        </div>
                        <div className="mt-1 text-slate-300">
                          {formatDate(asset.lastScannedUtc)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-xs font-bold uppercase text-slate-500">
                          Security Score
                        </div>
                        <div className="mt-1 text-slate-300">
                          {latestScore !== null ? `${latestScore}/100` : "Not scanned"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="text-xs font-bold uppercase text-slate-500">
                          Grade
                        </div>
                        <div className="mt-1 text-slate-300">
                          {asset.latestGrade ?? "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isBusy ? (
                      <CyberStatusBadge value="Working" />
                    ) : (
                      <CyberStatusBadge value={scoreTone(latestScore) === "green" ? "Ready" : "Needs Review"} />
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black text-white">Assessment Actions</h3>
                      <p className="text-xs text-slate-500">
                        Run targeted checks or a complete posture scan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => discover(asset.id)}
                      disabled={isBusy}
                      className="btn-primary text-xs disabled:opacity-50"
                    >
                      Discover Subdomains
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {SCAN_TYPES.map((scanType) => (
                      <button
                        key={scanType.v}
                        type="button"
                        onClick={() => scan(asset.id, scanType.v)}
                        disabled={isBusy}
                        className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-left transition hover:border-brand-500/40 hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="text-sm font-black text-white">
                          {scanType.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {scanType.hint}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {asset.latestScanId ? (
                  <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-black text-white">Report Ready</div>
                      <div className="text-xs text-slate-500">
                        Download the latest full posture report for this asset.
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadReport(asset.id, "pdf")}
                        className="btn-primary text-xs"
                      >
                        Download PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadReport(asset.id, "xlsx")}
                        className="btn-ghost text-xs"
                      >
                        Download Excel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">
                    Run a Full Posture scan to enable executive report downloads.
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
