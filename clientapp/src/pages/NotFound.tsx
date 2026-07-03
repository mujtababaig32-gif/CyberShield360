import { Link, useLocation } from "react-router-dom";

const QUICK_LINKS = [
  { label: "Dashboard", route: "/" },
  { label: "Assets & Scans", route: "/assets" },
  { label: "Global Search", route: "/search" },
  { label: "Report Builder", route: "/report-builder" },
];

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-brand-500/30 bg-brand-500/10 text-4xl shadow-2xl shadow-brand-500/10">
            🛡️
          </div>

          <div className="mb-3 inline-flex rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-300">
            Page Not Found
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            This CyberShield360 page does not exist
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            The link may be outdated, the route may have changed, or the page may not be available in this workspace.
            Use the shortcuts below or return to the dashboard.
          </p>

          <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-xs leading-6 text-slate-400">
            Requested path: <span className="font-mono font-bold text-slate-200">{location.pathname}</span>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">
              Back to Dashboard
            </Link>
            <Link to="/search" className="btn-ghost">
              Open Global Search
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.route}
            to={item.route}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-center text-sm font-black text-white transition hover:border-brand-500/40 hover:bg-brand-500/10"
          >
            {item.label}
          </Link>
        ))}
      </section>
    </div>
  );
}
