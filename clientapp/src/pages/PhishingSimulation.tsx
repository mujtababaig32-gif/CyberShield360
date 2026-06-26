import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PhishingSimulationApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

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

function dateText(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

function riskPriority(risk: string) {
  if (risk === "High") return "Coaching Required";
  if (risk === "Medium") return "Review";
  if (risk === "Low") return "Monitor";
  return risk;
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

export default function PhishingSimulation() {
  const [data, setData] = useState<PhishingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await PhishingSimulationApi.summary();
      setData(result);
    } catch {
      setError("Failed to load phishing simulation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredRecipients = useMemo(() => {
    if (!data) return [];

    const q = query.toLowerCase();

    return data.recipients.filter((recipient) => {
      const matchesQuery =
        recipient.name.toLowerCase().includes(q) ||
        recipient.email.toLowerCase().includes(q) ||
        recipient.department.toLowerCase().includes(q) ||
        (recipient.campaignName || "").toLowerCase().includes(q);
      const matchesRisk = riskFilter === "All" || recipient.riskLevel === riskFilter;

      return matchesQuery && matchesRisk;
    });
  }, [data, query, riskFilter]);

  const funnel = useMemo(() => {
    if (!data) return [];

    return [
      { stage: "Sent", count: data.emailsSent },
      { stage: "Opened", count: data.opened },
      { stage: "Clicked", count: data.clicked },
      { stage: "Submitted", count: data.submittedCredentials },
      { stage: "Reported", count: data.reportedPhish },
    ];
  }, [data]);

  const exportRecipients = () => {
    if (!data) return;

    const rows = [
      [
        "Name",
        "Email",
        "Department",
        "Campaign",
        "Sent",
        "Opened",
        "Clicked",
        "Submitted",
        "Reported",
        "Risk",
        "Last Event",
        "Recommended Action",
      ],
      ...filteredRecipients.map((recipient) => [
        recipient.name,
        recipient.email,
        recipient.department,
        recipient.campaignName || "",
        recipient.sent ? "Yes" : "No",
        recipient.opened ? "Yes" : "No",
        recipient.clicked ? "Yes" : "No",
        recipient.submittedCredentials ? "Yes" : "No",
        recipient.reportedPhish ? "Yes" : "No",
        recipient.riskLevel,
        recipient.lastEventUtc || "",
        recipient.recommendedAction,
      ]),
    ];

    downloadTextFile(
      "cybershield360-phishing-recipients.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );

    setMessage("Phishing recipient report downloaded.");
  };

  const saveSetting = (name: string) => {
    localStorage.setItem(`cs360_phishing_${name}`, "enabled");
    setMessage(`${name} saved locally.`);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-500">Loading phishing simulation...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            Authorized Simulation
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Phishing Simulation
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Review campaign performance, recipient behavior, reporting rate, and coaching needs for authorized simulations.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} className="btn-ghost">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {message && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-300">
          {message}
        </div>
      )}

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CyberStatCard label="Recipients" value={data.totalRecipients} hint="Users in campaigns" tone="brand" />
            <CyberStatCard label="Click Rate" value={`${data.clickRate}%`} hint="Clicked links" tone={data.clickRate > 10 ? "orange" : "green"} />
            <CyberStatCard label="Submission Rate" value={`${data.submissionRate}%`} hint="Credential submissions" tone={data.submissionRate > 0 ? "red" : "green"} />
            <CyberStatCard label="Report Rate" value={`${data.reportRate}%`} hint="Reported suspicious email" tone={data.reportRate >= 50 ? "green" : "orange"} />
            <CyberStatCard label="High Risk Users" value={data.highRiskUsers} hint="Need coaching" tone={data.highRiskUsers > 0 ? "red" : "green"} />
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CyberChartCard
                title="Engagement Funnel"
                description="Authorized simulation flow from sent emails to user reporting."
                insight={
                  data.submittedCredentials > 0
                    ? `${data.submittedCredentials} credential submission(s) require immediate coaching.`
                    : "No credential submissions recorded in the current simulation data."
                }
              >
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={funnel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "14px",
                        color: "#e2e8f0",
                        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
                      }}
                      labelStyle={{ color: "#99f6e4", fontWeight: 800 }}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#10B5A6" />
                  </BarChart>
                </ResponsiveContainer>
              </CyberChartCard>
            </div>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Simulation Recommendations
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Actions to reduce human phishing risk.
                </p>
              </div>

              <div className="space-y-3">
                {data.recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No simulation recommendations available.
                  </div>
                ) : (
                  data.recommendations.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                        Action #{index + 1}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                        {item}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      )}

      {tab === "Campaigns" && (
        <CyberTable
          title="Campaign Register"
          description="Authorized campaign status, audience, template, engagement rates, and launch date."
          data={data.campaigns}
          emptyText="No phishing campaigns configured yet."
          columns={[
            {
              key: "campaign",
              label: "Campaign",
              render: (campaign) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{campaign.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {campaign.template} · {campaign.audience}
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (campaign) => <CyberStatusBadge value={campaign.status} />,
            },
            {
              key: "auth",
              label: "Authorization",
              render: (campaign) => (
                <CyberStatusBadge
                  value={campaign.authorizationConfirmed ? "Confirmed" : "Needs Confirmation"}
                />
              ),
            },
            {
              key: "sent",
              label: "Sent",
              render: (campaign) => <div className="font-black text-white">{campaign.sentCount}</div>,
            },
            {
              key: "rates",
              label: "Rates",
              render: (campaign) => (
                <div className="text-sm text-slate-300">
                  Open {campaign.openRate}% · Click {campaign.clickRate}%
                  <br />
                  Submit {campaign.submissionRate}% · Report {campaign.reportRate}%
                </div>
              ),
            },
            {
              key: "launched",
              label: "Launched",
              render: (campaign) => (
                <div className="whitespace-nowrap text-slate-400">
                  {dateText(campaign.launchedUtc)}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Recipients" && (
        <div className="space-y-6">
          <section className="card grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              className="input"
              placeholder="Search recipient, email, department..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="input"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
            >
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <button type="button" onClick={exportRecipients} className="btn-primary">
              Export CSV
            </button>
          </section>

          <CyberTable
            title="Recipient Behavior"
            description="Recipient simulation behavior, risk level, and recommended coaching action."
            data={filteredRecipients}
            emptyText="No recipients match the selected filters."
            columns={[
              {
                key: "recipient",
                label: "Recipient",
                render: (recipient) => (
                  <div className="mx-auto min-w-72 text-center">
                    <div className="font-semibold text-white">{recipient.name}</div>
                    <div className="mt-1 break-all text-xs text-slate-500">
                      {recipient.email}
                    </div>
                  </div>
                ),
              },
              {
                key: "department",
                label: "Department",
                render: (recipient) => (
                  <div className="min-w-40 text-slate-300">{recipient.department}</div>
                ),
              },
              {
                key: "campaign",
                label: "Campaign",
                render: (recipient) => (
                  <div className="min-w-48 text-slate-300">{recipient.campaignName || "-"}</div>
                ),
              },
              {
                key: "behavior",
                label: "Behavior",
                render: (recipient) => (
                  <div className="text-sm text-slate-300">
                    Sent {recipient.sent ? "Yes" : "No"} · Opened {recipient.opened ? "Yes" : "No"}
                    <br />
                    Clicked {recipient.clicked ? "Yes" : "No"} · Submitted{" "}
                    {recipient.submittedCredentials ? "Yes" : "No"}
                  </div>
                ),
              },
              {
                key: "reported",
                label: "Reported",
                render: (recipient) => (
                  <CyberStatusBadge value={recipient.reportedPhish ? "Reported" : "Not Reported"} />
                ),
              },
              {
                key: "risk",
                label: "Risk",
                render: (recipient) => <CyberStatusBadge value={recipient.riskLevel} />,
              },
              {
                key: "action",
                label: "Recommended Action",
                render: (recipient) => (
                  <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                    {recipient.recommendedAction}
                  </div>
                ),
              },
              {
                key: "priority",
                label: "Priority",
                render: (recipient) => <CyberStatusBadge value={riskPriority(recipient.riskLevel)} />,
              },
            ]}
          />
        </div>
      )}

      {tab === "Templates" && (
        <CyberTable
          title="Phishing Templates"
          description="Template category, difficulty, and readiness status."
          data={data.templates}
          emptyText="No templates available."
          columns={[
            {
              key: "template",
              label: "Template",
              render: (template) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{template.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{template.category}</div>
                </div>
              ),
            },
            {
              key: "difficulty",
              label: "Difficulty",
              render: (template) => <CyberStatusBadge value={template.difficulty} />,
            },
            {
              key: "status",
              label: "Status",
              render: (template) => <CyberStatusBadge value={template.status} />,
            },
          ]}
        />
      )}

      {tab === "Reports" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <h2 className="font-black text-white">Recipient Behavior Export</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Export recipient behavior, risk levels, last event, and recommended coaching actions.
          </p>
          <button type="button" onClick={exportRecipients} className="btn-primary mt-4">
            Download CSV
          </button>
        </section>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Simulation Settings
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Recommended controls for authorized phishing simulations.
            </p>
          </div>

          <div className="space-y-3">
            {["Require campaign authorization", "Coach high-risk recipients", "Track reported phish rate"].map((setting) => (
              <div
                key={setting}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-center sm:text-left">
                  <div className="font-semibold text-white">{setting}</div>
                  <div className="text-sm text-slate-500">
                    Recommended control for responsible simulation governance.
                  </div>
                </div>

                <button type="button" onClick={() => saveSetting(setting)} className="btn-primary">
                  Save
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="text-xs text-slate-400">
        Generated: {dateText(data.generatedUtc)}
      </div>
    </div>
  );
}
