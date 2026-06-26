import { useEffect, useState } from "react";
import { SettingsApi } from "../api/endpoints";

import ModuleTabs from "../components/ModuleTabs";
type Branding = { name?: string; brandName?: string; logoUrl?: string; primaryColorHex?: string; customReportFooter?: string; whiteLabelEnabled?: boolean };
type SettingsSummary = { generatedUtc: string; branding: Branding; readiness: { item: string; status: string; priority: string }[]; recommendations: string[] };

const TABS = ["Branding", "Readiness", "Deployment", "Security"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("ready") || v.includes("active") || v.includes("enabled") || v.includes("validated")) return "bg-green-600";
  if (v.includes("high") || v.includes("needs") || v.includes("not")) return "bg-orange-500";
  return "bg-brand-600";
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

  const applyBranding = (s: Branding) => {
    setBrandName(s.brandName ?? "");
    setLogoUrl(s.logoUrl ?? "");
    setPrimaryColorHex(s.primaryColorHex ?? "#10B5A6");
    setCustomReportFooter(s.customReportFooter ?? "");
    setWhiteLabelEnabled(s.whiteLabelEnabled ?? true);
  };

  const load = async () => {
    try {
      setError(null);
      const result = await SettingsApi.summary();
      setSummary(result);
      applyBranding(result.branding ?? {});
    } catch {
      try {
        const branding = await SettingsApi.getBranding();
        applyBranding(branding);
      } catch {
        setError("Failed to load settings.");
      }
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMsg("Saving branding settings...");
      setError(null);
      await SettingsApi.updateBranding({ brandName, logoUrl, primaryColorHex, customReportFooter, whiteLabelEnabled });
      setMsg("Branding settings saved. New reports will use the updated brand settings.");
      await load();
    } catch {
      setError("Failed to save branding settings. Make sure your account has TenantAdmin role.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-2xl font-black tracking-tight">Settings</h1><p className="section-subtitle">Branding, deployment readiness, white-label reports, and production safeguards.</p></div><button onClick={load} className="btn-ghost">Refresh</button></header>
    <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />
    {msg && <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-600 dark:text-brand-300">{msg}</div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 dark:border-red-900 dark:bg-red-950">{error}</div>}

    {tab === "Branding" && <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]"><form onSubmit={save} className="card space-y-4"><h2 className="section-title">White-Label Branding</h2><p className="section-subtitle">These values affect customer-facing reports and workspace branding.</p><div><label className="text-sm font-bold">Brand Name</label><input className="input mt-1" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="CyberShield360 By Mujtaba" /></div><div><label className="text-sm font-bold">Logo URL</label><input className="input mt-1" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" /></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div><label className="text-sm font-bold">Primary Color</label><input className="input mt-1" value={primaryColorHex} onChange={(e) => setPrimaryColorHex(e.target.value)} placeholder="#10B5A6" /></div><div><label className="text-sm font-bold">Report Footer</label><input className="input mt-1" value={customReportFooter} onChange={(e) => setCustomReportFooter(e.target.value)} placeholder="Confidential Security Report" /></div></div><label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><input type="checkbox" checked={whiteLabelEnabled} onChange={(e) => setWhiteLabelEnabled(e.target.checked)} /><span><span className="block font-bold">Enable white-label branding</span><span className="text-sm text-slate-500">Use custom name, color, and footer in reports.</span></span></label><button disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save Settings"}</button></form><div className="card"><h2 className="section-title mb-4">Live Preview</h2><div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-800" style={{ borderColor: primaryColorHex }}><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: primaryColorHex }}>CS</div><div><div className="text-xl font-black">{brandName || "CyberShield360 By Mujtaba"}</div><div className="text-sm text-slate-500">Executive Security Assessment Report</div></div></div><div className="mt-6 rounded-2xl bg-slate-100 p-4 dark:bg-slate-950/60"><div className="text-sm text-slate-500">Footer</div><div className="font-medium">{customReportFooter || "Confidential Security Report - CyberShield360"}</div></div></div></div></div>}

    {tab === "Readiness" && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{(summary?.readiness ?? []).map((r) => <div key={r.item} className="card card-hover"><div className="flex items-start justify-between gap-3"><div><div className="font-black">{r.item}</div><div className="mt-1 text-sm text-slate-500">Priority: {r.priority}</div></div><span className={`badge ${badgeColor(r.status + r.priority)}`}>{r.status}</span></div></div>)}</div>}

    {tab === "Deployment" && <div className="card"><h2 className="section-title mb-4">Deployment Checklist</h2><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{["Move OpenAI, SMTP, JWT, database, Lemon Squeezy secrets to environment variables", "Restrict CORS to production frontend domain", "Disable demo seed credentials", "Use production SQL backups", "Verify SMTP sender domain", "Configure HTTPS / reverse proxy", "Set production logging retention", "Test report generation after deployment"].map((x) => <label key={x} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><input type="checkbox" className="mt-1" /><span className="font-medium">{x}</span></label>)}</div></div>}

    {tab === "Security" && <div className="card"><h2 className="section-title mb-4">Security Safeguards</h2><div className="space-y-3">{(summary?.recommendations ?? ["Move secrets to environment variables before deployment.", "Enable MFA for administrators.", "Keep audit logging enabled."]).map((r) => <div key={r} className="rounded-2xl border border-slate-200 p-4 font-medium dark:border-slate-800">{r}</div>)}</div></div>}
  </div>;
}
