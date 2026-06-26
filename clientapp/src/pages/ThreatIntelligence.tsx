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
import { ThreatIntelligenceApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type Indicator = {
  domain: string;
  indicator: string;
  type: string;
  severity: string;
  evidence: string;
  recommendation: string;
};

type DomainRisk = {
  domain: string;
  score: number;
  risk: number;
  riskLevel: string;
  lastSeenUtc?: string;
};

type ThreatIntel = {
  generatedUtc: string;
  threatScore: number;
  threatLevel: string;
  monitoredAssets: number;
  exposedPorts: number;
  emailThreats: number;
  webThreats: number;
  dnsThreats: number;
  indicators: Indicator[];
  domainRisk: DomainRisk[];
  actions: string[];
};

const TYPES = [
  "All",
  "Exposed Service",
  "Email Spoofing Risk",
  "Web Header Weakness",
  "Web Exposure",
  "DNS Hygiene",
  "TLS Risk",
  "Security Signal",
];

function levelTone(level: string): "green" | "orange" | "red" | "slate" {
  if (level === "Critical" || level === "High") return "red";
  if (level === "Medium") return "orange";
  if (level === "Low") return "green";
  return "slate";
}

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
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

export default function ThreatIntelligence() {
  const [data, setData] = useState<ThreatIntel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ThreatIntelligenceApi.summary();
      setData(result);
    } catch {
      setError("Failed to load threat intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const indicators = useMemo(() => {
    if (!data) return [];

    const q = search.trim().toLowerCase();

    return data.indicators.filter(
      (indicator) =>
        (type === "All" || indicator.type === type) &&
        (!q ||
          `${indicator.domain} ${indicator.indicator} ${indicator.type} ${indicator.evidence} ${indicator.recommendation}`
            .toLowerCase()
            .includes(q))
    );
  }, [data, search, type]);

  const categoryData = useMemo(() => {
    if (!data) return [];

    return [
      { category: "Web", count: data.webThreats },
      { category: "DNS", count: data.dnsThreats },
      { category: "Email", count: data.emailThreats },
      { category: "Ports", count: data.exposedPorts },
    ];
  }, [data]);

  const exportIndicators = () => {
    const rows = [
      ["Domain", "Indicator", "Type", "Severity", "Evidence", "Recommendation"],
      ...indicators.map((indicator) => [
        indicator.domain,
        indicator.indicator,
        indicator.type,
        indicator.severity,
        indicator.evidence,
        indicator.recommendation,
      ]),
    ];

    downloadTextFile(
      "cybershield360-threat-indicators.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );
  };

  if (loading && !data) {
    return <div className="card text-sm text-slate-500">Loading threat intelligence...</div>;
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
            Threat Intelligence
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Threat Intelligence Center
          </h1>
          <p className="section-subtitle mt-1">
            Threat signals derived from exposed services, email posture, DNS hygiene, TLS, and web security findings.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={exportIndicators} className="btn-primary">
            Export Indicators
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard
          label="Threat Score"
          value={`${data.threatScore}/100`}
          hint={data.threatLevel}
          tone={levelTone(data.threatLevel)}
        />
        <CyberStatCard label="Threat Level" value={data.threatLevel} hint="Current posture" tone={levelTone(data.threatLevel)} />
        <CyberStatCard label="Monitored Assets" value={data.monitoredAssets} hint="Assets in scope" tone="brand" />
        <CyberStatCard label="Exposed Ports" value={data.exposedPorts} hint="External exposure" tone="orange" />
        <CyberStatCard label="Email Threats" value={data.emailThreats} hint="Spoofing/auth signals" tone="red" />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CyberChartCard
            title="Threat Categories"
            description="Current threat signals by category."
            insight={
              data.emailThreats > 0 || data.exposedPorts > 0
                ? "Email and exposed-service findings should be prioritized first."
                : "No priority threat category is currently elevated."
            }
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#94a3b8" }} />
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
              Executive Actions
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Priority actions for threat exposure reduction.
            </p>
          </div>

          <div className="space-y-3">
            {data.actions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                No priority threat actions available.
              </div>
            ) : (
              data.actions.map((action, index) => (
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
      </section>

      <section className="card grid grid-cols-1 gap-3 md:grid-cols-[1fr_260px]">
        <input
          className="input"
          placeholder="Search indicators..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
          {TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </section>

      <CyberTable
        title="Threat Indicators"
        description="Evidence-backed threat indicators with business-friendly recommended action."
        data={indicators}
        emptyText="No indicators in this view."
        columns={[
          {
            key: "domain",
            label: "Domain",
            render: (indicator) => (
              <div className="mx-auto min-w-64 break-all text-center font-semibold text-white">
                {indicator.domain}
              </div>
            ),
          },
          {
            key: "indicator",
            label: "Indicator",
            render: (indicator) => (
              <div className="mx-auto min-w-72 text-center">
                <div className="font-semibold text-white">{indicator.indicator}</div>
                <div className="mt-1 text-xs text-slate-500">{indicator.type}</div>
              </div>
            ),
          },
          {
            key: "severity",
            label: "Severity",
            render: (indicator) => <CyberStatusBadge value={indicator.severity} />,
          },
          {
            key: "evidence",
            label: "Evidence",
            render: (indicator) => (
              <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">
                {indicator.evidence}
              </div>
            ),
          },
          {
            key: "recommendation",
            label: "Recommended Action",
            render: (indicator) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                {indicator.recommendation}
              </div>
            ),
          },
        ]}
      />

      <CyberTable
        title="Domain Threat Ranking"
        description="Threat risk by monitored domain."
        data={data.domainRisk}
        emptyText="No domain risk records available."
        columns={[
          {
            key: "domain",
            label: "Domain",
            render: (domain) => (
              <div className="mx-auto min-w-64 break-all text-center font-semibold text-white">
                {domain.domain}
              </div>
            ),
          },
          {
            key: "score",
            label: "Security Score",
            render: (domain) => <div className="font-black text-white">{domain.score}/100</div>,
          },
          {
            key: "risk",
            label: "Threat Risk",
            render: (domain) => <div className="font-black text-white">{domain.risk}/100</div>,
          },
          {
            key: "level",
            label: "Risk Level",
            render: (domain) => <CyberStatusBadge value={domain.riskLevel} />,
          },
          {
            key: "last",
            label: "Last Seen",
            render: (domain) => (
              <div className="whitespace-nowrap text-slate-400">{dateText(domain.lastSeenUtc)}</div>
            ),
          },
        ]}
      />

      <div className="text-xs text-slate-400">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
      </div>
    </div>
  );
}
