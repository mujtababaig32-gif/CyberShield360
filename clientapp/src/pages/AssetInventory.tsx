import { useEffect, useMemo, useState } from "react";
import { AssetInventoryApi } from "../api/endpoints";

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

function riskColor(risk: string) {
  if (risk === "Critical") return "text-red-700";
  if (risk === "High") return "text-orange-600";
  if (risk === "Medium") return "text-yellow-600";
  return "text-green-600";
}

function riskBadge(risk: string) {
  if (risk === "Critical") return "bg-red-700";
  if (risk === "High") return "bg-orange-600";
  if (risk === "Medium") return "bg-yellow-600";
  return "bg-green-600";
}

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
    load();
  }, []);

  const filteredAssets = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    return data.assets.filter((asset) => {
      const matchesQuery = !q || [
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
      const matchesEnvironment = environmentFilter === "All" || asset.environment === environmentFilter;

      return matchesQuery && matchesRisk && matchesEnvironment;
    });
  }, [data, query, riskFilter, environmentFilter]);

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

  if (error) return <div className="text-red-500">{error}</div>;
  if (loading && !data) return <div className="text-gray-500">Loading asset inventory...</div>;
  if (!data) return null;

  return (
    <div>
      <header className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Security Asset Inventory</h1>
          <p className="text-sm text-gray-500">
            CMDB-style view of ownership, exposure, business criticality, technology, and risk.
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
            disabled={filteredAssets.length === 0}
            className="btn-ghost border border-gray-200 dark:border-gray-700 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card"><div className="text-xs text-gray-500">Total Assets</div><div className="text-3xl font-bold">{data.totalAssets}</div></div>
        <div className="card"><div className="text-xs text-gray-500">Production</div><div className="text-3xl font-bold">{data.productionAssets}</div></div>
        <div className="card"><div className="text-xs text-gray-500">Internet Facing</div><div className="text-3xl font-bold text-orange-600">{data.internetFacingAssets}</div></div>
        <div className="card"><div className="text-xs text-gray-500">High Criticality</div><div className="text-3xl font-bold">{data.highCriticalityAssets}</div></div>
        <div className="card"><div className="text-xs text-gray-500">High Risk</div><div className="text-3xl font-bold text-red-600">{data.highRiskAssets}</div></div>
      </section>

      <div className="card mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="input"
          placeholder="Search domain, owner, technology, risk..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select className="input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
          {RISK_OPTIONS.map((risk) => <option key={risk}>{risk}</option>)}
        </select>

        <select className="input" value={environmentFilter} onChange={(e) => setEnvironmentFilter(e.target.value)}>
          {ENV_OPTIONS.map((env) => <option key={env}>{env}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold">Asset Register</h2>
            <div className="text-xs text-gray-500">Showing {filteredAssets.length} of {data.assets.length}</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2">Asset</th>
                  <th>Environment</th>
                  <th>Owner</th>
                  <th>Exposure</th>
                  <th>Score</th>
                  <th>Risk</th>
                  <th>ASM</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-500">
                      No assets match the current filters.
                    </td>
                  </tr>
                ) : filteredAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-gray-100 dark:border-gray-800 align-top">
                    <td className="py-3 min-w-64">
                      <div className="font-semibold break-all">{asset.domain}</div>
                      <div className="text-xs text-gray-500">
                        {asset.displayName ?? (asset.isPrimary ? "Primary asset" : "Discovered asset")}
                      </div>
                      <div className="text-xs text-gray-500">Last scanned: {dateText(asset.lastScannedUtc)}</div>
                    </td>
                    <td>{asset.environment}<div className="text-xs text-gray-500">{asset.criticality}</div></td>
                    <td>{asset.owner}</td>
                    <td>
                      <span className={`badge ${asset.internetFacing ? "bg-orange-600" : "bg-green-600"}`}>
                        {asset.internetFacing ? "Internet" : "Internal"}
                      </span>
                    </td>
                    <td>{asset.latestScore}/100<div className="text-xs text-gray-500">Grade {asset.latestGrade}</div></td>
                    <td>
                      <span className={`badge ${riskBadge(asset.riskRating)}`}>{asset.riskRating}</span>
                      <div className={`text-xs mt-1 ${riskColor(asset.riskRating)}`}>Score {asset.riskScore}</div>
                    </td>
                    <td>{asset.attackSurfaceFindings}</td>
                    <td>
                      <button
                        onClick={() => setSelectedAsset(asset)}
                        className="text-brand-500 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="card">
          <h2 className="font-semibold mb-3">Asset Details</h2>

          {!selectedAsset ? (
            <div className="text-sm text-gray-500">
              Select an asset from the register to view recommended action, technology evidence, and risk details.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500">Domain</div>
                <div className="font-semibold break-all">{selectedAsset.domain}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-gray-500">Risk</div><div className={riskColor(selectedAsset.riskRating)}>{selectedAsset.riskRating}</div></div>
                <div><div className="text-gray-500">Score</div><div>{selectedAsset.latestScore}/100</div></div>
                <div><div className="text-gray-500">Failed</div><div>{selectedAsset.failedFindings}</div></div>
                <div><div className="text-gray-500">High/Critical</div><div>{selectedAsset.highFindings + selectedAsset.criticalFindings}</div></div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Technology</div>
                <div className="text-sm break-words">{selectedAsset.technology}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Recommended Action</div>
                <div className="text-sm">{selectedAsset.recommendedAction}</div>
              </div>

              <button
                onClick={() => setSelectedAsset(null)}
                className="btn-ghost border border-gray-200 dark:border-gray-700"
              >
                Clear Selection
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className="text-xs text-gray-400 mt-4">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
      </div>
    </div>
  );
}

