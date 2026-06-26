import { useEffect, useMemo, useState } from "react";
import { AssetApi, RecommendationApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import type { Asset, ScanRecommendation } from "../types";

function gradeStatus(grade?: string) {
  if (grade === "A" || grade === "B") return "Strong";
  if (grade === "C") return "Needs Review";
  if (grade === "D" || grade === "F") return "High Risk";
  return "Not Graded";
}

function actionLevel(index: number) {
  if (index === 0) return "Critical Priority";
  if (index <= 2) return "High Priority";
  if (index <= 5) return "Medium Priority";
  return "Backlog";
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

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

  const scannedAssets = useMemo(() => assets.filter((asset) => assetScanId(asset)), [assets]);

  const selectedAsset = useMemo(
    () => scannedAssets.find((asset) => asset.id === selectedAssetId) ?? null,
    [scannedAssets, selectedAssetId]
  );

  const filteredAssets = useMemo(() => {
    const q = assetQuery.trim().toLowerCase();
    const source = q
      ? scannedAssets.filter((asset) =>
          [
            asset.domain,
            asset.latestFullPostureGrade,
            asset.latestGrade,
            asset.latestFullPostureScore,
            asset.latestScore,
          ]
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
    void load();
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

    downloadCsv("cybershield360-remediation-plan.csv", [
      ["Domain", "Score", "Grade", "Failed Findings", "Priority", "Recommendation"],
      ...data.recommendations.map((recommendation, index) => [
        data.domain,
        data.score,
        data.grade,
        data.failedFindings,
        actionLevel(index),
        recommendation,
      ]),
    ]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            Guided Remediation
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Remediation Center
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Turn scan findings into prioritized fixes, report exports, and client-ready remediation guidance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading || working}
            className="btn-ghost"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={exportActions}
            disabled={!data || data.recommendations.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            Export Plan
          </button>
        </div>
      </header>

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

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="relative">
            <label className="text-sm font-bold text-slate-200">Select scanned asset</label>

            <button
              type="button"
              onClick={() => setPickerOpen((value) => !value)}
              disabled={loading || scannedAssets.length === 0}
              className="mt-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-left shadow-sm transition hover:border-brand-500/40 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60"
            >
              <div className="min-w-0">
                <div className="break-all font-bold text-white">
                  {selectedAsset ? selectedAsset.domain : "Choose an asset"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedAsset
                    ? `Score ${assetScore(selectedAsset)} / Grade ${assetGrade(selectedAsset)} / Scan ${selectedScanId.slice(0, 8)}`
                    : "Only assets with scans are shown"}
                </div>
              </div>
              <span className="shrink-0 text-xl text-slate-400">⌄</span>
            </button>

            {pickerOpen && (
              <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/30">
                <div className="border-b border-white/10 p-3">
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
                    <div className="p-4 text-sm text-slate-500">
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
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="break-all font-bold text-white">{asset.domain}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              Score {assetScore(asset)} / Grade {assetGrade(asset)} / Scan {scanId.slice(0, 8)}
                            </div>
                          </div>
                          <CyberStatusBadge value={`Grade ${assetGrade(asset)}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500">
              Selected scan ID: {selectedScanId || "No scan selected"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => download("pdf")}
              disabled={!selectedAssetId || working}
              className="btn-primary disabled:opacity-50"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => download("xlsx")}
              disabled={!selectedAssetId || working}
              className="btn-ghost disabled:opacity-50"
            >
              Download Excel
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="card text-sm text-slate-500">Loading remediation center...</div>
      ) : scannedAssets.length === 0 ? (
        <div className="empty-state">
          <div className="text-lg font-bold">No scanned assets found</div>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            Run a Full Posture scan from Assets & Scans first, then return here for remediation planning.
          </p>
        </div>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CyberStatCard label="Domain" value={data.domain} hint="Selected asset" tone="brand" />
            <CyberStatCard label="Score" value={`${data.score}/100`} hint="Latest full posture" tone={data.score >= 80 ? "green" : data.score >= 60 ? "orange" : "red"} />
            <CyberStatCard label="Grade" value={data.grade} hint={gradeStatus(data.grade)} tone={data.grade === "A" || data.grade === "B" ? "green" : data.grade === "C" ? "orange" : "red"} />
            <CyberStatCard label="Failed Findings" value={data.failedFindings} hint="Need remediation" tone={data.failedFindings > 0 ? "red" : "green"} />
          </section>

          <CyberTable
            title="Prioritized Remediation Plan"
            description="Client-friendly remediation actions generated from the selected scan evidence."
            data={data.recommendations.map((recommendation, index) => ({ recommendation, index }))}
            emptyText="No remediation actions available for this scan."
            columns={[
              {
                key: "priority",
                label: "Priority",
                render: (row) => <CyberStatusBadge value={actionLevel(row.index)} />,
              },
              {
                key: "action",
                label: "Recommended Fix",
                render: (row) => (
                  <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                    {row.recommendation}
                  </div>
                ),
              },
              {
                key: "owner",
                label: "Owner",
                render: () => <div className="text-slate-300">Security / IT Owner</div>,
              },
              {
                key: "verification",
                label: "Verification",
                render: () => <CyberStatusBadge value="Rescan Required" />,
              },
            ]}
          />

          {selectedAsset && (
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Selected Asset Context
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Useful context for remediation planning and client reporting.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Latest Score
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">
                    {assetScore(selectedAsset)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Grade
                  </div>
                  <div className="mt-2 flex justify-center">
                    <CyberStatusBadge value={`Grade ${assetGrade(selectedAsset)}`} />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    High/Critical Findings
                  </div>
                  <div className="mt-2 text-2xl font-black text-white">
                    {selectedAsset.highCriticalFindings ?? "-"}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
