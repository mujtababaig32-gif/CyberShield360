import { useEffect, useMemo, useState } from "react";
import { SaasAdminApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
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

function safeNumber(value: any) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No login";
}

function UsageBar({ label, value }: { label: string; value: number }) {
  const safe = Math.min(Math.max(safeNumber(value), 0), 100);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-white">{label}</span>
        <span className="text-slate-500">{safe}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
          style={{ width: `${safe}%` }}
        />
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
      <button type="button" onClick={onRetry} className="btn-primary mt-4">
        Try Again
      </button>
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

  useEffect(() => {
    void load();
  }, []);

  const launchItems = useMemo(
    () => [
      "Move secrets to environment variables",
      "Configure verified SMTP sender",
      "Connect billing provider",
      "Enable MFA for admins",
      "Review production CORS origins",
      "Disable demo seed credentials",
      "Run full posture scan for primary domain",
      "Export audit evidence before launch",
    ],
    []
  );

  if (loading) return <div className="card text-sm text-slate-500">Loading SaaS admin...</div>;
  if (error || !data) return <EmptyError onRetry={load} />;

  const totals = data.totals ?? {};
  const limits = data.limits ?? {};
  const tenant = data.tenant ?? {};

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            CyberShield360
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            SaaS Admin
          </h1>
          <p className="section-subtitle">
            Tenant usage, launch readiness, identity providers, limits, and platform administration.
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

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <CyberStatCard label="Users" value={safeNumber(totals.users)} hint="Tenant users" tone="brand" />
            <CyberStatCard label="Assets" value={safeNumber(totals.assets)} hint="Assets in scope" tone="brand" />
            <CyberStatCard label="Scans This Month" value={safeNumber(totals.scansThisMonth)} hint="Monthly usage" tone="orange" />
            <CyberStatCard label="Scheduled Scans" value={safeNumber(totals.scheduledScans)} hint="Recurring scans" tone="green" />
            <CyberStatCard label="Notifications" value={safeNumber(totals.notifications)} hint="Alert delivery" tone="orange" />
            <CyberStatCard label="Audit Events" value={safeNumber(totals.auditEvents)} hint="Evidence records" tone="brand" />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <h2 className="text-lg font-black tracking-tight text-white">Launch Recommendations</h2>

              <div className="mt-5 space-y-3">
                {(data.recommendations ?? []).length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No launch recommendations available.
                  </div>
                ) : (
                  data.recommendations.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                        Recommendation #{index + 1}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-slate-300">{item}</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <h2 className="text-lg font-black tracking-tight text-white">Tenant Snapshot</h2>

              <div className="mt-5 space-y-3 text-sm">
                {[
                  ["Name", tenant.name ?? "Unknown Tenant"],
                  ["Billing", tenant.billingStatus ?? "Not Configured"],
                  ["White Label", tenant.whiteLabelEnabled ? "Enabled" : "Disabled"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <span className="text-slate-500">{label}</span>
                    <span className="break-all text-right font-semibold text-slate-200">{value}</span>
                  </div>
                ))}

                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <CyberStatusBadge value={tenant.status ?? "Unknown"} />
                  <CyberStatusBadge value={tenant.plan ?? "Free"} />
                </div>
              </div>
            </section>
          </section>
        </div>
      )}

      {tab === "Tenant" && (
        <CyberTable
          title="Tenant Details"
          description="Current tenant identity, plan, domain, and billing period information."
          data={[
            ["Tenant ID", tenant.id ?? "Not available"],
            ["Slug", tenant.slug ?? "Not set"],
            ["Primary Domain", tenant.primaryDomain ?? "Not set"],
            ["Current Period End", tenant.currentPeriodEndUtc ? new Date(tenant.currentPeriodEndUtc).toLocaleString() : "Not configured"],
          ].map(([label, value]) => ({ label, value }))}
          emptyText="No tenant details available."
          columns={[
            {
              key: "label",
              label: "Field",
              render: (row) => <div className="font-semibold text-white">{row.label}</div>,
            },
            {
              key: "value",
              label: "Value",
              render: (row) => (
                <div className="mx-auto min-w-80 break-all text-center text-sm leading-6 text-slate-400">{row.value}</div>
              ),
            },
          ]}
        />
      )}

      {tab === "Usage" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <h2 className="text-lg font-black tracking-tight text-white">Plan Usage</h2>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <UsageBar label={`Assets (${safeNumber(totals.assets)}/${safeNumber(limits.maxAssets)})`} value={safeNumber(limits.assetUsagePercent)} />
            <UsageBar label={`Users (${safeNumber(totals.users)}/${safeNumber(limits.maxUsers)})`} value={safeNumber(limits.userUsagePercent)} />
            <UsageBar label={`Scans (${safeNumber(totals.scansThisMonth)}/${safeNumber(limits.maxScansPerMonth)})`} value={safeNumber(limits.scanUsagePercent)} />
          </div>
        </section>
      )}

      {tab === "Users" && (
        <CyberTable
          title="Tenant Users"
          description="Tenant user status, role, MFA, login method, and last-login evidence."
          data={data.users ?? []}
          emptyText="No tenant users found."
          columns={[
            {
              key: "user",
              label: "User",
              render: (user) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{user.fullName || user.email || "Unknown User"}</div>
                  <div className="mt-1 break-all text-xs text-slate-500">{user.email}</div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (user) => <CyberStatusBadge value={user.isActive ? "Active" : "Inactive"} />,
            },
            {
              key: "role",
              label: "Role",
              render: (user) => <CyberStatusBadge value={user.role ?? "User"} />,
            },
            {
              key: "login",
              label: "Login Method",
              render: (user) => <div className="text-slate-300">{user.loginMethod ?? "-"}</div>,
            },
            {
              key: "mfa",
              label: "MFA",
              render: (user) => <CyberStatusBadge value={user.mfaStatus ?? "Not Connected"} />,
            },
            {
              key: "last",
              label: "Last Login",
              render: (user) => <div className="whitespace-nowrap text-slate-400">{dateText(user.lastLoginUtc)}</div>,
            },
          ]}
        />
      )}

      {tab === "Readiness" && (
        <CyberTable
          title="SaaS Readiness"
          description="Launch readiness items, status, and priority."
          data={data.saasReadiness ?? []}
          emptyText="No readiness items found."
          columns={[
            {
              key: "item",
              label: "Item",
              render: (item) => (
                <div className="mx-auto min-w-80 text-center font-semibold text-white">{item.item}</div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (item) => <CyberStatusBadge value={item.status} />,
            },
            {
              key: "priority",
              label: "Priority",
              render: (item) => <CyberStatusBadge value={item.priority} />,
            },
          ]}
        />
      )}

      {tab === "Launch Checklist" && (
        <CyberTable
          title="Production Launch Checklist"
          description="Final launch controls before public domain and client onboarding."
          data={launchItems.map((item) => ({ item, status: "Required" }))}
          emptyText="No launch checklist items."
          columns={[
            {
              key: "item",
              label: "Checklist Item",
              render: (item) => (
                <div className="mx-auto min-w-96 text-center text-sm font-semibold leading-6 text-white">{item.item}</div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (item) => <CyberStatusBadge value={item.status} />,
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
