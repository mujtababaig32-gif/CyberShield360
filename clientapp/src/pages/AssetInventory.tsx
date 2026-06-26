import { useEffect, useMemo, useState } from "react";
import { AssetInventoryApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

// This page stays database-backed through AssetInventoryApi.summary().
// UI filters/exports are client-side for speed and do not modify backend data.
type InventoryAsset = {
  id: string;
  domain: string;
  displayName?: string;
  isPrimary: boolean;
  monitoringEnabled: boolean;
  environment: string;
  criticality: string;
  owner: string;
  internetFacing: boolean;
  latestScore: number;
  latestGrade: string;
  lastScannedUtc?: string;
  failedFindings: number;
  highFindings: number;
  criticalFindings: number;
  attackSurfaceFindings: number;
  technology: string;
  riskScore: number;
  riskRating: string;
  recommendedAction: string;
};

type InventorySummary = {
  generatedUtc: string;
  totalAssets: number;
  productionAssets: number;
  internetFacingAssets: number;
  highCriticalityAssets: number;
  highRiskAssets: number;
  assets: InventoryAsset[];
};

const RISK_OPTIONS = ["All", "Critical", "High", "Medium", "Low"];
const ENV_OPTIONS = ["All", "Production", "Non-Production"];

function dateText(value?: string) {
  return value ? new Date(value).toLocaleString() : "Never scanned";
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

function scorePosture(score: number) {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Needs Review";
  return "High Risk";
}

function exposureLabel(asset: InventoryAsset) {
  return asset.internetFacing ? "Internet Facing" : "Internal";
}

function assetTypeLabel(asset: InventoryAsset) {
  return asset.isPrimary ? "Primary Asset" : "Discovered Asset";
}

export default function AssetInventory() {
  const [data, setData] = useState<InventorySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [environmentFilter, setEnvironmentFilter] = useState("All");
  const [selectedAsset, setSelectedAsset] = useState<InventoryAsset | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await AssetInventoryApi.summary();
      setData(result);
    } catch {
      setError("Failed to load asset inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredAssets = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    return data.assets.filter((asset) => {
      const matchesQuery =
        !q ||
        [
          asset.domain,
          asset.displayName,
          asset.owner,
          asset.environment,
          asset.criticality,
          asset.technology,
          asset.riskRating,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));

      const matchesRisk = riskFilter === "All" || asset.riskRating === riskFilter;
      const matchesEnvironment =
        environmentFilter === "All" || asset.environment === environmentFilter;

      return matchesQuery && matchesRisk && matchesEnvironment;
    });
  }, [data, query, riskFilter, environmentFilter]);

  const inventoryStats = useMemo(() => {
    if (!data) {
      return {
        totalAssets: 0,
        productionAssets: 0,
        internetFacingAssets: 0,
        highCriticalityAssets: 0,
        highRiskAssets: 0,
      };
    }

    return data;
  }, [data]);

  const exportCsv = () => {
    downloadCsv("cybershield360-asset-inventory.csv", [
      [
        "Domain",
        "Display Name",
        "Environment",
        "Criticality",
        "Owner",
        "Internet Facing",
        "Latest Score",
        "Latest Grade",
        "Risk Rating",
        "Risk Score",
        "Failed Findings",
        "High Findings",
        "Critical Findings",
        "ASM Findings",
        "Technology",
        "Recommended Action",
      ],
      ...filteredAssets.map((asset) => [
        asset.domain,
        asset.displayName ?? "",
        asset.environment,
        asset.criticality,
        asset.owner,
        asset.internetFacing ? "Yes" : "No",
        asset.latestScore,
        asset.latestGrade,
        asset.riskRating,
        asset.riskScore,
        asset.failedFindings,
        asset.highFindings,
        asset.criticalFindings,
        asset.attackSurfaceFindings,
        asset.technology,
        asset.recommendedAction,
      ]),
    ]);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (loading && !data) {
    return <div className="text-gray-500">Loading asset inventory...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Security Asset Inventory</h1>
          <p className="text-sm text-gray-500">
            Review ownership, exposure, business criticality, technology evidence, and risk across client assets.
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
            disabled={filteredAssets.length === 0}
            className="btn-ghost disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard
          label="Total Assets"
          value={inventoryStats.totalAssets}
          hint="All assets in scope"
          tone="brand"
        />
        <CyberStatCard
          label="Production"
          value={inventoryStats.productionAssets}
          hint="Live business systems"
          tone="green"
        />
        <CyberStatCard
          label="Internet Facing"
          value={inventoryStats.internetFacingAssets}
          hint="Externally reachable"
          tone="orange"
        />
        <CyberStatCard
          label="High Criticality"
          value={inventoryStats.highCriticalityAssets}
          hint="Important business assets"
          tone="brand"
        />
        <CyberStatCard
          label="High Risk"
          value={inventoryStats.highRiskAssets}
          hint="Needs priority review"
          tone="red"
        />
      </section>

      <section className="card grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          className="input"
          placeholder="Search domain, owner, technology, risk..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          className="input"
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          {RISK_OPTIONS.map((risk) => (
            <option key={risk}>{risk}</option>
          ))}
        </select>

        <select
          className="input"
          value={environmentFilter}
          onChange={(e) => setEnvironmentFilter(e.target.value)}
        >
          {ENV_OPTIONS.map((env) => (
            <option key={env}>{env}</option>
          ))}
        </select>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CyberTable
            title="Asset Register"
            description={`Showing ${filteredAssets.length} of ${data.assets.length} assets with ownership, exposure, risk, and action guidance.`}
            data={filteredAssets}
            emptyText="No assets match the current filters."
            columns={[
              {
                key: "asset",
                label: "Asset",
                render: (asset) => (
                  <div className="min-w-72">
                    <div className="break-all font-semibold text-white">
                      {asset.domain}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {asset.displayName ?? assetTypeLabel(asset)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Last checked: {dateText(asset.lastScannedUtc)}
                    </div>
                  </div>
                ),
              },
              {
                key: "environment",
                label: "Environment",
                render: (asset) => (
                  <div className="whitespace-nowrap">
                    <div className="font-semibold text-slate-200">
                      {asset.environment}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {asset.criticality}
                    </div>
                  </div>
                ),
              },
              {
                key: "owner",
                label: "Owner",
                render: (asset) => (
                  <div className="min-w-40 text-slate-300">
                    {asset.owner || "Unassigned"}
                  </div>
                ),
              },
              {
                key: "exposure",
                label: "Exposure",
                render: (asset) => <CyberStatusBadge value={exposureLabel(asset)} />,
              },
              {
                key: "score",
                label: "Score",
                render: (asset) => (
                  <div className="whitespace-nowrap">
                    <div className="font-semibold text-white">
                      {asset.latestScore}/100
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Grade {asset.latestGrade}
                    </div>
                    <div className="mt-2">
                      <CyberStatusBadge value={scorePosture(asset.latestScore)} />
                    </div>
                  </div>
                ),
              },
              {
                key: "risk",
                label: "Risk",
                render: (asset) => (
                  <div className="whitespace-nowrap">
                    <CyberStatusBadge value={asset.riskRating} />
                    <div className="mt-2 text-xs text-slate-500">
                      Risk score {asset.riskScore}
                    </div>
                  </div>
                ),
              },
              {
                key: "asm",
                label: "ASM",
                render: (asset) => (
                  <div className="text-center">
                    <div className="text-lg font-black text-white">
                      {asset.attackSurfaceFindings}
                    </div>
                    <div className="text-xs text-slate-500">Findings</div>
                  </div>
                ),
                align: "center",
              },
              {
                key: "action",
                label: "Action",
                render: (asset) => (
                  <button
                    type="button"
                    onClick={() => setSelectedAsset(asset)}
                    className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs font-black text-brand-300 transition hover:bg-brand-500/20"
                  >
                    View Details
                  </button>
                ),
              },
            ]}
          />
        </div>

        <aside className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5">
            <h2 className="text-lg font-black tracking-tight text-white">
              Asset Details
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Select an asset to review recommended action, technology evidence, and risk context.
            </p>
          </div>

          {!selectedAsset ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">
              No asset selected yet. Choose an asset from the register to view its business and technical context.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Domain
                </div>
                <div className="mt-2 break-all font-semibold text-white">
                  {selectedAsset.domain}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Risk
                  </div>
                  <div className="mt-2">
                    <CyberStatusBadge value={selectedAsset.riskRating} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Score
                  </div>
                  <div className="mt-2 font-semibold text-white">
                    {selectedAsset.latestScore}/100
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Failed
                  </div>
                  <div className="mt-2 font-semibold text-white">
                    {selectedAsset.failedFindings}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                    High/Critical
                  </div>
                  <div className="mt-2 font-semibold text-white">
                    {selectedAsset.highFindings + selectedAsset.criticalFindings}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Technology Evidence
                </div>
                <div className="mt-2 break-words text-sm leading-6 text-slate-300">
                  {selectedAsset.technology || "No technology evidence recorded."}
                </div>
              </div>

              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
                <div className="text-xs font-black uppercase tracking-wide text-brand-300">
                  Recommended Action
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-200">
                  {selectedAsset.recommendedAction || "Review this asset and run the recommended security checks."}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="btn-ghost w-full"
              >
                Clear Selection
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className="text-xs text-gray-400">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
      </div>
    </div>
  );
}
