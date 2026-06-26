import { useEffect, useState, type FormEvent } from "react";
import { SettingsApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type Branding = {
  name?: string;
  brandName?: string;
  logoUrl?: string;
  primaryColorHex?: string;
  customReportFooter?: string;
  whiteLabelEnabled?: boolean;
};

type SettingsSummary = {
  generatedUtc: string;
  branding: Branding;
  readiness: { item: string; status: string; priority: string }[];
  recommendations: string[];
};

const TABS = ["Branding", "Readiness", "Deployment", "Security"];

const DEPLOYMENT_ITEMS = [
  "Move OpenAI, SMTP, JWT, database, Lemon Squeezy secrets to environment variables",
  "Restrict CORS to production frontend domain",
  "Disable demo seed credentials",
  "Use production SQL backups",
  "Verify SMTP sender domain",
  "Configure HTTPS / reverse proxy",
  "Set production logging retention",
  "Test report generation after deployment",
];

function priorityLabel(priority: string) {
  const value = priority.toLowerCase();

  if (value.includes("high") || value.includes("critical")) return "High Priority";
  if (value.includes("medium")) return "Medium Priority";
  if (value.includes("low")) return "Low Priority";

  return priority || "Review";
}

export default function Settings() {
  const [summary, setSummary] = useState<SettingsSummary | null>(null);
  const [tab, setTab] = useState("Branding");
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColorHex, setPrimaryColorHex] = useState("#10B5A6");
  const [customReportFooter, setCustomReportFooter] = useState("");
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const applyBranding = (settings: Branding) => {
    setBrandName(settings.brandName ?? "");
    setLogoUrl(settings.logoUrl ?? "");
    setPrimaryColorHex(settings.primaryColorHex ?? "#10B5A6");
    setCustomReportFooter(settings.customReportFooter ?? "");
    setWhiteLabelEnabled(settings.whiteLabelEnabled ?? true);
  };

  const load = async (showMessage = false) => {
    try {
      setLoading(true);
      setError(null);

      if (showMessage) setMsg("Refreshing settings...");

      const result = await SettingsApi.summary();
      setSummary(result);
      applyBranding(result.branding ?? {});

      if (showMessage) setMsg("Settings refreshed successfully.");
    } catch {
      try {
        const branding = await SettingsApi.getBranding();
        applyBranding(branding);

        if (showMessage) setMsg("Branding settings refreshed successfully.");
      } catch {
        setError("Failed to load settings.");
        setMsg(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      setMsg("Saving branding settings...");
      setError(null);

      await SettingsApi.updateBranding({
        brandName,
        logoUrl,
        primaryColorHex,
        customReportFooter,
        whiteLabelEnabled,
      });

      setMsg("Branding settings saved. New reports will use the updated brand settings.");
      await load();
    } catch {
      setError("Failed to save branding settings. Make sure your account has TenantAdmin role.");
    } finally {
      setSaving(false);
    }
  };

  const readyCount = summary?.readiness.filter((item) =>
    item.status.toLowerCase().includes("ready") ||
    item.status.toLowerCase().includes("enabled") ||
    item.status.toLowerCase().includes("active")
  ).length ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Settings</h1>
          <p className="section-subtitle">
            Branding, deployment readiness, white-label reports, and production safeguards.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || saving}
          className="btn-ghost"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Branding" value={whiteLabelEnabled ? "Enabled" : "Disabled"} hint="White-label reports" tone={whiteLabelEnabled ? "green" : "orange"} />
        <CyberStatCard label="Readiness" value={`${readyCount}/${summary?.readiness.length ?? 0}`} hint="Ready items" tone="brand" />
        <CyberStatCard label="Primary Color" value={primaryColorHex} hint="Report theme" tone="brand" />
        <CyberStatCard label="Recommendations" value={summary?.recommendations.length ?? 0} hint="Security safeguards" tone="orange" />
      </section>

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {msg && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-300">
          {msg}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      {tab === "Branding" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={save} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <h2 className="text-lg font-black tracking-tight text-white">White-Label Branding</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              These values affect customer-facing reports and workspace branding.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-200">Brand Name</label>
                <input
                  className="input mt-1"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder="CyberShield360 By Mujtaba"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-200">Logo URL</label>
                <input
                  className="input mt-1"
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-bold text-slate-200">Primary Color</label>
                  <input
                    className="input mt-1"
                    value={primaryColorHex}
                    onChange={(event) => setPrimaryColorHex(event.target.value)}
                    placeholder="#10B5A6"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-200">Report Footer</label>
                  <input
                    className="input mt-1"
                    value={customReportFooter}
                    onChange={(event) => setCustomReportFooter(event.target.value)}
                    placeholder="Confidential Security Report"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <input
                  type="checkbox"
                  checked={whiteLabelEnabled}
                  onChange={(event) => setWhiteLabelEnabled(event.target.checked)}
                />

                <span>
                  <span className="block font-bold text-white">Enable white-label branding</span>
                  <span className="text-sm text-slate-500">
                    Use custom name, color, and footer in reports.
                  </span>
                </span>
              </label>

              <button disabled={saving} className="btn-primary">
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
            <h2 className="text-lg font-black tracking-tight text-white">Live Preview</h2>

            <div className="mt-5 rounded-3xl border p-5" style={{ borderColor: primaryColorHex }}>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                  style={{ backgroundColor: primaryColorHex }}
                >
                  CS
                </div>

                <div>
                  <div className="text-xl font-black text-white">
                    {brandName || "CyberShield360 By Mujtaba"}
                  </div>
                  <div className="text-sm text-slate-500">
                    Executive Security Assessment Report
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-sm text-slate-500">Footer</div>
                <div className="font-medium text-slate-300">
                  {customReportFooter || "Confidential Security Report - CyberShield360"}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "Readiness" && (
        <CyberTable
          title="Readiness Register"
          description="Settings and workspace readiness items before production launch."
          data={summary?.readiness ?? []}
          emptyText="No readiness data available."
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
              render: (item) => <CyberStatusBadge value={priorityLabel(item.priority)} />,
            },
          ]}
        />
      )}

      {tab === "Deployment" && (
        <CyberTable
          title="Deployment Checklist"
          description="Production safeguards to complete before buying a domain or onboarding clients."
          data={DEPLOYMENT_ITEMS.map((item) => ({ item, status: "Required" }))}
          emptyText="No deployment items available."
          columns={[
            {
              key: "item",
              label: "Checklist Item",
              render: (item) => (
                <div className="mx-auto min-w-96 text-center text-sm font-semibold leading-6 text-white">
                  {item.item}
                </div>
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

      {tab === "Security" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <h2 className="text-lg font-black tracking-tight text-white">Security Safeguards</h2>

          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(
              summary?.recommendations ?? [
                "Move secrets to environment variables before deployment.",
                "Enable MFA for administrators.",
                "Keep audit logging enabled.",
              ]
            ).map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
              >
                <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                  Safeguard #{index + 1}
                </div>
                <div className="mt-2 text-sm font-medium leading-6 text-slate-300">{item}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
