import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalSearchApi } from "../api/endpoints";

type SearchResult = { id: string; title: string; subtitle: string; category: string; route: string; icon?: string; score?: number };
type SearchResponse = { query: string; totalResults: number; results: SearchResult[]; suggestions?: string[] };

function badgeColor(category: string) {
  const v = category.toLowerCase();
  if (v.includes("risk")) return "bg-orange-500";
  if (v.includes("vulner")) return "bg-red-600";
  if (v.includes("asset")) return "bg-brand-600";
  if (v.includes("user")) return "bg-purple-600";
  return "bg-gray-600";
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => data?.suggestions ?? ["critical risks", "assets", "vulnerabilities", "audit logs", "users", "settings"], [data]);

  const runSearch = async (q = query) => {
    try {
      setLoading(true);
      setError(null);
      setData(await GlobalSearchApi.search(q));
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) runSearch(query);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const openResult = (route: string) => navigate(route || "/");

  return <div className="space-y-6">
    <header><h1 className="text-2xl font-black tracking-tight">Global Search</h1><p className="section-subtitle">Search assets, risks, vulnerabilities, users, and platform modules from one place.</p></header>
    <div className="glass-panel p-5"><div className="flex flex-col gap-3 md:flex-row"><input autoFocus className="input text-base" placeholder="Search CyberShield360..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }} /><button onClick={() => runSearch()} className="btn-primary">Search</button></div><div className="mt-4 flex flex-wrap gap-2">{suggestions.map((s) => <button key={s} onClick={() => { setQuery(s); runSearch(s); }} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-brand-500 hover:text-brand-600 dark:border-slate-800 dark:text-slate-300">{s}</button>)}</div></div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900 dark:bg-red-950">{error}</div>}
    {loading && <div className="card text-sm text-slate-500">Searching...</div>}
    {!loading && query.trim() && data && <div className="card"><div className="mb-4 flex items-center justify-between"><div><h2 className="section-title">Search Results</h2><p className="section-subtitle">{data.totalResults} results for “{data.query}”</p></div></div><div className="space-y-3">{data.results.map((r) => <button key={`${r.category}-${r.id}`} onClick={() => openResult(r.route)} className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-brand-500 hover:bg-brand-500/5 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl dark:bg-slate-950/80">{r.icon ?? "🔎"}</div><div className="min-w-0"><div className="font-black">{r.title}</div><div className="truncate text-sm text-slate-500">{r.subtitle}</div><div className="mt-2 text-xs text-slate-500">Open: {r.route}</div></div></div><span className={`badge ${badgeColor(r.category)}`}>{r.category}</span></div></button>)}{data.results.length === 0 && <div className="empty-state"><div className="text-4xl">🔍</div><div className="mt-2 font-black">No matching results</div><p className="section-subtitle">Try searching for assets, risks, users, audit logs, or vulnerabilities.</p></div>}</div></div>}
    {!query.trim() && <div className="empty-state"><div className="text-5xl">⌘</div><div className="mt-3 text-xl font-black">Search your security workspace</div><p className="section-subtitle mt-1">Start typing to find modules and tenant records.</p></div>}
  </div>;
}
