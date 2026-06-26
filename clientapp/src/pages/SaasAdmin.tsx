import { useEffect, useMemo, useState } from "react";
import { SaasAdminApi } from "../api/endpoints";

import ModuleTabs from "../components/ModuleTabs";
type SaasUser = {
  id: string;
  fullName?: string;
  email?: string;
  isActive?: boolean;
  emailConfirmed?: boolean;
  lastLoginUtc?: string | null;
  role?: string;
  loginMethod?: string;
  mfaStatus?: string;
};

type SaasSummary = {
  generatedUtc: string;
  tenant: any;
  limits: any;
  totals: any;
  loginMethods: { provider: string; status: string; priority: string }[];
  saasReadiness: { item: string; status: string; priority: string }[];
  users: SaasUser[];
  recommendations: string[];
};

const TABS = ["Overview", "Tenant", "Usage", "Users", "Readiness", "Launch Checklist"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("active") || v.includes("enabled") || v.includes("ready") || v.includes("validated")) return "bg-green-600";
  if (v.includes("critical") || v.includes("high")) return "bg-red-600";
  if (v.includes("pending") || v.includes("needs") || v.includes("incomplete") || v.includes("not configured")) return "bg-orange-500";
  if (v.includes("trial") || v.includes("free")) return "bg-brand-600";
  return "bg-gray-600";
}

function safeNumber(value: any) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function UsageBar({ label, value }: { label: string; value: number }) {
  const safe = Math.min(Math.max(safeNumber(value), 0), 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">{safe}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

function EmptyError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card border-red-500/30 bg-red-500/10">
      <div className="text-lg font-black text-red-300">SaaS Admin could not load</div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-red-100/80">
        The page is working, but the SaaS admin API returned an error. This usually happens when a database table or migration is behind the current code.
      </p>
      <button onClick={onRetry} className="btn-primary mt-4">Try Again</button>
    </div>
  );
}

export default function SaasAdmin() {
  const [data, setData] = useState<SaasSummary | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");

  const load = async () => {
    try {
      setLoading(true);
      setError(false);
      const result = await SaasAdminApi.summary();
      setData(result);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const launchItems = useMemo(() => [
    "Move secrets to environment variables",
    "Configure verified SMTP sender",
    "Connect billing provider",
    "Enable MFA for admins",
    "Review production CORS origins",
    "Disable demo seed credentials",
    "Run full posture scan for primary domain",
    "Export audit evidence before launch",
  ], []);

  if (loading) return <div className="card text-sm text-slate-500">Loading SaaS admin...</div>;
  if (error || !data) return <EmptyError onRetry={load} />;

  const totals = data.totals ?? {};
  const limits = data.limits ?? {};
  const tenant = data.tenant ?? {};

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">CyberShield360</div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">SaaS Admin</h1>
          <p className="section-subtitle">Tenant usage, launch readiness, identity providers, limits, and platform administration.</p>
        </div>
        <button onClick={load} className="btn-ghost">Refresh</button>
      </header>

      <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />

      {tab === "Overview" && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="metric-card"><div className="section-subtitle">Users</div><div className="mt-2 text-3xl font-black">{safeNumber(totals.users)}</div></div>
            <div className="metric-card"><div className="section-subtitle">Assets</div><div className="mt-2 text-3xl font-black text-brand-500">{safeNumber(totals.assets)}</div></div>
            <div className="metric-card"><div className="section-subtitle">Scans This Month</div><div className="mt-2 text-3xl font-black text-purple-500">{safeNumber(totals.scansThisMonth)}</div></div>
            <div className="metric-card"><div className="section-subtitle">Scheduled Scans</div><div className="mt-2 text-3xl font-black text-green-600">{safeNumber(totals.scheduledScans)}</div></div>
            <div className="metric-card"><div className="section-subtitle">Notifications</div><div className="mt-2 text-3xl font-black text-orange-500">{safeNumber(totals.notifications)}</div></div>
            <div className="metric-card"><div className="section-subtitle">Audit Events</div><div className="mt-2 text-3xl font-black text-blue-500">{safeNumber(totals.auditEvents)}</div></div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="card">
              <h2 className="section-title mb-4">Launch Recommendations</h2>
              <div className="space-y-3">
                {(data.recommendations ?? []).map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 p-4 font-medium dark:border-slate-800">{item}</div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="section-title mb-4">Tenant Snapshot</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3"><span>Name</span><b className="text-right">{tenant.name ?? "Unknown Tenant"}</b></div>
                <div className="flex justify-between gap-3"><span>Status</span><span className={`badge ${badgeColor(tenant.status ?? "Unknown")}`}>{tenant.status ?? "Unknown"}</span></div>
                <div className="flex justify-between gap-3"><span>Plan</span><span className={`badge ${badgeColor(tenant.plan ?? "Free")}`}>{tenant.plan ?? "Free"}</span></div>
                <div className="flex justify-between gap-3"><span>Billing</span><span>{tenant.billingStatus ?? "Not Configured"}</span></div>
                <div className="flex justify-between gap-3"><span>White Label</span><span>{tenant.whiteLabelEnabled ? "Enabled" : "Disabled"}</span></div>
              </div>
            </div>
          </section>
        </>
      )}

      {tab === "Tenant" && (
        <div className="card">
          <h2 className="section-title mb-4">Tenant Details</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ["Tenant ID", tenant.id ?? "Not available"],
              ["Slug", tenant.slug ?? "Not set"],
              ["Primary Domain", tenant.primaryDomain ?? "Not set"],
              ["Current Period End", tenant.currentPeriodEndUtc ? new Date(tenant.currentPeriodEndUtc).toLocaleString() : "Not configured"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-950/60">
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-1 break-all font-bold">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Usage" && (
        <div className="card">
          <h2 className="section-title mb-4">Plan Usage</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <UsageBar label={`Assets (${safeNumber(totals.assets)}/${safeNumber(limits.maxAssets)})`} value={safeNumber(limits.assetUsagePercent)} />
            <UsageBar label={`Users (${safeNumber(totals.users)}/${safeNumber(limits.maxUsers)})`} value={safeNumber(limits.userUsagePercent)} />
            <UsageBar label={`Scans (${safeNumber(totals.scansThisMonth)}/${safeNumber(limits.maxScansPerMonth)})`} value={safeNumber(limits.scanUsagePercent)} />
          </div>
        </div>
      )}

      {tab === "Users" && (
        <div className="card">
          <h2 className="section-title mb-4">Tenant Users</h2>
          {(data.users ?? []).length === 0 ? (
            <div className="empty-state">No tenant users found.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {data.users.map((u) => (
                <div key={u.id || u.email} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="break-all font-black">{u.fullName || u.email}</div>
                      <div className="break-all text-xs text-slate-500">{u.email}</div>
                    </div>
                    <span className={`badge ${badgeColor(u.isActive ? "Active" : "Inactive")}`}>{u.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><div className="section-subtitle">Role</div><b>{u.role ?? "User"}</b></div>
                    <div><div className="section-subtitle">MFA</div><b>{u.mfaStatus ?? "Not Connected"}</b></div>
                    <div className="col-span-2"><div className="section-subtitle">Last Login</div><b>{u.lastLoginUtc ? new Date(u.lastLoginUtc).toLocaleString() : "No login"}</b></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Readiness" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(data.saasReadiness ?? []).map((item) => (
            <div key={item.item} className="card card-hover">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black">{item.item}</div>
                  <div className="mt-1 text-sm text-slate-500">Priority: {item.priority}</div>
                </div>
                <span className={`badge ${badgeColor(`${item.status} ${item.priority}`)}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Launch Checklist" && (
        <div className="card">
          <h2 className="section-title mb-4">Production Launch Checklist</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {launchItems.map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <input type="checkbox" className="h-4 w-4 accent-brand-500" />
                <span className="font-medium">{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
