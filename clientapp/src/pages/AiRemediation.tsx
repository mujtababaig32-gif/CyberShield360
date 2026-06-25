import { useEffect, useMemo, useState } from "react";
import { AssetApi, RecommendationApi } from "../api/endpoints";
import type { Asset, ScanRecommendation } from "../types";

function gradeColor(grade?: string) {
  if (grade === "A") return "#16a34a";
  if (grade === "B") return "#65a30d";
  if (grade === "C") return "#ca8a04";
  if (grade === "D") return "#ea580c";
  if (grade === "F") return "#dc2626";
  return "#64748b";
}

function actionLevel(index: number) {
  if (index === 0) return "Critical Priority";
  if (index <= 2) return "High Priority";
  if (index <= 5) return "Medium Priority";
  return "Backlog";
}

function actionColor(index: number) {
  if (index === 0) return "#dc2626";
  if (index <= 2) return "#ea580c";
  if (index <= 5) return "#ca8a04";
  return "#64748b";
}

function assetScanId(asset: Asset) {
  return asset.latestFullPostureScanId || asset.latestScanId || "";
}

function assetScore(asset: Asset) {
  return asset.latestFullPostureScore ?? asset.latestScore ?? "-";
}

function assetGrade(asset: Asset) {
  return asset.latestFullPostureGrade ?? asset.latestGrade ?? "-";
}

export default function AiRemediation() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedScanId, setSelectedScanId] = useState("");
  const [assetQuery, setAssetQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [data, setData] = useState<ScanRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scannedAssets = useMemo(() => {
    return assets.filter((asset) => assetScanId(asset));
  }, [assets]);

  const selectedAsset = useMemo(() => {
    return scannedAssets.find((asset) => asset.id === selectedAssetId) ?? null;
  }, [scannedAssets, selectedAssetId]);

  const filteredAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    const source = q
      ? scannedAssets.filter((asset) =>
          [asset.domain, asset.latestFullPostureGrade, asset.latestGrade, asset.latestFullPostureScore, asset.latestScore]
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : scannedAssets;

    return source.slice(0, 12);
  }, [assetQuery, scannedAssets]);

  const loadRecommendations = async (assetId: string, scanId: string) => {
    if (!scanId) {
      setData(null);
      return;
    }

    try {
      setWorking(true);
      setError(null);
      setMsg("Loading remediation guidance...");
      setSelectedAssetId(assetId);
      setSelectedScanId(scanId);

      const result = await RecommendationApi.getByScan(scanId);
      setData(result);
      setMsg(null);
    } catch {
      setData(null);
      setError("Failed to load remediation guidance for this scan.");
    } finally {
      setWorking(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await AssetApi.list();
      const available = result.filter((asset) => assetScanId(asset));
      setAssets(result);

      if (available.length > 0) {
        const first = available[0];
        await loadRecommendations(first.id, assetScanId(first));
      } else {
        setData(null);
        setSelectedAssetId("");
        setSelectedScanId("");
      }
    } catch {
      setError("Failed to load scanned assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSelectAsset = async (asset: Asset) => {
    const scanId = assetScanId(asset);
    if (!scanId) return;

    setPickerOpen(false);
    setAssetQuery("");
    await loadRecommendations(asset.id, scanId);
  };

  const download = async (format: "pdf" | "xlsx") => {
    if (!selectedAssetId) {
      setError("Select an asset first.");
      return;
    }

    try {
      setWorking(true);
      setError(null);
      setMsg(`Downloading latest full posture ${format.toUpperCase()} report...`);

      await AssetApi.downloadReport(selectedAssetId, format);

      setMsg(`${format.toUpperCase()} report downloaded.`);
    } catch {
      setError(`Failed to download ${format.toUpperCase()} report. Run a Full Posture scan first.`);
    } finally {
      setWorking(false);
    }
  };

  const exportActions = () => {
    if (!data) return;

    const rows = [
      ["Domain", "Score", "Grade", "Failed Findings", "Priority", "Recommendation"],
      ...data.recommendations.map((recommendation, index) => [
        data.domain,
        data.score,
        data.grade,
        data.failedFindings,
        actionLevel(index),
        recommendation,
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "cybershield360-remediation-plan.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            Guided Remediation
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            AI Remediation Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Generate prioritized remediation guidance from real scan findings. If no AI provider is available, CyberShield360 uses deterministic security recommendations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading || working} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={exportActions} disabled={!data || data.recommendations.length === 0} className="btn-primary">
            Export Plan
          </button>
        </div>
      </header>

      {msg && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-600 dark:text-brand-300">
          {msg}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="card overflow-visible">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="relative">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Select scanned asset
            </label>

            <button
              type="button"
              onClick={() => setPickerOpen((value) => !value)}
              disabled={loading || scannedAssets.length === 0}
              className="mt-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-sm transition hover:border-brand-400 hover:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/70 dark:hover:border-brand-500"
            >
              <div className="min-w-0">
                <div className="break-all font-bold text-slate-900 dark:text-white">
                  {selectedAsset ? selectedAsset.domain : "Choose an asset"}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedAsset
                    ? `Score ${assetScore(selectedAsset)} / Grade ${assetGrade(selectedAsset)} / Scan ${selectedScanId.slice(0, 8)}`
                    : "Only assets with scans are shown"}
                </div>
              </div>
              <span className="shrink-0 text-xl text-slate-400">⌄</span>
            </button>

            {pickerOpen && (
              <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/20 dark:border-slate-700 dark:bg-slate-950">
                <div className="border-b border-slate-200 p-3 dark:border-slate-800">
                  <input
                    className="input"
                    autoFocus
                    placeholder="Search scanned assets..."
                    value={assetQuery}
                    onChange={(event) => setAssetQuery(event.target.value)}
                  />
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {filteredAssets.length === 0 ? (
                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                      No matching scanned assets found.
                    </div>
                  ) : (
                    filteredAssets.map((asset) => {
                      const active = asset.id === selectedAssetId;
                      const scanId = assetScanId(asset);

                      return (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => onSelectAsset(asset)}
                          className={`mb-1 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${
                            active
                              ? "bg-brand-500/15 ring-1 ring-brand-500/40"
                              : "hover:bg-slate-100 dark:hover:bg-slate-900"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="break-all font-bold text-slate-900 dark:text-white">{asset.domain}</div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Score {assetScore(asset)} / Grade {assetGrade(asset)} / Scan {scanId.slice(0, 8)}
                            </div>
                          </div>
                          <span
                            className="badge shrink-0"
                            style={{ background: gradeColor(String(assetGrade(asset))) }}
                          >
                            {assetGrade(asset)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Recommendations are generated from selected scan ID: {selectedScanId || "No scan selected"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => download("pdf")} disabled={!selectedAssetId || working} className="btn-primary">
              Download PDF
            </button>
            <button onClick={() => download("xlsx")} disabled={!selectedAssetId || working} className="btn-ghost">
              Download Excel
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="card text-sm text-slate-500 dark:text-slate-400">Loading remediation center...</div>
      ) : scannedAssets.length === 0 ? (
        <div className="empty-state">
          <div className="text-lg font-bold">No scanned assets found</div>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Run a Full Posture scan from Assets & Scans first, then return here for remediation planning.
          </p>
        </div>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="metric-card">
              <div className="section-subtitle">Domain</div>
              <div className="mt-2 break-all text-xl font-black">{data.domain}</div>
            </div>
            <div className="metric-card">
              <div className="section-subtitle">Score</div>
              <div className="mt-2 text-3xl font-black">{data.score}/100</div>
            </div>
            <div className="metric-card">
              <div className="section-subtitle">Grade</div>
              <div className="mt-2 text-3xl font-black" style={{ color: gradeColor(data.grade) }}>
                {data.grade}
              </div>
            </div>
            <div className="metric-card">
              <div className="section-subtitle">Failed Findings</div>
              <div className="mt-2 text-3xl font-black text-red-600">{data.failedFindings}</div>
            </div>
          </section>

          <section className="card">
            <div className="flex flex-col gap-1">
              <h2 className="section-title">Prioritized Remediation Plan</h2>
              <p className="section-subtitle">
                Actions are ordered by expected impact and remediation urgency. Validate changes before applying them to production systems.
              </p>
            </div>

            {data.recommendations.length === 0 ? (
              <div className="empty-state mt-6">
                <div className="text-lg font-bold">No remediation actions available</div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This scan does not currently have failed findings with recommendations.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {data.recommendations.map((recommendation, index) => (
                  <div
                    key={`${recommendation}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                          Recommendation #{index + 1}
                        </div>
                        <div className="mt-1 font-black" style={{ color: actionColor(index) }}>
                          {actionLevel(index)}
                        </div>
                      </div>
                      <span className="badge" style={{ background: actionColor(index) }}>
                        P{Math.min(index + 1, 9)}
                      </span>
                    </div>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="empty-state">
          <div className="text-lg font-bold">Select a scan</div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Choose an asset scan above to load remediation guidance.
          </p>
        </div>
      )}

      {selectedAsset && (
        <section className="card">
          <h2 className="section-title">Selected Asset Context</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="section-subtitle">Asset</div>
              <div className="mt-2 break-all font-bold">{selectedAsset.domain}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="section-subtitle">Latest Full Posture Score</div>
              <div className="mt-2 font-bold">{selectedAsset.latestFullPostureScore ?? selectedAsset.latestScore ?? "-"}/100</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="section-subtitle">High/Critical Findings</div>
              <div className="mt-2 font-bold">{selectedAsset.highCriticalFindings ?? "-"}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
