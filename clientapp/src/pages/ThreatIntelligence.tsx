import { useEffect, useMemo, useState } from "react";
import { ThreatIntelligenceApi } from "../api/endpoints";

type Indicator = { domain: string; indicator: string; type: string; severity: string; evidence: string; recommendation: string };
type DomainRisk = { domain: string; score: number; risk: number; riskLevel: string; lastSeenUtc?: string };
type ThreatIntel = { generatedUtc: string; threatScore: number; threatLevel: string; monitoredAssets: number; exposedPorts: number; emailThreats: number; webThreats: number; dnsThreats: number; indicators: Indicator[]; domainRisk: DomainRisk[]; actions: string[] };

const TYPES = ["All", "Exposed Service", "Email Spoofing Risk", "Web Header Weakness", "Web Exposure", "DNS Hygiene", "TLS Risk", "Security Signal"];

function levelColor(level: string) { if (level === "Critical") return "text-red-700"; if (level === "High") return "text-orange-600"; if (level === "Medium") return "text-yellow-600"; return "text-green-600"; }
function badgeColor(level: string) { if (level === "Critical" || level === "High") return "bg-red-600"; if (level === "Medium") return "bg-orange-500"; if (level === "Low") return "bg-yellow-500"; return "bg-slate-600"; }
function csvSafe(value: unknown) { const text = String(value ?? ""); return `"${text.replace(/"/g, '""')}"`; }
function downloadTextFile(filename: string, content: string) { const blob = new Blob([content], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }

export default function ThreatIntelligence() {
  const [data, setData] = useState<ThreatIntel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");

  const load = async () => { try { setLoading(true); setError(null); setData(await ThreatIntelligenceApi.summary()); } catch { setError("Failed to load threat intelligence."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const indicators = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.indicators.filter((i) => (type === "All" || i.type === type) && (!q || `${i.domain} ${i.indicator} ${i.type} ${i.evidence} ${i.recommendation}`.toLowerCase().includes(q)));
  }, [data, search, type]);

  const exportIndicators = () => {
    const rows = [["Domain", "Indicator", "Type", "Severity", "Evidence", "Recommendation"], ...indicators.map((i) => [i.domain, i.indicator, i.type, i.severity, i.evidence, i.recommendation])];
    downloadTextFile("cybershield360-threat-indicators.csv", rows.map((r) => r.map(csvSafe).join(",")).join("\n"));
  };

  if (loading && !data) return <div className="card text-sm text-slate-500">Loading threat intelligence...</div>;
  if (error) return <div className="card text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-500">Threat Intelligence</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Threat Intelligence Center</h1><p className="section-subtitle mt-1">Threat signals derived from exposed services, email posture, DNS hygiene, TLS, and web security findings.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={load} disabled={loading} className="btn-ghost">{loading ? "Refreshing..." : "Refresh"}</button><button onClick={exportIndicators} className="btn-primary">Export Indicators</button></div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="metric-card"><div className="section-subtitle">Threat Score</div><div className={`text-3xl font-bold ${levelColor(data.threatLevel)}`}>{data.threatScore}/100</div></div>
        <div className="metric-card"><div className="section-subtitle">Threat Level</div><div className={`text-2xl font-bold ${levelColor(data.threatLevel)}`}>{data.threatLevel}</div></div>
        <div className="metric-card"><div className="section-subtitle">Monitored Assets</div><div className="text-3xl font-bold">{data.monitoredAssets}</div></div>
        <div className="metric-card"><div className="section-subtitle">Exposed Ports</div><div className="text-3xl font-bold text-orange-600">{data.exposedPorts}</div></div>
        <div className="metric-card"><div className="section-subtitle">Email Threats</div><div className="text-3xl font-bold text-red-600">{data.emailThreats}</div></div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card"><h2 className="section-title mb-4">Threat Categories</h2><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Web threats</span><b>{data.webThreats}</b></div><div className="flex justify-between"><span>DNS threats</span><b>{data.dnsThreats}</b></div><div className="flex justify-between"><span>Email threats</span><b>{data.emailThreats}</b></div><div className="flex justify-between"><span>Exposed services</span><b>{data.exposedPorts}</b></div></div></div>
        <div className="card lg:col-span-2"><h2 className="section-title mb-4">Executive Actions</h2>{data.actions.length === 0 ? <p className="section-subtitle">No priority threat actions available.</p> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{data.actions.map((a, i) => <div key={i} className="rounded-xl border p-4 text-sm dark:border-slate-700"><b>#{i + 1}</b> {a}</div>)}</div>}</div>
      </section>

      <div className="card mb-6">
        <h2 className="section-title mb-4">Threat Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"><input className="input md:col-span-2" placeholder="Search indicators..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input" value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        {indicators.length === 0 ? <div className="empty-state"><div className="text-3xl mb-2">🛡️</div><h3 className="font-semibold">No indicators in this view</h3><p className="section-subtitle mt-1">Run full posture scans to generate evidence-backed threat indicators.</p></div> : <div className="space-y-3">{indicators.map((i) => <div key={`${i.domain}-${i.indicator}`} className="card p-4"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><div className="font-semibold">{i.domain}</div><div className="text-xs text-slate-500">{i.type} · {i.indicator}</div></div><span className={`badge ${badgeColor(i.severity)}`}>{i.severity}</span></div><p className="text-sm mt-3 text-slate-600 dark:text-slate-300">{i.evidence}</p><p className="text-sm mt-2"><b>Action:</b> {i.recommendation}</p></div>)}</div>}
      </div>

      <div className="card"><h2 className="section-title mb-4">Domain Risk Ranking</h2><div className="table-wrap"><table className="w-full text-sm"><thead className="table-head"><tr><th className="p-3">Domain</th><th>Scan Score</th><th>Threat Risk</th><th>Risk Level</th><th>Last Seen</th></tr></thead><tbody>{data.domainRisk.map((d) => <tr key={d.domain} className="border-t dark:border-slate-800"><td className="p-3 font-medium break-all">{d.domain}</td><td>{d.score}/100</td><td>{d.risk}/100</td><td><span className={`badge ${badgeColor(d.riskLevel)}`}>{d.riskLevel}</span></td><td>{d.lastSeenUtc ? new Date(d.lastSeenUtc).toLocaleString() : "-"}</td></tr>)}</tbody></table></div></div>
    </div>
  );
}
