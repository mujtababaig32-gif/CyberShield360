import { useEffect, useMemo, useState } from "react";
import { IncidentPlaybookApi } from "../api/endpoints";

import ModuleTabs from "../components/ModuleTabs";
type Playbook = { id: string; name: string; category: string; severity: string; steps: number; owner: string; status: string; lastTestedUtc?: string | null };
type Incident = { id: string; title: string; severity: string; status: string; playbook: string; affectedAssets: number; openedUtc?: string | null; owner: string };
type ResponseStep = { playbook: string; order: number; action: string; status: string; owner: string };
type Escalation = { severity: string; notify: string; sla: string; channel: string };
type IncidentPlaybookSummary = { generatedUtc: string; totalPlaybooks: number; activePlaybooks: number; openIncidents: number; criticalPlaybooks: number; responseSteps: number; usersInScope: number; assetsInScope: number; playbooks: Playbook[]; incidents: Incident[]; steps: ResponseStep[]; escalations: Escalation[]; recommendations: string[] };

const TABS = ["Overview", "Playbooks", "Signals", "Response Steps", "Escalations", "Reports", "Settings"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("critical") || v.includes("open") || v.includes("review")) return "bg-red-600";
  if (v.includes("high") || v.includes("progress") || v.includes("investigating")) return "bg-orange-500";
  if (v.includes("active") || v.includes("ready") || v.includes("completed") || v.includes("contained")) return "bg-green-600";
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

export default function IncidentPlaybook() {
  const [data, setData] = useState<IncidentPlaybookSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const result = await IncidentPlaybookApi.summary();
      setData(result);
    } catch {
      setError("Failed to load incident playbooks.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredIncidents = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.incidents.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      i.playbook.toLowerCase().includes(q) ||
      i.owner.toLowerCase().includes(q) ||
      i.severity.toLowerCase().includes(q)
    );
  }, [data, query]);

  const exportSignals = () => {
    if (!data) return;
    const rows = [
      ["Title", "Severity", "Status", "Playbook", "Affected Assets", "Owner", "Opened UTC"],
      ...filteredIncidents.map((i) => [i.title, i.severity, i.status, i.playbook, i.affectedAssets, i.owner, i.openedUtc || ""]),
    ];
    downloadTextFile("cybershield360-incident-signals.csv", rows.map((r) => r.map(csvSafe).join(",")).join("\n"));
    setMessage("Incident signal report downloaded.");
  };

  const saveSetting = (setting: string) => {
    localStorage.setItem(`cs360_incident_${setting}`, "enabled");
    setMessage(`${setting} saved locally.`);
  };

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading incident playbooks...</div>;

  return (
    <div>
      <header className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Incident Response Playbooks</h1>
          <p className="text-sm text-gray-500">
            Convert real vulnerability, risk, scan, and brand-alert signals into response-ready playbooks.
          </p>
        </div>
        <button onClick={load} className="btn-ghost border border-gray-200 dark:border-gray-700">Refresh</button>
      </header>

      <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />

      {message && <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-500 p-3 text-sm mb-4">{message}</div>}

      {tab === "Overview" && (
        <div>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="card"><div className="text-xs text-gray-500">Playbooks</div><div className="text-3xl font-bold">{data.totalPlaybooks}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Active / Ready</div><div className="text-3xl font-bold text-green-600">{data.activePlaybooks}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Open Signals</div><div className="text-3xl font-bold text-red-600">{data.openIncidents}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Critical Playbooks</div><div className="text-3xl font-bold text-red-600">{data.criticalPlaybooks}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Response Steps</div><div className="text-3xl font-bold">{data.responseSteps}</div></div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card"><h2 className="font-semibold mb-4">Response Recommendations</h2><div className="space-y-3">{data.recommendations.map((r, i) => <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="text-xs text-gray-500 mb-1">Action #{i + 1}</div><div className="font-medium">{r}</div></div>)}</div></div>
            <div className="card"><h2 className="font-semibold mb-4">Response Scope</h2><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Users in Scope</span><span className="font-bold">{data.usersInScope}</span></div><div className="flex justify-between"><span>Assets in Scope</span><span className="font-bold">{data.assetsInScope}</span></div><div className="flex justify-between"><span>Open Response Signals</span><span className="font-bold text-red-600">{data.openIncidents}</span></div><div className="pt-4 text-xs text-gray-500">Generated: {formatDate(data.generatedUtc)}</div></div></div>
          </section>
        </div>
      )}

      {tab === "Playbooks" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.playbooks.map((p) => <div key={p.id} className="card"><div className="flex justify-between gap-3 mb-2"><div><div className="font-semibold">{p.name}</div><div className="text-xs text-gray-500">{p.category} · Owner: {p.owner}</div></div><span className={`badge ${badgeColor(p.severity)}`}>{p.severity}</span></div><div className="text-sm text-gray-500 mb-2">Steps: {p.steps} · Status: {p.status}</div><div className="text-xs text-gray-500">Last tested: {formatDate(p.lastTestedUtc)}</div></div>)}
        </div>
      )}

      {tab === "Signals" && (
        <div className="card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4"><h2 className="font-semibold">Response Signals</h2><div className="flex flex-col sm:flex-row gap-2"><input className="input" placeholder="Search signal, owner, playbook..." value={query} onChange={(e) => setQuery(e.target.value)} /><button onClick={exportSignals} className="btn-primary">Export CSV</button></div></div>
          {filteredIncidents.length === 0 ? <div className="text-sm text-gray-500">No active response signals found from current vulnerabilities, risks, scans, or brand alerts.</div> : <div className="space-y-3">{filteredIncidents.map((i) => <div key={i.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="flex justify-between gap-3 mb-2"><div><div className="font-semibold">{i.title}</div><div className="text-xs text-gray-500">Playbook: {i.playbook} · Owner: {i.owner}</div></div><span className={`badge ${badgeColor(i.severity)}`}>{i.severity}</span></div><div className="text-sm text-gray-500">Status: {i.status} · Affected Assets: {i.affectedAssets}</div><div className="text-xs text-gray-500 mt-2">Opened: {formatDate(i.openedUtc)}</div></div>)}</div>}
        </div>
      )}

      {tab === "Response Steps" && (
        <div className="card"><h2 className="font-semibold mb-4">Response Steps</h2><div className="space-y-3">{data.steps.map((s, index) => <div key={`${s.playbook}-${s.order}-${index}`} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="flex justify-between gap-3 mb-2"><div><div className="font-semibold">Step {s.order}: {s.action}</div><div className="text-xs text-gray-500">{s.playbook} · Owner: {s.owner}</div></div><span className={`badge ${badgeColor(s.status)}`}>{s.status}</span></div></div>)}</div></div>
      )}

      {tab === "Escalations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{data.escalations.map((e) => <div key={e.severity} className="card"><div className="flex justify-between gap-3 mb-2"><div className="font-semibold">{e.severity} Escalation</div><span className={`badge ${badgeColor(e.severity)}`}>{e.severity}</span></div><div className="text-sm text-gray-500 mb-2">Notify: {e.notify}</div><div className="text-sm">SLA: <b>{e.sla}</b></div><div className="text-xs text-gray-500 mt-2">Channel: {e.channel}</div></div>)}</div>
      )}

      {tab === "Reports" && (
        <div className="card"><h2 className="font-semibold mb-4">Incident Reports</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Response Signal Report</div><div className="text-sm text-gray-500 mt-1">Export current incident-like signals.</div><button onClick={exportSignals} className="btn-primary mt-4">Download CSV</button></div><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Playbook Register</div><div className="text-sm text-gray-500 mt-1">View active playbooks and owners.</div><button onClick={() => setTab("Playbooks")} className="btn-primary mt-4">View Playbooks</button></div><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Escalation Matrix</div><div className="text-sm text-gray-500 mt-1">Review severity-based SLA and contacts.</div><button onClick={() => setTab("Escalations")} className="btn-primary mt-4">Open Matrix</button></div></div></div>
      )}

      {tab === "Settings" && (
        <div className="card"><h2 className="font-semibold mb-4">Response Settings</h2><div className="space-y-3">{["Review Playbooks Quarterly", "Escalate Critical Signals", "Require Owner Assignment"].map((item) => <div key={item} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4"><div><div className="font-semibold">{item}</div><div className="text-sm text-gray-500">Stored locally until dedicated settings endpoints are connected.</div></div><button onClick={() => saveSetting(item)} className="btn-primary">Save</button></div>)}</div></div>
      )}
    </div>
  );
}
