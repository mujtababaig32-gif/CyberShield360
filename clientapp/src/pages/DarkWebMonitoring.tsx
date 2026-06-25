import { useEffect, useMemo, useState } from "react";
import { DarkWebApi } from "../api/endpoints";

type Exposure = { domain: string; exposureType: string; leakedCredentialSignals: number; breachMentions: number; exposureScore: number; riskLevel: string; status: string; lastSeenUtc: string; recommendation: string };
type CredentialLeak = { domain: string; emailPattern: string; leakType: string; severity: string; source: string; lastSeenUtc: string; action: string };
type Integration = { name: string; status: string };
type DarkWebSummary = { generatedUtc: string; monitoredDomains: number; totalExposures: number; highRiskExposures: number; mediumRiskExposures: number; lowRiskExposures: number; leakedCredentialSignals: number; breachMentions: number; darkWebRiskScore: number; connectorMode?: string; evidenceQuality?: string; exposures: Exposure[]; credentialLeaks: CredentialLeak[]; executiveActions: string[]; integrations: Integration[] };

const TABS = ["Overview", "Exposure Signals", "Credential Leaks", "Actions", "Integrations"];
const LEVELS = ["All", "High", "Medium", "Low"];
function badgeColor(value: string) { if (value === "High" || value === "Investigate") return "bg-red-600"; if (value === "Medium") return "bg-orange-500"; if (value === "Low" || value === "Monitoring") return "bg-green-600"; return "bg-slate-600"; }
function csvSafe(value: unknown) { const text = String(value ?? ""); return `"${text.replace(/"/g, '""')}"`; }
function downloadTextFile(filename: string, content: string) { const blob = new Blob([content], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }

export default function DarkWebMonitoring() {
  const [data, setData] = useState<DarkWebSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All");

  const load = async () => { try { setLoading(true); setError(null); setData(await DarkWebApi.summary()); } catch { setError("Failed to load dark web monitoring."); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const exposures = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.exposures.filter((e) => (level === "All" || e.riskLevel === level) && (!q || `${e.domain} ${e.exposureType} ${e.status} ${e.recommendation}`.toLowerCase().includes(q)));
  }, [data, search, level]);

  const exportExposures = () => {
    const rows = [["Domain", "Type", "Risk", "Status", "Credential Signals", "Breach Mentions", "Recommendation"], ...exposures.map((e) => [e.domain, e.exposureType, e.riskLevel, e.status, e.leakedCredentialSignals, e.breachMentions, e.recommendation])];
    downloadTextFile("cybershield360-dark-web-monitoring.csv", rows.map((r) => r.map(csvSafe).join(",")).join("\n"));
  };

  if (loading && !data) return <div className="card text-sm text-slate-500">Loading dark web monitoring...</div>;
  if (error) return <div className="card text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-500">Exposure Intelligence</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dark Web Monitoring</h1><p className="section-subtitle mt-1">Credential leak and breach monitoring with honest connector status. No dark-web breach is claimed unless a provider is configured.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={load} disabled={loading} className="btn-ghost">{loading ? "Refreshing..." : "Refresh"}</button><button onClick={exportExposures} className="btn-primary">Export Signals</button></div>
      </header>

      <div className="card mb-5 border-orange-500/30 bg-orange-500/5"><div className="font-semibold">{data.connectorMode ?? "Dark-web provider not configured"}</div><p className="section-subtitle mt-1">{data.evidenceQuality ?? "This module currently shows domain exposure signals only. Configure a breach-intelligence provider for verified leaked credential results."}</p></div>

      <div className="flex flex-wrap gap-2 mb-6">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={tab === t ? "btn-primary" : "btn-ghost"}>{t}</button>)}</div>

      {tab === "Overview" && <div><section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6"><div className="metric-card"><div className="section-subtitle">Monitored Domains</div><div className="text-3xl font-bold">{data.monitoredDomains}</div></div><div className="metric-card"><div className="section-subtitle">Risk Score</div><div className="text-3xl font-bold">{data.darkWebRiskScore}/100</div></div><div className="metric-card"><div className="section-subtitle">High Risk</div><div className="text-3xl font-bold text-red-600">{data.highRiskExposures}</div></div><div className="metric-card"><div className="section-subtitle">Credential Signals</div><div className="text-3xl font-bold text-orange-600">{data.leakedCredentialSignals}</div></div><div className="metric-card"><div className="section-subtitle">Breach Mentions</div><div className="text-3xl font-bold">{data.breachMentions}</div></div></section><div className="card"><h2 className="section-title mb-4">Executive Actions</h2>{data.executiveActions.length === 0 ? <p className="section-subtitle">No verified dark-web actions are available yet. Configure an intelligence provider to enable breach evidence.</p> : <div className="space-y-3">{data.executiveActions.map((a, i) => <div key={i} className="rounded-xl border p-4 text-sm dark:border-slate-700"><b>#{i + 1}</b> {a}</div>)}</div>}</div></div>}

      {tab === "Exposure Signals" && <div className="card"><h2 className="section-title mb-4">Exposure Signals</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"><input className="input md:col-span-2" placeholder="Search domains..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input" value={level} onChange={(e) => setLevel(e.target.value)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>{exposures.length === 0 ? <div className="empty-state"><div className="text-3xl mb-2">🕵️</div><h3 className="font-semibold">No exposure signals</h3><p className="section-subtitle mt-1">Add domains/assets or configure a breach provider.</p></div> : <div className="space-y-3">{exposures.map((e) => <div key={e.domain} className="card p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="font-semibold break-all">{e.domain}</div><div className="text-xs text-slate-500">{e.exposureType}</div></div><span className={`badge ${badgeColor(e.riskLevel)}`}>{e.riskLevel}</span></div><p className="text-sm mt-3">{e.recommendation}</p><div className="text-xs text-slate-500 mt-2">Last seen: {new Date(e.lastSeenUtc).toLocaleString()} · Status: {e.status}</div></div>)}</div>}</div>}
      {tab === "Credential Leaks" && <div className="card"><h2 className="section-title mb-4">Credential Leak Evidence</h2>{data.credentialLeaks.length === 0 ? <div className="empty-state"><div className="text-3xl mb-2">🔐</div><h3 className="font-semibold">No verified credential leak evidence</h3><p className="section-subtitle mt-1">Connect HaveIBeenPwned, DeHashed, LeakCheck, or IntelX before showing breach results.</p></div> : <div className="space-y-3">{data.credentialLeaks.map((l) => <div key={`${l.domain}-${l.emailPattern}`} className="card p-4"><b>{l.emailPattern}</b><div className="text-sm text-slate-500">{l.leakType} · {l.source}</div><p className="text-sm mt-2">{l.action}</p></div>)}</div>}</div>}
      {tab === "Actions" && <div className="card"><h2 className="section-title mb-4">Recommended Actions</h2>{data.executiveActions.length === 0 ? <p className="section-subtitle">No verified dark-web remediation actions yet.</p> : data.executiveActions.map((a, i) => <div key={i} className="rounded-xl border p-4 mb-3 text-sm dark:border-slate-700"><b>#{i + 1}</b> {a}</div>)}</div>}
      {tab === "Integrations" && <div className="card"><h2 className="section-title mb-4">Provider Integrations</h2><div className="space-y-3">{data.integrations.map((i) => <div key={i.name} className="rounded-xl border p-4 flex items-center justify-between dark:border-slate-700"><div><b>{i.name}</b><div className="section-subtitle">Credential/breach intelligence provider</div></div><span className={`badge ${badgeColor(i.status)}`}>{i.status}</span></div>)}</div></div>}
    </div>
  );
}
