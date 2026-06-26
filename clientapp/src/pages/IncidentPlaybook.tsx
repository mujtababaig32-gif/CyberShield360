import { useEffect, useMemo, useState } from "react";
import { IncidentPlaybookApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type Playbook = {
  id: string;
  name: string;
  category: string;
  severity: string;
  steps: number;
  owner: string;
  status: string;
  lastTestedUtc?: string | null;
};

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  playbook: string;
  affectedAssets: number;
  openedUtc?: string | null;
  owner: string;
};

type ResponseStep = {
  playbook: string;
  order: number;
  action: string;
  status: string;
  owner: string;
};

type Escalation = {
  severity: string;
  notify: string;
  sla: string;
  channel: string;
};

type IncidentPlaybookSummary = {
  generatedUtc: string;
  totalPlaybooks: number;
  activePlaybooks: number;
  openIncidents: number;
  criticalPlaybooks: number;
  responseSteps: number;
  usersInScope: number;
  assetsInScope: number;
  playbooks: Playbook[];
  incidents: Incident[];
  steps: ResponseStep[];
  escalations: Escalation[];
  recommendations: string[];
};

const TABS = [
  "Overview",
  "Playbooks",
  "Signals",
  "Response Steps",
  "Escalations",
  "Reports",
  "Settings",
];

function dateText(value?: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

function signalPriority(severity: string) {
  const value = severity.toLowerCase();

  if (value.includes("critical")) return "Immediate";
  if (value.includes("high")) return "Priority";
  if (value.includes("medium")) return "Planned";

  return "Monitor";
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

export default function IncidentPlaybook() {
  const [data, setData] = useState<IncidentPlaybookSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await IncidentPlaybookApi.summary();
      setData(result);
    } catch {
      setError("Failed to load incident playbooks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredIncidents = useMemo(() => {
    if (!data) return [];

    const q = query.toLowerCase();

    return data.incidents.filter(
      (incident) =>
        incident.title.toLowerCase().includes(q) ||
        incident.playbook.toLowerCase().includes(q) ||
        incident.owner.toLowerCase().includes(q) ||
        incident.severity.toLowerCase().includes(q)
    );
  }, [data, query]);

  const exportSignals = () => {
    if (!data) return;

    const rows = [
      ["Title", "Severity", "Status", "Playbook", "Affected Assets", "Owner", "Opened UTC"],
      ...filteredIncidents.map((incident) => [
        incident.title,
        incident.severity,
        incident.status,
        incident.playbook,
        incident.affectedAssets,
        incident.owner,
        incident.openedUtc || "",
      ]),
    ];

    downloadTextFile(
      "cybershield360-incident-signals.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );

    setMessage("Incident signal report downloaded.");
  };

  const saveSetting = (setting: string) => {
    localStorage.setItem(`cs360_incident_${setting}`, "enabled");
    setMessage(`${setting} saved locally.`);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-500">Loading incident playbooks...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            Incident Response
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Incident Response Playbooks
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Convert vulnerability, risk, scan, and brand-alert signals into response-ready playbooks.
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
            <CyberStatCard label="Playbooks" value={data.totalPlaybooks} hint="All response playbooks" tone="brand" />
            <CyberStatCard label="Active / Ready" value={data.activePlaybooks} hint="Ready to use" tone="green" />
            <CyberStatCard label="Open Signals" value={data.openIncidents} hint="Response signals" tone={data.openIncidents > 0 ? "red" : "green"} />
            <CyberStatCard label="Critical Playbooks" value={data.criticalPlaybooks} hint="High priority" tone="red" />
            <CyberStatCard label="Response Steps" value={data.responseSteps} hint="Procedure steps" tone="brand" />
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Response Recommendations
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Recommended improvements for response readiness.
                </p>
              </div>

              <div className="space-y-3">
                {data.recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No recommendations available.
                  </div>
                ) : (
                  data.recommendations.map((recommendation, index) => (
                    <div
                      key={`${recommendation}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                        Action #{index + 1}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                        {recommendation}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Response Scope
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Current tenant scope included in response readiness.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  ["Users in Scope", data.usersInScope],
                  ["Assets in Scope", data.assetsInScope],
                  ["Open Response Signals", data.openIncidents],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"
                  >
                    <span className="text-slate-400">{label}</span>
                    <span className="font-black text-white">{value}</span>
                  </div>
                ))}

                <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-center text-xs leading-6 text-slate-400">
                  Generated: {dateText(data.generatedUtc)}
                </div>
              </div>
            </section>
          </section>
        </div>
      )}

      {tab === "Playbooks" && (
        <CyberTable
          title="Playbook Register"
          description="Response playbooks with category, severity, status, owner, steps, and last test date."
          data={data.playbooks}
          emptyText="No playbooks available."
          columns={[
            {
              key: "playbook",
              label: "Playbook",
              render: (playbook) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{playbook.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{playbook.category}</div>
                </div>
              ),
            },
            {
              key: "severity",
              label: "Severity",
              render: (playbook) => <CyberStatusBadge value={playbook.severity} />,
            },
            {
              key: "status",
              label: "Status",
              render: (playbook) => <CyberStatusBadge value={playbook.status} />,
            },
            {
              key: "owner",
              label: "Owner",
              render: (playbook) => <div className="min-w-40 text-slate-300">{playbook.owner}</div>,
            },
            {
              key: "steps",
              label: "Steps",
              render: (playbook) => <div className="font-black text-white">{playbook.steps}</div>,
            },
            {
              key: "tested",
              label: "Last Tested",
              render: (playbook) => (
                <div className="whitespace-nowrap text-slate-400">
                  {dateText(playbook.lastTestedUtc)}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Signals" && (
        <div className="space-y-6">
          <section className="card grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <input
              className="input"
              placeholder="Search signal, owner, playbook..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="button" onClick={exportSignals} className="btn-primary">
              Export CSV
            </button>
          </section>

          <CyberTable
            title="Response Signals"
            description="Active response signals linked to playbooks, owners, affected assets, and opening date."
            data={filteredIncidents}
            emptyText="No active response signals found."
            columns={[
              {
                key: "signal",
                label: "Signal",
                render: (incident) => (
                  <div className="mx-auto min-w-72 text-center">
                    <div className="font-semibold text-white">{incident.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Playbook: {incident.playbook}
                    </div>
                  </div>
                ),
              },
              {
                key: "severity",
                label: "Severity",
                render: (incident) => <CyberStatusBadge value={incident.severity} />,
              },
              {
                key: "status",
                label: "Status",
                render: (incident) => <CyberStatusBadge value={incident.status} />,
              },
              {
                key: "owner",
                label: "Owner",
                render: (incident) => <div className="min-w-40 text-slate-300">{incident.owner}</div>,
              },
              {
                key: "assets",
                label: "Affected Assets",
                render: (incident) => <div className="font-black text-white">{incident.affectedAssets}</div>,
              },
              {
                key: "opened",
                label: "Opened",
                render: (incident) => (
                  <div className="whitespace-nowrap text-slate-400">
                    {dateText(incident.openedUtc)}
                  </div>
                ),
              },
              {
                key: "priority",
                label: "Priority",
                render: (incident) => <CyberStatusBadge value={signalPriority(incident.severity)} />,
              },
            ]}
          />
        </div>
      )}

      {tab === "Response Steps" && (
        <CyberTable
          title="Response Steps"
          description="Procedure steps mapped to playbooks, owners, and current status."
          data={data.steps}
          emptyText="No response steps available."
          columns={[
            {
              key: "order",
              label: "Step",
              render: (step) => <div className="font-black text-white">#{step.order}</div>,
            },
            {
              key: "playbook",
              label: "Playbook",
              render: (step) => (
                <div className="mx-auto min-w-64 text-center font-semibold text-white">
                  {step.playbook}
                </div>
              ),
            },
            {
              key: "action",
              label: "Action",
              render: (step) => (
                <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                  {step.action}
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (step) => <CyberStatusBadge value={step.status} />,
            },
            {
              key: "owner",
              label: "Owner",
              render: (step) => <div className="min-w-40 text-slate-300">{step.owner}</div>,
            },
          ]}
        />
      )}

      {tab === "Escalations" && (
        <CyberTable
          title="Escalation Matrix"
          description="Who to notify, SLA, and channel by severity."
          data={data.escalations}
          emptyText="No escalation rules available."
          columns={[
            {
              key: "severity",
              label: "Severity",
              render: (item) => <CyberStatusBadge value={item.severity} />,
            },
            {
              key: "notify",
              label: "Notify",
              render: (item) => <div className="min-w-56 text-slate-300">{item.notify}</div>,
            },
            {
              key: "sla",
              label: "SLA",
              render: (item) => <div className="font-black text-white">{item.sla}</div>,
            },
            {
              key: "channel",
              label: "Channel",
              render: (item) => <div className="text-slate-300">{item.channel}</div>,
            },
          ]}
        />
      )}

      {tab === "Reports" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <h2 className="font-black text-white">Incident Signal Export</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Download response signals for incident review, client reporting, or internal response planning.
          </p>
          <button type="button" onClick={exportSignals} className="btn-primary mt-4">
            Download CSV
          </button>
        </section>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Incident Playbook Settings
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Local settings for response readiness until dedicated settings endpoints are connected.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Require Owner For Critical Signals",
              "Escalate High Severity Within SLA",
              "Review Playbooks Quarterly",
            ].map((item) => (
              <div
                key={item}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-center sm:text-left">
                  <div className="font-semibold text-white">{item}</div>
                  <div className="text-sm text-slate-500">
                    Stored locally until dedicated settings endpoints are connected.
                  </div>
                </div>
                <button type="button" onClick={() => saveSetting(item)} className="btn-primary">
                  Save
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
