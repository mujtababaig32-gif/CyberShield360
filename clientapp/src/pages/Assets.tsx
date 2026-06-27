import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AssetApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import type { Asset } from "../types";

const SCAN_TYPES = [
  { v: 6, label: "Full Posture", hint: "Complete assessment", primary: true },
  { v: 0, label: "SSL/TLS", hint: "Certificate check", primary: false },
  { v: 1, label: "Headers", hint: "Browser protection", primary: false },
  { v: 2, label: "DNS", hint: "Domain records", primary: false },
  { v: 3, label: "SPF", hint: "Sender policy", primary: false },
  { v: 4, label: "DKIM", hint: "Email signing", primary: false },
  { v: 5, label: "DMARC", hint: "Spoofing defense", primary: false },
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

function scoreTextClass(score?: number | null) {
  if (score === undefined || score === null) return "text-slate-400";
  if (score >= 80) return "text-green-300";
  if (score >= 60) return "text-orange-300";
  return "text-red-300";
}

function cleanDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0];
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
      (asset) =>
        asset.latestScore !== undefined &&
        asset.latestScore !== null &&
        asset.latestScore < 60
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
      reportReady: assets.filter((asset) => Boolean(asset.latestScanId)).length,
    };
  }, [assets]);

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedDomain = cleanDomain(domain);

    if (!normalizedDomain) {
      setMsg(null);
      setError("Enter a domain first.");
      return;
    }

    try {
      setAdding(true);
      setMsg("Adding asset...");
      setError(null);

      await AssetApi.create(normalizedDomain);

      setDomain("");
      setMsg(`Asset added: ${normalizedDomain}`);
      await load();
    } catch {
      setMsg(null);
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
      setMsg(null);
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
      setMsg(null);
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

      setMsg("All asset scans started/completed.");
      await load();
    } catch {
      setMsg(null);
      setError("Scan all failed. Check backend logs.");
    } finally {
      setScanAllLoading(false);
    }
  };

  const downloadReport = async (assetId: string, format: "pdf" | "xlsx") => {
    try {
      setMsg(`Downloading latest Full Posture ${format.toUpperCase()} report...`);
      setError(null);

      await AssetApi.downloadReport(assetId, format);

      setMsg(`${format.toUpperCase()} Full Posture report downloaded.`);
    } catch {
      setMsg(null);
      setError(
        `Full Posture ${format.toUpperCase()} report failed. Run a Full Posture scan first.`
      );
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Attack Surface
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Assets & Scans
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Add client domains, run targeted security checks, perform complete Full Posture
              assessments, discover subdomains, and download client-ready PDF/Excel reports.
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
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanAllLoading ? "Scanning..." : "Scan All Assets"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <CyberStatCard
          label="Total Assets"
          value={stats.total}
          hint="All domains in scope"
          tone="brand"
        />
        <CyberStatCard
          label="Primary Assets"
          value={stats.primary}
          hint="Client-provided targets"
          tone="green"
        />
        <CyberStatCard
          label="Discovered"
          value={stats.discovered}
          hint="Found during discovery"
          tone="slate"
        />
        <CyberStatCard
          label="Scanned"
          value={stats.scanned}
          hint="Have latest score"
          tone="brand"
        />
        <CyberStatCard
          label="Avg Score"
          value={stats.averageScore}
          hint="Across scanned assets"
          tone="orange"
        />
        <CyberStatCard
          label="Reports"
          value={stats.reportReady}
          hint="Full Posture ready"
          tone="green"
        />
      </section>

      <form
        onSubmit={add}
        className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-sm font-black text-white">Add Website or Domain</label>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Add the client’s main domain. CyberShield360 will normalize the input,
              then you can scan posture and discover related public assets.
            </p>

            <input
              className="input mt-3"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
            disabled={adding}
          >
            {adding ? "Adding..." : "Add Asset"}
          </button>
        </div>
      </form>

      {msg && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-semibold text-brand-300">
          {msg}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400 shadow-2xl shadow-black/10">
          Loading assets...
        </div>
      )}

      {!loading && assets.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center shadow-2xl shadow-black/10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/10 text-3xl">
            🌐
          </div>

          <h2 className="text-xl font-black text-white">No Assets Added Yet</h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-400">
            Add your first domain above. After that, you can run security scans,
            discover subdomains, review exposure, and generate professional client reports.
          </p>
        </div>
      )}

      {!loading && assets.length > 0 && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {assets.map((asset) => {
            const isBusy = busyAssetId === asset.id;
            const latestScore = asset.latestScore ?? null;
            const fullPostureScan = SCAN_TYPES.find((scanType) => scanType.primary);
            const targetedScans = SCAN_TYPES.filter((scanType) => !scanType.primary);

            return (
              <section
                key={asset.id}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-all text-lg font-black text-white">
                        {asset.domain}
                      </h2>

                      <CyberStatusBadge value={asset.isPrimary ? "Primary" : "Discovered"} />
                      <CyberStatusBadge value={scoreStatus(latestScore)} />
                    </div>

                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                        <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Last Checked
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-300">
                          {formatDate(asset.lastScannedUtc)}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                        <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Security Score
                        </div>
                        <div className={`mt-1 text-lg font-black ${scoreTextClass(latestScore)}`}>
                          {latestScore !== null ? `${latestScore}/100` : "Not scanned"}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
                        <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Grade
                        </div>
                        <div className="mt-1 text-lg font-black text-white">
                          {asset.latestGrade ?? "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isBusy ? (
                      <CyberStatusBadge value="Working" />
                    ) : (
                      <CyberStatusBadge
                        value={scoreTone(latestScore) === "green" ? "Ready" : "Needs Review"}
                      />
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black text-white">Full Posture Assessment</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Recommended for client reporting, remediation planning, and executive scorecards.
                      </p>
                    </div>

                    {fullPostureScan && (
                      <button
                        type="button"
                        onClick={() => scan(asset.id, fullPostureScan.v)}
                        disabled={isBusy}
                        className="btn-primary justify-center text-xs disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isBusy ? "Running..." : "Run Full Posture"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-black text-white">Targeted Checks</h3>
                      <p className="text-xs leading-5 text-slate-500">
                        Run focused checks for TLS, headers, DNS, and email authentication.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => discover(asset.id)}
                      disabled={isBusy}
                      className="btn-ghost justify-center text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Discover Subdomains
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {targetedScans.map((scanType) => (
                      <button
                        key={scanType.v}
                        type="button"
                        onClick={() => scan(asset.id, scanType.v)}
                        disabled={isBusy}
                        className="rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3 text-center transition hover:border-brand-500/40 hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div className="text-center sm:text-left">
                      <div className="text-sm font-black text-white">Report Ready</div>
                      <div className="text-xs leading-5 text-slate-500">
                        Download the latest Full Posture report for this asset.
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadReport(asset.id, "pdf")}
                        className="btn-primary justify-center text-xs"
                      >
                        Download PDF
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadReport(asset.id, "xlsx")}
                        className="btn-ghost justify-center text-xs"
                      >
                        Download Excel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm leading-6 text-slate-500">
                    Run a Full Posture scan to enable executive PDF and Excel report downloads.
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