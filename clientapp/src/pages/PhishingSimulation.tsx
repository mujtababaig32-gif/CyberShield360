import { useEffect, useMemo, useState } from "react";
import { PhishingSimulationApi } from "../api/endpoints";

type Campaign = {
  id: string;
  name: string;
  status: string;
  template: string;
  audience: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  submissionRate: number;
  reportRate: number;
  launchedUtc?: string | null;
  authorizationConfirmed?: boolean;
};

type Recipient = {
  userId: string;
  name: string;
  email: string;
  department: string;
  campaignName?: string;
  sent: boolean;
  opened: boolean;
  clicked: boolean;
  submittedCredentials: boolean;
  reportedPhish: boolean;
  riskLevel: string;
  lastEventUtc?: string | null;
  recommendedAction: string;
};

type Template = {
  name: string;
  category: string;
  difficulty: string;
  status: string;
};

type PhishingSummary = {
  generatedUtc: string;
  totalRecipients: number;
  emailsSent: number;
  opened: number;
  clicked: number;
  submittedCredentials: number;
  reportedPhish: number;
  clickRate: number;
  submissionRate: number;
  reportRate: number;
  highRiskUsers: number;
  campaigns: Campaign[];
  recipients: Recipient[];
  templates: Template[];
  recommendations: string[];
};

const TABS = ["Overview", "Campaigns", "Recipients", "Templates", "Reports", "Settings"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("critical") || v.includes("high") || v.includes("submitted")) return "bg-red-600";
  if (v.includes("medium") || v.includes("running") || v.includes("draft")) return "bg-orange-500";
  if (v.includes("completed") || v.includes("reported") || v.includes("low")) return "bg-green-600";
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
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

export default function PhishingSimulation() {
  const [data, setData] = useState<PhishingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const result = await PhishingSimulationApi.summary();
      setData(result);
    } catch {
      setError("Failed to load phishing simulation.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRecipients = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data.recipients.filter((r) => {
      const matchesQuery =
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        (r.campaignName || "").toLowerCase().includes(q);
      const matchesRisk = riskFilter === "All" || r.riskLevel === riskFilter;
      return matchesQuery && matchesRisk;
    });
  }, [data, query, riskFilter]);

  const exportRecipients = () => {
    if (!data) return;
    const rows = [
      ["Name", "Email", "Department", "Campaign", "Sent", "Opened", "Clicked", "Submitted", "Reported", "Risk", "Last Event", "Recommended Action"],
      ...filteredRecipients.map((r) => [
        r.name,
        r.email,
        r.department,
        r.campaignName || "",
        r.sent ? "Yes" : "No",
        r.opened ? "Yes" : "No",
        r.clicked ? "Yes" : "No",
        r.submittedCredentials ? "Yes" : "No",
        r.reportedPhish ? "Yes" : "No",
        r.riskLevel,
        r.lastEventUtc || "",
        r.recommendedAction,
      ]),
    ];
    downloadTextFile("cybershield360-phishing-recipients.csv", rows.map((r) => r.map(csvSafe).join(",")).join("\n"));
    setMessage("Phishing recipient report downloaded.");
  };

  const saveSetting = (name: string) => {
    localStorage.setItem(`cs360_phishing_${name}`, "enabled");
    setMessage(`${name} saved locally.`);
  };

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading phishing simulation...</div>;

  return (
    <div>
      <header className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Phishing Simulation</h1>
          <p className="text-sm text-gray-500">
            Review authorized campaign performance, recipient behavior, reporting rate, and coaching needs.
          </p>
        </div>
        <button onClick={load} className="btn-ghost border border-gray-200 dark:border-gray-700">Refresh</button>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm border ${tab === t ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"}`}>{t}</button>
        ))}
      </div>

      {message && <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-500 p-3 text-sm mb-4">{message}</div>}

      {tab === "Overview" && (
        <div>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="card"><div className="text-xs text-gray-500">Recipients</div><div className="text-3xl font-bold">{data.totalRecipients}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Click Rate</div><div className="text-3xl font-bold text-orange-500">{data.clickRate}%</div></div>
            <div className="card"><div className="text-xs text-gray-500">Submission Rate</div><div className="text-3xl font-bold text-red-600">{data.submissionRate}%</div></div>
            <div className="card"><div className="text-xs text-gray-500">Report Rate</div><div className="text-3xl font-bold text-green-600">{data.reportRate}%</div></div>
            <div className="card"><div className="text-xs text-gray-500">High Risk Users</div><div className="text-3xl font-bold text-red-600">{data.highRiskUsers}</div></div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="font-semibold mb-4">Simulation Recommendations</h2>
              <div className="space-y-3">
                {data.recommendations.map((r, i) => <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="text-xs text-gray-500 mb-1">Action #{i + 1}</div><div className="font-medium">{r}</div></div>)}
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-4">Engagement Funnel</h2>
              {[{ label: "Sent", value: data.emailsSent }, { label: "Opened", value: data.opened }, { label: "Clicked", value: data.clicked }, { label: "Submitted", value: data.submittedCredentials }, { label: "Reported", value: data.reportedPhish }].map((item) => (
                <div key={item.label} className="mb-3">
                  <div className="flex justify-between text-sm mb-1"><span>{item.label}</span><span className="font-semibold">{item.value}</span></div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${data.totalRecipients === 0 ? 0 : Math.min(100, Math.round(item.value * 100 / data.totalRecipients))}%` }} /></div>
                </div>
              ))}
              <div className="pt-2 text-xs text-gray-500">Generated: {formatDate(data.generatedUtc)}</div>
            </div>
          </section>
        </div>
      )}

      {tab === "Campaigns" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.campaigns.length === 0 ? <div className="card text-sm text-gray-500">No phishing campaigns configured yet. Create authorized campaigns before measuring recipients.</div> : data.campaigns.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-3"><div><div className="font-semibold">{c.name}</div><div className="text-xs text-gray-500">{c.template} · {c.audience}</div></div><span className={`badge ${badgeColor(c.status)}`}>{c.status}</span></div>
              {!c.authorizationConfirmed && <div className="rounded-lg bg-orange-500/10 text-orange-500 text-xs p-2 mb-3">Authorization is not confirmed for this campaign.</div>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"><div><div className="text-gray-500">Open</div><b>{c.openRate}%</b></div><div><div className="text-gray-500">Click</div><b>{c.clickRate}%</b></div><div><div className="text-gray-500">Submit</div><b>{c.submissionRate}%</b></div><div><div className="text-gray-500">Report</div><b>{c.reportRate}%</b></div></div>
              <div className="text-xs text-gray-500 mt-3">Launched/Scheduled: {formatDate(c.launchedUtc)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "Recipients" && (
        <div className="card">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
            <h2 className="font-semibold">Recipient Behavior</h2>
            <div className="flex flex-col sm:flex-row gap-2"><input className="input" placeholder="Search recipient, campaign..." value={query} onChange={(e) => setQuery(e.target.value)} /><select className="input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><button onClick={exportRecipients} className="btn-primary">Export CSV</button></div>
          </div>
          {filteredRecipients.length === 0 ? <div className="text-sm text-gray-500">No recipients match the selected filters.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800"><th className="py-2">Recipient</th><th>Campaign</th><th>Behavior</th><th>Risk</th><th>Last Event</th><th>Action</th></tr></thead><tbody>{filteredRecipients.map((r, index) => <tr key={`${r.userId}-${index}`} className="border-b border-gray-100 dark:border-gray-800 align-top"><td className="py-3"><div className="font-semibold">{r.name}</div><div className="text-xs text-gray-500">{r.email} · {r.department}</div></td><td>{r.campaignName || "-"}</td><td className="text-xs">{r.submittedCredentials ? "Submitted" : r.clicked ? "Clicked" : r.opened ? "Opened" : r.reportedPhish ? "Reported" : r.sent ? "Delivered" : "Not sent"}</td><td><span className={`badge ${badgeColor(r.riskLevel)}`}>{r.riskLevel}</span></td><td className="text-xs text-gray-500">{formatDate(r.lastEventUtc)}</td><td className="max-w-xs text-xs text-gray-500">{r.recommendedAction}</td></tr>)}</tbody></table></div>}
        </div>
      )}

      {tab === "Templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.templates.length === 0 ? <div className="card text-sm text-gray-500">No campaign templates found from existing campaigns.</div> : data.templates.map((t) => <div key={t.name} className="card"><div className="font-semibold">{t.name}</div><div className="text-sm text-gray-500 mt-1">{t.category}</div><div className="flex gap-2 mt-4"><span className="badge bg-brand-600">{t.difficulty}</span><span className={`badge ${badgeColor(t.status)}`}>{t.status}</span></div></div>)}
        </div>
      )}

      {tab === "Reports" && (
        <div className="card"><h2 className="font-semibold mb-4">Phishing Reports</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Recipient Behavior</div><div className="text-sm text-gray-500 mt-1">Export filtered recipient results.</div><button onClick={exportRecipients} className="btn-primary mt-4">Download CSV</button></div><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">High Risk Users</div><div className="text-sm text-gray-500 mt-1">Review users who clicked or submitted.</div><button onClick={() => { setRiskFilter("High"); setTab("Recipients"); }} className="btn-primary mt-4">Review Users</button></div><div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Campaign Summary</div><div className="text-sm text-gray-500 mt-1">Open, click, submit, and report rates.</div><button onClick={() => setTab("Campaigns")} className="btn-primary mt-4">View Campaigns</button></div></div></div>
      )}

      {tab === "Settings" && (
        <div className="card"><h2 className="font-semibold mb-4">Simulation Settings</h2><div className="space-y-3">{["Require Authorization Confirmation", "Disable Credential Collection", "Send Coaching After Click"].map((item) => <div key={item} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4"><div><div className="font-semibold">{item}</div><div className="text-sm text-gray-500">Safety settings are stored locally until dedicated endpoints are connected.</div></div><button onClick={() => saveSetting(item)} className="btn-primary">Save</button></div>)}</div></div>
      )}
    </div>
  );
}
