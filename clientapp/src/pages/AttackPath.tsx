import { useEffect, useMemo, useState } from "react";
import { AttackPathApi } from "../api/endpoints";

import ModuleTabs from "../components/ModuleTabs";
type CrownJewel = { id: string; asset: string; criticality: string; exposureScore: number; attackPaths: number };
type AttackPath = { id: string; source: string; target: string; risk: string; pathLength: number; likelihood: number; recommendation: string };
type ExposureChain = { chain: string; severity: string; status: string };
type AttackPathSummary = { generatedUtc: string; assetsInScope: number; vulnerabilitiesInScope?: number; crownJewelCount: number; attackPathCount: number; criticalPaths: number; averageLikelihood: number; crownJewels: CrownJewel[]; attackPaths: AttackPath[]; exposureChains: ExposureChain[]; recommendations: string[] };

const TABS = ["Overview", "Crown Jewels", "Attack Paths", "Exposure Chains", "Reports", "Settings"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("critical")) return "bg-red-700";
  if (v.includes("high")) return "bg-red-600";
  if (v.includes("medium") || v.includes("review")) return "bg-orange-500";
  if (v.includes("low")) return "bg-green-600";
  return "bg-gray-600";
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

export default function AttackPath() {
  const [data, setData] = useState<AttackPathSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const result = await AttackPathApi.summary();
      setData(result);
    } catch {
      setError("Failed to load attack path analysis.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredPaths = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.attackPaths.filter((p) => {
      const matchesQuery =
        p.source.toLowerCase().includes(q) ||
        p.target.toLowerCase().includes(q) ||
        p.recommendation.toLowerCase().includes(q) ||
        p.risk.toLowerCase().includes(q);
      const matchesRisk = riskFilter === "All" || p.risk === riskFilter;
      return matchesQuery && matchesRisk;
    });
  }, [data, query, riskFilter]);

  const exportPaths = () => {
    if (!data) return;
    const rows = [
      ["Source", "Target", "Risk", "Path Length", "Likelihood", "Recommendation"],
      ...filteredPaths.map((p) => [p.source, p.target, p.risk, p.pathLength, `${p.likelihood}%`, p.recommendation]),
    ];
    downloadTextFile("cybershield360-attack-paths.csv", rows.map((r) => r.map(csvSafe).join(",")).join("\n"));
    setMessage("Attack path report downloaded.");
  };

  const saveSetting = (setting: string) => {
    localStorage.setItem(`cs360_attack_path_${setting}`, "enabled");
    setMessage(`${setting} saved locally.`);
  };

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading attack path analysis...</div>;

  return (
    <div>
      <header className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Attack Path Analysis</h1>
          <p className="text-sm text-gray-500">
            Build attack paths from real scan findings, risks, vulnerabilities, and internet-facing asset evidence.
          </p>
        </div>
        <button onClick={load} className="btn-ghost border border-gray-200 dark:border-gray-700">Refresh</button>
      </header>

      <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />

      {message && <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-500 p-3 text-sm mb-4">{message}</div>}

      {tab === "Overview" && (
        <div>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="card"><div className="text-xs text-gray-500">Assets in Scope</div><div className="text-3xl font-bold">{data.assetsInScope}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Crown Jewels</div><div className="text-3xl font-bold">{data.crownJewelCount}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Attack Paths</div><div className="text-3xl font-bold text-orange-500">{data.attackPathCount}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Critical Paths</div><div className="text-3xl font-bold text-red-600">{data.criticalPaths}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Avg Likelihood</div><div className="text-3xl font-bold">{data.averageLikelihood}%</div></div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card"><h2 className="font-semibold mb-4">Top Recommendations</h2><div className="space-y-3">{data.recommendations.map((r, i) => <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="text-xs text-gray-500 mb-1">Action #{i + 1}</div><div className="font-medium">{r}</div></div>)}</div></div>
            <div className="card"><h2 className="font-semibold mb-4">Analysis Scope</h2><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Assets</span><span className="font-bold">{data.assetsInScope}</span></div><div className="flex justify-between"><span>Open Vulnerabilities</span><span className="font-bold">{data.vulnerabilitiesInScope ?? 0}</span></div><div className="flex justify-between"><span>Exposure Chains</span><span className="font-bold">{data.exposureChains.length}</span></div><div className="pt-4 text-xs text-gray-500">Generated: {formatDate(data.generatedUtc)}</div></div></div>
          </section>
        </div>
      )}

      {tab === "Crown Jewels" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.crownJewels.length === 0 ? <div className="card text-sm text-gray-500">No crown jewel candidates yet. Run full posture scans to identify exposed high-value assets.</div> : data.crownJewels.map((c) => <div key={c.id} className="card"><div className="flex justify-between gap-3 mb-2"><div><div className="font-semibold break-all">{c.asset}</div><div className="text-xs text-gray-500">Potential paths: {c.attackPaths}</div></div><span className={`badge ${badgeColor(c.criticality)}`}>{c.criticality}</span></div><div className="flex justify-between text-sm mb-1"><span>Exposure Score</span><span>{c.exposureScore}/100</span></div><div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${c.exposureScore}%` }} /></div></div>)}
        </div>
      )}

      {tab === "Attack Paths" && (
        <div className="card">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4"><h2 className="font-semibold">Prioritized Attack Paths</h2><div className="flex flex-col sm:flex-row gap-2"><input className="input" placeholder="Search source, target, recommendation..." value={query} onChange={(e) => setQuery(e.target.value)} /><select className="input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><button onClick={exportPaths} className="btn-primary">Export CSV</button></div></div>
          {filteredPaths.length === 0 ? <div className="text-sm text-gray-500">No attack paths match the selected filters.</div> : <div className="space-y-3">{filteredPaths.map((p) => <div key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="flex justify-between gap-3 mb-2"><div><div className="font-semibold">{p.source} → {p.target}</div><div className="text-xs text-gray-500">Path length: {p.pathLength} · Likelihood: {p.likelihood}%</div></div><span className={`badge ${badgeColor(p.risk)}`}>{p.risk}</span></div><div className="text-sm text-gray-500">{p.recommendation}</div></div>)}</div>}
        </div>
      )}

      {tab === "Exposure Chains" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.exposureChains.length === 0 ? <div className="card text-sm text-gray-500">No exposure chains generated yet.</div> : data.exposureChains.map((c, index) => <div key={`${c.chain}-${index}`} className="card"><div className="flex justify-between gap-3 mb-2"><div className="font-semibold">{c.chain}</div><span className={`badge ${badgeColor(c.severity)}`}>{c.severity}</span></div><div className="text-sm text-gray-500">Status: {c.status}</div></div>)}
        </div>
      )}

      {tab === "Reports" && (
        <div className="card"><h2 className="font-semibold mb-4">Attack Path Reports</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Attack Path Export</div><div className="text-sm text-gray-500 mt-1">Download filtered attack path data.</div><button onClick={exportPaths} className="btn-primary mt-4">Download CSV</button></div><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Crown Jewel Review</div><div className="text-sm text-gray-500 mt-1">Review highest exposure assets.</div><button onClick={() => setTab("Crown Jewels")} className="btn-primary mt-4">Open Review</button></div><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Exposure Chains</div><div className="text-sm text-gray-500 mt-1">Review chain-level exposure narratives.</div><button onClick={() => setTab("Exposure Chains")} className="btn-primary mt-4">View Chains</button></div></div></div>
      )}

      {tab === "Settings" && (
        <div className="card"><h2 className="font-semibold mb-4">Attack Path Settings</h2><div className="space-y-3">{["Prioritize Internet-Facing Assets", "Include Risk Register Signals", "Require Full Posture Scan Evidence"].map((item) => <div key={item} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4"><div><div className="font-semibold">{item}</div><div className="text-sm text-gray-500">Stored locally until dedicated settings endpoints are connected.</div></div><button onClick={() => saveSetting(item)} className="btn-primary">Save</button></div>)}</div></div>
      )}
    </div>
  );
}
