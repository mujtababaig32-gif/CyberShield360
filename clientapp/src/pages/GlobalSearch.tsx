import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalSearchApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  route: string;
  icon?: string;
  score?: number | null;
};

type SearchResponse = {
  query: string;
  totalResults: number;
  results: SearchResult[];
  suggestions?: string[];
  partial?: boolean;
  warning?: string | null;
};

const MODULE_RESULTS: SearchResult[] = [
  { id: "dashboard", title: "Dashboard", subtitle: "Security overview and KPI scorecards", category: "Page", route: "/", icon: "📊", score: 100 },
  { id: "executive-scorecard", title: "Executive Scorecard", subtitle: "Board-ready posture summary", category: "Page", route: "/executive-scorecard", icon: "📈", score: 100 },
  { id: "assets", title: "Assets & Scans", subtitle: "Run full posture scans and download reports", category: "Page", route: "/assets", icon: "🌐", score: 100 },
  { id: "scheduled-scans", title: "Scheduled Scans", subtitle: "Recurring posture assessments", category: "Page", route: "/scheduled-scans", icon: "⏰", score: 100 },
  { id: "vulnerabilities", title: "Vulnerabilities", subtitle: "Technical findings and remediation", category: "Page", route: "/vulnerabilities", icon: "🛡️", score: 100 },
  { id: "compliance", title: "Compliance Center", subtitle: "Compliance posture and audit readiness", category: "Page", route: "/compliance", icon: "📋", score: 100 },
  { id: "risks", title: "Risk Register", subtitle: "Business risk tracking", category: "Page", route: "/risks", icon: "⚠️", score: 100 },
  { id: "vendor-risk", title: "Vendor Risk", subtitle: "Third-party domain assessment", category: "Page", route: "/vendor-risk", icon: "🏢", score: 100 },
  { id: "report-builder", title: "Report Builder", subtitle: "Executive PDF and Excel reports", category: "Page", route: "/report-builder", icon: "📑", score: 100 },
  { id: "fix-plan", title: "Fix Plan", subtitle: "Prioritized remediation plan", category: "Page", route: "/fix-plan", icon: "🛠️", score: 100 },
  { id: "ai-copilot", title: "AI Copilot", subtitle: "Security advisor", category: "Page", route: "/ai-copilot", icon: "🤖", score: 100 },
  { id: "ai-remediation", title: "AI Remediation", subtitle: "Finding-based remediation guidance", category: "Page", route: "/ai-remediation", icon: "🛠️", score: 100 },
  { id: "threat-intelligence", title: "Threat Intelligence", subtitle: "Domain and reputation intelligence", category: "Page", route: "/threat-intelligence", icon: "🎯", score: 100 },
  { id: "soc", title: "SOC Center", subtitle: "Security operations queue", category: "Page", route: "/soc", icon: "🚨", score: 100 },
  { id: "dark-web", title: "Dark Web", subtitle: "Breach and exposure monitoring", category: "Page", route: "/dark-web", icon: "🕶️", score: 100 },
  { id: "audit-logs", title: "Audit Logs", subtitle: "System activity evidence", category: "Page", route: "/audit-logs", icon: "🧾", score: 100 },
  { id: "user-management", title: "User Management", subtitle: "Users, roles and invitations", category: "Page", route: "/user-management", icon: "👥", score: 100 },
  { id: "settings", title: "Settings", subtitle: "Branding and system settings", category: "Page", route: "/settings", icon: "⚙️", score: 100 },
];

function categoryPriority(category: string) {
  const value = category.toLowerCase();

  if (value.includes("risk")) return "Risk";
  if (value.includes("vulner")) return "Vulnerability";
  if (value.includes("asset")) return "Asset";
  if (value.includes("vendor")) return "Vendor";
  if (value.includes("user")) return "User";
  if (value.includes("audit")) return "Audit";
  if (value.includes("page")) return "Module";

  return category;
}

function localModuleSearch(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return MODULE_RESULTS.filter((item) =>
    [item.title, item.subtitle, item.category, item.route]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(q))
  );
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestQueryRef = useRef("");

  const suggestions = useMemo(
    () =>
      data?.suggestions ?? [
        "assets",
        "full posture",
        "critical risks",
        "vendor risk",
        "reports",
        "compliance",
        "audit logs",
        "settings",
      ],
    [data]
  );

  const runSearch = async (q = query) => {
    const trimmed = q.trim();
    latestQueryRef.current = trimmed;

    if (!trimmed) {
      setData(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await GlobalSearchApi.search(trimmed);
      if (latestQueryRef.current !== trimmed) return;
      setData(result);
    } catch {
      if (latestQueryRef.current !== trimmed) return;

      const fallback = localModuleSearch(trimmed);

      setData({
        query: trimmed,
        totalResults: fallback.length,
        results: fallback,
        suggestions,
        partial: true,
        warning: "Live search is temporarily unavailable. Showing matching platform modules only.",
      });

      setError("Live search could not reach the backend. Module search is still available.");
    } finally {
      if (latestQueryRef.current === trimmed) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        void runSearch(query);
      } else {
        setData(null);
        setError(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const openResult = (route: string) => navigate(route || "/");

  const categories = useMemo(() => {
    const rows = data?.results ?? [];
    const grouped = rows.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([category, count]) => ({ category, count }));
  }, [data]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Global Search</h1>
        <p className="section-subtitle">
          Search assets, vendors, risks, findings, users, and platform modules from one place.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            autoFocus
            className="input text-base"
            placeholder="Search assets, risks, reports, vendors..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void runSearch();
            }}
          />
          <button type="button" onClick={() => runSearch()} className="btn-primary">
            Search
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setQuery(item);
                void runSearch(item);
              }}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-brand-500/40 hover:text-brand-300"
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-semibold text-orange-200">
          {error}
        </div>
      )}

      {data?.warning && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-semibold text-brand-200">
          {data.warning}
        </div>
      )}

      {data && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CyberStatCard label="Results" value={data.totalResults} hint={`For “${data.query}”`} tone="brand" />
          <CyberStatCard label="Categories" value={categories.length} hint="Matched areas" tone="green" />
          <CyberStatCard label="Top Category" value={categories[0]?.category ?? "-"} hint="Most relevant" tone="orange" />
          <CyberStatCard label="Mode" value={data.partial ? "Fallback" : "Live"} hint="Search status" tone="brand" />
        </section>
      )}

      {loading && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400 shadow-2xl shadow-black/10">
          Searching workspace...
        </div>
      )}

      {!loading && query.trim() && data && (
        <CyberTable
          title="Search Results"
          description={`${data.totalResults} results for “${data.query}”.`}
          data={data.results}
          emptyText="No matching results. Try assets, full posture, reports, risks, vendors, users, audit logs, or settings."
          columns={[
            {
              key: "result",
              label: "Result",
              render: (result) => (
                <button
                  type="button"
                  onClick={() => openResult(result.route)}
                  className="mx-auto block min-w-80 text-center"
                >
                  <div className="font-semibold leading-6 text-white">
                    {result.icon ? `${result.icon} ` : ""}
                    {result.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{result.subtitle}</div>
                </button>
              ),
            },
            {
              key: "category",
              label: "Category",
              render: (result) => <CyberStatusBadge value={categoryPriority(result.category)} />,
            },
            {
              key: "score",
              label: "Score",
              render: (result) => <div className="font-black text-white">{result.score ?? "-"}</div>,
            },
            {
              key: "route",
              label: "Action",
              render: (result) => (
                <button
                  type="button"
                  onClick={() => openResult(result.route)}
                  className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs font-black text-brand-300 transition hover:bg-brand-500/20"
                >
                  Open
                </button>
              ),
            },
          ]}
        />
      )}

      {!query.trim() && (
        <div className="empty-state">
          <div className="text-5xl">⌘ / Ctrl</div>
          <div className="mt-3 text-xl font-black">Search your security workspace</div>
          <p className="section-subtitle mt-1">Start typing to find modules, assets, vendors, users, and tenant records.</p>
        </div>
      )}
    </div>
  );
}
