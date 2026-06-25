import { useEffect, useState } from "react";
import { AssetApi } from "../api/endpoints";
import type { Asset } from "../types";

const SCAN_TYPES = [
  { v: 6, label: "Full Posture" },
  { v: 0, label: "SSL/TLS" },
  { v: 1, label: "Headers" },
  { v: 2, label: "DNS" },
  { v: 3, label: "SPF" },
  { v: 4, label: "DKIM" },
  { v: 5, label: "DMARC" },
];

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
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Assets & Scans</h1>
          <p className="text-sm text-gray-500">
            Add assets, run posture scans, discover subdomains, and download reports.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={scanAll}
            disabled={scanAllLoading || assets.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {scanAllLoading ? "Scanning..." : "Scan All Assets"}
          </button>
        </div>
      </div>

      <form onSubmit={add} className="card flex flex-col sm:flex-row gap-3 mb-4">
        <input
          className="input"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />

        <button
          className="btn-primary justify-center disabled:opacity-50"
          disabled={adding}
        >
          {adding ? "Adding..." : "Add Asset"}
        </button>
      </form>

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

      {loading && (
        <div className="card text-sm text-gray-500">Loading assets...</div>
      )}

      {!loading && assets.length === 0 && (
        <div className="card">
          <h2 className="font-semibold mb-2">No assets added yet</h2>
          <p className="text-sm text-gray-500">
            Add your first domain above, then run scans and discover subdomains.
          </p>
        </div>
      )}

      {!loading && assets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((a) => {
            const isBusy = busyAssetId === a.id;

            return (
              <div key={a.id} className="card overflow-hidden">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold break-all leading-snug">
                      {a.domain}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Last scanned:{" "}
                      {a.lastScannedUtc
                        ? new Date(a.lastScannedUtc).toLocaleString()
                        : "Never"}
                    </div>

                    {a.latestScore !== undefined && a.latestScore !== null && (
                      <div className="text-xs text-gray-500 mt-1 break-words">
                        Latest Score:{" "}
                        <span className="font-semibold text-brand-500">
                          {a.latestScore}/100
                        </span>{" "}
                        | Grade:{" "}
                        <span className="font-semibold">
                          {a.latestGrade ?? "-"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2 max-w-[110px]">
                    {a.isPrimary ? (
                      <span className="badge bg-brand-600 whitespace-nowrap text-xs">
                        Primary
                      </span>
                    ) : (
                      <span className="badge bg-gray-500 whitespace-nowrap text-xs">
                        Discovered
                      </span>
                    )}

                    {isBusy && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        Working...
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => discover(a.id)}
                    disabled={isBusy}
                    className="btn-primary text-xs disabled:opacity-50"
                  >
                    Discover Subdomains
                  </button>

                  {SCAN_TYPES.map((t) => (
                    <button
                      key={t.v}
                      onClick={() => scan(a.id, t.v)}
                      disabled={isBusy}
                      className="btn-ghost text-xs border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {a.latestScanId ? (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => downloadReport(a.id, "pdf")}
                      className="btn-primary text-xs"
                    >
                      Download PDF
                    </button>

                    <button
                      onClick={() => downloadReport(a.id, "xlsx")}
                      className="btn-ghost text-xs border border-gray-200 dark:border-gray-700"
                    >
                      Download Excel
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    Run a Full Posture scan to enable executive report downloads.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}