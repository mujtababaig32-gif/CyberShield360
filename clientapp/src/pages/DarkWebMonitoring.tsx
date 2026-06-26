import { useEffect, useMemo, useState } from "react";
import { DarkWebApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type Exposure = {
  domain: string;
  exposureType: string;
  leakedCredentialSignals: number;
  breachMentions: number;
  exposureScore: number;
  riskLevel: string;
  status: string;
  lastSeenUtc: string;
  recommendation: string;
};

type CredentialLeak = {
  domain: string;
  emailPattern: string;
  leakType: string;
  severity: string;
  source: string;
  lastSeenUtc: string;
  action: string;
};

type Integration = {
  name: string;
  status: string;
};

type DarkWebSummary = {
  generatedUtc: string;
  monitoredDomains: number;
  totalExposures: number;
  highRiskExposures: number;
  mediumRiskExposures: number;
  lowRiskExposures: number;
  leakedCredentialSignals: number;
  breachMentions: number;
  darkWebRiskScore: number;
  connectorMode?: string;
  evidenceQuality?: string;
  exposures: Exposure[];
  credentialLeaks: CredentialLeak[];
  executiveActions: string[];
  integrations: Integration[];
};

const TABS = ["Overview", "Exposure Signals", "Credential Leaks", "Actions", "Integrations"];
const LEVELS = ["All", "High", "Medium", "Low"];

function scoreTone(score: number): "green" | "orange" | "red" {
  if (score >= 70) return "red";
  if (score >= 40) return "orange";
  return "green";
}

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function exposurePriority(exposure: Exposure) {
  if (exposure.riskLevel === "High") return "Investigate";
  if (exposure.riskLevel === "Medium") return "Review";
  return "Monitoring";
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

export default function DarkWebMonitoring() {
  const [data, setData] = useState<DarkWebSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await DarkWebApi.summary();
      setData(result);
    } catch {
      setError("Failed to load dark web monitoring.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const exposures = useMemo(() => {
    if (!data) return [];

    const q = search.trim().toLowerCase();

    return data.exposures.filter(
      (exposure) =>
        (level === "All" || exposure.riskLevel === level) &&
        (!q ||
          `${exposure.domain} ${exposure.exposureType} ${exposure.status} ${exposure.recommendation}`
            .toLowerCase()
            .includes(q))
    );
  }, [data, search, level]);

  const exportExposures = () => {
    const rows = [
      ["Domain", "Type", "Risk", "Status", "Credential Signals", "Breach Mentions", "Recommendation"],
      ...exposures.map((exposure) => [
        exposure.domain,
        exposure.exposureType,
        exposure.riskLevel,
        exposure.status,
        exposure.leakedCredentialSignals,
        exposure.breachMentions,
        exposure.recommendation,
      ]),
    ];

    downloadTextFile(
      "cybershield360-dark-web-monitoring.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );
  };

  if (loading && !data) {
    return <div className="card text-sm text-slate-500">Loading dark web monitoring...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-500">
            Exposure Intelligence
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Dark Web Monitoring
          </h1>
          <p className="section-subtitle mt-1">
            Credential leak and breach monitoring with honest connector status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={exportExposures} className="btn-primary">
            Export Signals
          </button>
        </div>
      </header>

      <section className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5 shadow-2xl shadow-black/10">
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-wide text-orange-300">
            Connector Status
          </div>
          <div className="mt-2 text-lg font-black text-white">
            {data.connectorMode ?? "Dark-web provider not configured"}
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {data.evidenceQuality ??
              "This module currently shows domain exposure signals only. Configure a breach-intelligence provider for verified leaked credential results."}
          </p>
        </div>
      </section>

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CyberStatCard label="Monitored Domains" value={data.monitoredDomains} hint="Domains in scope" tone="brand" />
            <CyberStatCard label="Risk Score" value={`${data.darkWebRiskScore}/100`} hint="Exposure risk" tone={scoreTone(data.darkWebRiskScore)} />
            <CyberStatCard label="High Risk" value={data.highRiskExposures} hint="Needs review" tone={data.highRiskExposures > 0 ? "red" : "green"} />
            <CyberStatCard label="Credential Signals" value={data.leakedCredentialSignals} hint="Potential leak signals" tone="orange" />
            <CyberStatCard label="Breach Mentions" value={data.breachMentions} hint="Mentions found" tone="brand" />
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <div className="mb-5 text-center">
              <h2 className="text-lg font-black tracking-tight text-white">
                Executive Actions
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Recommended follow-up actions for exposure monitoring.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {data.executiveActions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-500">
                  No verified dark-web actions are available yet. Configure an intelligence provider to enable breach evidence.
                </div>
              ) : (
                data.executiveActions.map((action, index) => (
                  <div
                    key={`${action}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                  >
                    <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                      Action #{index + 1}
                    </div>
                    <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                      {action}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "Exposure Signals" && (
        <div className="space-y-6">
          <section className="card grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            <input
              className="input"
              placeholder="Search domains..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="input" value={level} onChange={(event) => setLevel(event.target.value)}>
              {LEVELS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </section>

          <CyberTable
            title="Exposure Signals"
            description="Domain-level exposure signals, credential indicators, breach mentions, and recommended response."
            data={exposures}
            emptyText="No exposure signals match this view."
            columns={[
              {
                key: "domain",
                label: "Domain",
                render: (exposure) => (
                  <div className="mx-auto min-w-64 break-all text-center font-semibold text-white">
                    {exposure.domain}
                  </div>
                ),
              },
              {
                key: "type",
                label: "Type",
                render: (exposure) => (
                  <div className="min-w-48 text-slate-300">{exposure.exposureType}</div>
                ),
              },
              {
                key: "risk",
                label: "Risk",
                render: (exposure) => <CyberStatusBadge value={exposure.riskLevel} />,
              },
              {
                key: "signals",
                label: "Signals",
                render: (exposure) => (
                  <div className="text-sm text-slate-300">
                    Credentials: {exposure.leakedCredentialSignals}
                    <br />
                    Breaches: {exposure.breachMentions}
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (exposure) => <CyberStatusBadge value={exposure.status} />,
              },
              {
                key: "recommendation",
                label: "Recommended Action",
                render: (exposure) => (
                  <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                    {exposure.recommendation}
                  </div>
                ),
              },
              {
                key: "priority",
                label: "Priority",
                render: (exposure) => <CyberStatusBadge value={exposurePriority(exposure)} />,
              },
            ]}
          />
        </div>
      )}

      {tab === "Credential Leaks" && (
        <CyberTable
          title="Credential Leak Evidence"
          description="Verified credential leak records will appear here when a breach intelligence provider is connected."
          data={data.credentialLeaks}
          emptyText="No verified credential leak evidence."
          columns={[
            {
              key: "domain",
              label: "Domain",
              render: (leak) => (
                <div className="mx-auto min-w-64 break-all text-center font-semibold text-white">
                  {leak.domain}
                </div>
              ),
            },
            {
              key: "email",
              label: "Email Pattern",
              render: (leak) => (
                <div className="mx-auto min-w-64 break-all text-center text-slate-300">
                  {leak.emailPattern}
                </div>
              ),
            },
            {
              key: "type",
              label: "Leak Type",
              render: (leak) => <div className="text-slate-300">{leak.leakType}</div>,
            },
            {
              key: "severity",
              label: "Severity",
              render: (leak) => <CyberStatusBadge value={leak.severity} />,
            },
            {
              key: "source",
              label: "Source",
              render: (leak) => <div className="text-slate-300">{leak.source}</div>,
            },
            {
              key: "action",
              label: "Recommended Action",
              render: (leak) => (
                <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                  {leak.action}
                </div>
              ),
            },
            {
              key: "last",
              label: "Last Seen",
              render: (leak) => <div className="whitespace-nowrap text-slate-400">{dateText(leak.lastSeenUtc)}</div>,
            },
          ]}
        />
      )}

      {tab === "Actions" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Response Actions
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Client-friendly actions for exposure monitoring and credential protection.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.executiveActions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-500">
                No actions available.
              </div>
            ) : (
              data.executiveActions.map((action, index) => (
                <div
                  key={`${action}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                >
                  <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                    Action #{index + 1}
                  </div>
                  <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                    {action}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {tab === "Integrations" && (
        <CyberTable
          title="Provider Integrations"
          description="Credential and breach intelligence provider readiness."
          data={data.integrations}
          emptyText="No integrations configured."
          columns={[
            {
              key: "provider",
              label: "Provider",
              render: (integration) => (
                <div className="font-semibold text-white">{integration.name}</div>
              ),
            },
            {
              key: "purpose",
              label: "Purpose",
              render: () => (
                <div className="text-slate-400">Credential / breach intelligence provider</div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (integration) => <CyberStatusBadge value={integration.status} />,
            },
          ]}
        />
      )}

      <div className="text-xs text-slate-400">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
      </div>
    </div>
  );
}
