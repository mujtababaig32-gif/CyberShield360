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
import { AttackPathApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type CrownJewel = {
  id: string;
  asset: string;
  criticality: string;
  exposureScore: number;
  attackPaths: number;
};

type AttackPathItem = {
  id: string;
  source: string;
  target: string;
  risk: string;
  pathLength: number;
  likelihood: number;
  recommendation: string;
};

type ExposureChain = {
  chain: string;
  severity: string;
  status: string;
};

type AttackPathSummary = {
  generatedUtc: string;
  assetsInScope: number;
  vulnerabilitiesInScope?: number;
  crownJewelCount: number;
  attackPathCount: number;
  criticalPaths: number;
  averageLikelihood: number;
  crownJewels: CrownJewel[];
  attackPaths: AttackPathItem[];
  exposureChains: ExposureChain[];
  recommendations: string[];
};

const TABS = [
  "Overview",
  "Crown Jewels",
  "Attack Paths",
  "Exposure Chains",
  "Reports",
  "Settings",
];

const RISK_ORDER = ["Critical", "High", "Medium", "Low", "Info"];

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

function exposureStatus(score: number) {
  if (score >= 80) return "Critical Exposure";
  if (score >= 60) return "High Exposure";
  if (score >= 40) return "Medium Exposure";
  return "Lower Exposure";
}

function riskPriority(risk: string) {
  if (risk === "Critical") return "Immediate";
  if (risk === "High") return "Priority";
  if (risk === "Medium") return "Planned";
  return "Monitor";
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-slate-950/95 px-4 py-3 text-sm shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-brand-300">
        {label}
      </div>

      <div className="space-y-1">
        {payload.map((item: any) => (
          <div
            key={`${item.dataKey}-${item.value}`}
            className="flex items-center justify-between gap-5 text-slate-300"
          >
            <span className="capitalize">{item.name || item.dataKey}</span>
            <span className="font-black text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AttackPath() {
  const [data, setData] = useState<AttackPathSummary | null>(null);
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

      const result = await AttackPathApi.summary();
      setData(result);
    } catch {
      setError("Failed to load attack path analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredPaths = useMemo(() => {
    if (!data) return [];

    const q = query.toLowerCase();

    return data.attackPaths.filter((path) => {
      const matchesQuery =
        path.source.toLowerCase().includes(q) ||
        path.target.toLowerCase().includes(q) ||
        path.recommendation.toLowerCase().includes(q) ||
        path.risk.toLowerCase().includes(q);

      const matchesRisk = riskFilter === "All" || path.risk === riskFilter;

      return matchesQuery && matchesRisk;
    });
  }, [data, query, riskFilter]);

  const riskDistribution = useMemo(() => {
    if (!data) return [];

    return RISK_ORDER.map((risk) => ({
      risk,
      count: data.attackPaths.filter((path) => path.risk === risk).length,
    })).filter((row) => row.count > 0);
  }, [data]);

  const exportPaths = () => {
    if (!data) return;

    const rows = [
      ["Source", "Target", "Risk", "Path Length", "Likelihood", "Recommended Fix"],
      ...filteredPaths.map((path) => [
        path.source,
        path.target,
        path.risk,
        path.pathLength,
        `${path.likelihood}%`,
        path.recommendation,
      ]),
    ];

    downloadTextFile(
      "cybershield360-attack-paths.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );

    setMessage("Attack path report downloaded.");
  };

  const saveSetting = (setting: string) => {
    localStorage.setItem(`cs360_attack_path_${setting}`, "enabled");
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
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400 shadow-2xl shadow-black/10">
        Loading attack path analysis...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Attack Path Analysis</h1>
          <p className="text-sm text-gray-500">
            Review how exposed assets, vulnerabilities, and crown jewels could connect into business-impacting paths.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} className="btn-ghost">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <ModuleTabs
        tabs={TABS.map((t) => ({ key: t, label: t }))}
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
            <CyberStatCard
              label="Assets in Scope"
              value={data.assetsInScope}
              hint="Assets reviewed"
              tone="brand"
            />
            <CyberStatCard
              label="Crown Jewels"
              value={data.crownJewelCount}
              hint="High-value targets"
              tone="orange"
            />
            <CyberStatCard
              label="Attack Paths"
              value={data.attackPathCount}
              hint="Potential routes"
              tone="brand"
            />
            <CyberStatCard
              label="Critical Paths"
              value={data.criticalPaths}
              hint="Priority paths"
              tone={data.criticalPaths > 0 ? "red" : "green"}
            />
            <CyberStatCard
              label="Avg Likelihood"
              value={`${data.averageLikelihood}%`}
              hint="Path probability"
              tone={data.averageLikelihood >= 70 ? "red" : "orange"}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CyberChartCard
                title="Attack Paths by Risk"
                description="Risk distribution across the current attack path analysis."
                insight={
                  data.criticalPaths > 0
                    ? `${data.criticalPaths} critical path(s) should be reviewed first.`
                    : "No critical paths were identified in the current analysis."
                }
              >
                {riskDistribution.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-sm text-slate-500">
                    No attack path risk data available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={riskDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                      <XAxis dataKey="risk" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(20, 184, 166, 0.08)" }} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#10B5A6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CyberChartCard>
            </div>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Analysis Scope
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Summary of what was included in this path review.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  ["Assets", data.assetsInScope],
                  ["Open Vulnerabilities", data.vulnerabilitiesInScope ?? 0],
                  ["Exposure Chains", data.exposureChains.length],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"
                  >
                    <span className="text-slate-400">{label}</span>
                    <span className="font-black text-white">{value}</span>
                  </div>
                ))}

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-6 text-slate-500">
                  Generated: {formatDate(data.generatedUtc)}
                </div>
              </div>
            </section>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <div className="mb-5">
              <h2 className="text-lg font-black tracking-tight text-white">
                Top Recommendations
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Highest-value actions to reduce exposure and protect key assets.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {data.recommendations.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                  No recommendations available yet.
                </div>
              ) : (
                data.recommendations.map((recommendation, index) => (
                  <div
                    key={`${recommendation}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                  >
                    <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                      Action #{index + 1}
                    </div>
                    <div className="text-sm font-medium leading-6 text-slate-300">
                      {recommendation}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "Crown Jewels" && (
        <CyberTable
          title="Crown Jewel Candidates"
          description="High-value assets that may create stronger business impact if reached through an attack path."
          data={data.crownJewels}
          emptyText="No crown jewel candidates yet. Run full posture scans to identify exposed high-value assets."
          columns={[
            {
              key: "asset",
              label: "Asset",
              render: (crownJewel) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="break-all font-semibold text-white">
                    {crownJewel.asset}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {crownJewel.attackPaths} possible path(s)
                  </div>
                </div>
              ),
            },
            {
              key: "criticality",
              label: "Criticality",
              render: (crownJewel) => (
                <CyberStatusBadge value={crownJewel.criticality} />
              ),
            },
            {
              key: "score",
              label: "Exposure Score",
              render: (crownJewel) => (
                <div className="text-center">
                  <div className="font-black text-white">
                    {crownJewel.exposureScore}/100
                  </div>
                  <div className="mx-auto mt-2 h-2 w-28 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${crownJewel.exposureScore}%` }}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "paths",
              label: "Paths",
              render: (crownJewel) => (
                <div className="font-black text-white">{crownJewel.attackPaths}</div>
              ),
            },
            {
              key: "priority",
              label: "Priority",
              render: (crownJewel) => (
                <CyberStatusBadge value={exposureStatus(crownJewel.exposureScore)} />
              ),
            },
          ]}
        />
      )}

      {tab === "Attack Paths" && (
        <div className="space-y-6">
          <section className="card grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              className="input"
              placeholder="Search source, target, recommendation..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <select
              className="input"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option>All</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <button type="button" onClick={exportPaths} className="btn-primary">
              Export CSV
            </button>
          </section>

          <CyberTable
            title="Prioritized Attack Paths"
            description="Potential paths from exposed sources to important targets, with likelihood and recommended action."
            data={filteredPaths}
            emptyText="No attack paths match the selected filters."
            columns={[
              {
                key: "source",
                label: "Source",
                render: (path) => (
                  <div className="mx-auto min-w-52 break-all text-center font-semibold text-white">
                    {path.source}
                  </div>
                ),
              },
              {
                key: "target",
                label: "Target",
                render: (path) => (
                  <div className="mx-auto min-w-52 break-all text-center font-semibold text-white">
                    {path.target}
                  </div>
                ),
              },
              {
                key: "risk",
                label: "Risk",
                render: (path) => <CyberStatusBadge value={path.risk} />,
              },
              {
                key: "length",
                label: "Path Length",
                render: (path) => (
                  <div className="font-black text-white">{path.pathLength}</div>
                ),
              },
              {
                key: "likelihood",
                label: "Likelihood",
                render: (path) => (
                  <div className="font-black text-white">{path.likelihood}%</div>
                ),
              },
              {
                key: "recommendation",
                label: "Recommended Fix",
                render: (path) => (
                  <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">
                    {path.recommendation}
                  </div>
                ),
              },
              {
                key: "priority",
                label: "Priority",
                render: (path) => <CyberStatusBadge value={riskPriority(path.risk)} />,
              },
            ]}
          />
        </div>
      )}

      {tab === "Exposure Chains" && (
        <CyberTable
          title="Exposure Chains"
          description="Chain-level exposure narratives that explain how weaknesses may connect."
          data={data.exposureChains}
          emptyText="No exposure chains generated yet."
          columns={[
            {
              key: "chain",
              label: "Chain",
              render: (chain) => (
                <div className="mx-auto min-w-96 text-center font-semibold leading-6 text-white">
                  {chain.chain}
                </div>
              ),
            },
            {
              key: "severity",
              label: "Severity",
              render: (chain) => <CyberStatusBadge value={chain.severity} />,
            },
            {
              key: "status",
              label: "Status",
              render: (chain) => <CyberStatusBadge value={chain.status} />,
            },
          ]}
        />
      )}

      {tab === "Reports" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5">
            <h2 className="text-lg font-black tracking-tight text-white">
              Attack Path Reports
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Export path data or jump into focused reviews for high-value assets and exposure chains.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                title: "Attack Path Export",
                text: "Download filtered attack path data.",
                action: "Download CSV",
                onClick: exportPaths,
              },
              {
                title: "Crown Jewel Review",
                text: "Review highest exposure assets.",
                action: "Open Review",
                onClick: () => setTab("Crown Jewels"),
              },
              {
                title: "Exposure Chains",
                text: "Review chain-level exposure narratives.",
                action: "View Chains",
                onClick: () => setTab("Exposure Chains"),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
              >
                <div className="font-black text-white">{item.title}</div>
                <div className="mt-2 min-h-10 text-sm leading-6 text-slate-400">
                  {item.text}
                </div>
                <button type="button" onClick={item.onClick} className="btn-primary mt-4">
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5">
            <h2 className="text-lg font-black tracking-tight text-white">
              Attack Path Settings
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Local settings for how path reviews should prioritize evidence.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Prioritize Internet-Facing Assets",
              "Include Risk Register Signals",
              "Require Full Posture Scan Evidence",
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
