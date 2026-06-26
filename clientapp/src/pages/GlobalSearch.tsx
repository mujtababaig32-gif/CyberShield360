import { useEffect, useMemo, useState } from "react";
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
  score?: number;
};

type SearchResponse = {
  query: string;
  totalResults: number;
  results: SearchResult[];
  suggestions?: string[];
};

function categoryPriority(category: string) {
  const value = category.toLowerCase();

  if (value.includes("risk")) return "Risk";
  if (value.includes("vulner")) return "Vulnerability";
  if (value.includes("asset")) return "Asset";
  if (value.includes("user")) return "User";
  if (value.includes("audit")) return "Audit";

  return category;
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(
    () =>
      data?.suggestions ?? [
        "critical risks",
        "assets",
        "vulnerabilities",
        "audit logs",
        "users",
        "settings",
      ],
    [data]
  );

  const runSearch = async (q = query) => {
    if (!q.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const result = await GlobalSearchApi.search(q);
      setData(result);
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        void runSearch(query);
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
          Search assets, risks, vulnerabilities, users, and platform modules from one place.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            autoFocus
            className="input text-base"
            placeholder="Search CyberShield360..."
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
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      {data && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CyberStatCard label="Results" value={data.totalResults} hint={`For “${data.query}”`} tone="brand" />
          <CyberStatCard label="Categories" value={categories.length} hint="Matched areas" tone="green" />
          <CyberStatCard label="Top Category" value={categories[0]?.category ?? "-"} hint="Most relevant" tone="orange" />
          <CyberStatCard label="Suggestions" value={suggestions.length} hint="Quick searches" tone="brand" />
        </section>
      )}

      {loading && <div className="card text-sm text-slate-500">Searching...</div>}

      {!loading && query.trim() && data && (
        <CyberTable
          title="Search Results"
          description={`${data.totalResults} results for “${data.query}”.`}
          data={data.results}
          emptyText="No matching results. Try searching for assets, risks, users, audit logs, or vulnerabilities."
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
              label: "Route",
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
          <div className="text-5xl">⌘</div>
          <div className="mt-3 text-xl font-black">Search your security workspace</div>
          <p className="section-subtitle mt-1">Start typing to find modules and tenant records.</p>
        </div>
      )}
    </div>
  );
}
