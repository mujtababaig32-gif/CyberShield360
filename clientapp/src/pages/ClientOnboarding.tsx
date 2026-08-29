import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommercialJourney from "../components/CommercialJourney";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import {
  PACKAGE_NAMES,
  type PackageName,
  loadCommercialWorkflow,
  normalizeDomainInput,
  saveCommercialWorkflow,
} from "../lib/commercialWorkflow";

const INDUSTRIES = [
  "E-commerce",
  "Healthcare",
  "Education",
  "Finance",
  "Real Estate",
  "Professional Services",
  "Technology / SaaS",
  "Other",
];

function cleanCell(value: string) {
  return value.replace(/,/g, " ").replace(/\n/g, " ");
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadCommercialWorkflow(), []);

  const [clientName, setClientName] = useState(initial.clientName);
  const [contactName, setContactName] = useState(initial.contactName);
  const [website, setWebsite] = useState(initial.website);
  const [industry, setIndustry] = useState(initial.industry);
  const [selectedPackage, setSelectedPackage] = useState<PackageName>(initial.packageName);
  const [timeline, setTimeline] = useState(initial.timeline);
  const [assetCount, setAssetCount] = useState(String(initial.assetCount));
  const [scanScope, setScanScope] = useState(initial.scanScope);
  const [authorizedBy, setAuthorizedBy] = useState(initial.authorizedBy);
  const [authorizationDate, setAuthorizationDate] = useState(initial.authorizationDate);
  const [ownsOrAuthorized, setOwnsOrAuthorized] = useState(initial.authorizationConfirmed);
  const [scopeRestricted, setScopeRestricted] = useState(initial.authorizationConfirmed);
  const [nonDestructiveConsent, setNonDestructiveConsent] = useState(initial.authorizationConfirmed);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedWebsite = normalizeDomainInput(website);
  const authorizationConfirmed = ownsOrAuthorized && scopeRestricted && nonDestructiveConsent;
  const safeAssetCount = Math.max(1, Number(assetCount) || 1);

  const checklist = useMemo(
    () => [
      { item: "Business name captured", owner: "Client Success", complete: Boolean(clientName.trim()), priority: "Required" },
      { item: "Primary client contact captured", owner: "Client Success", complete: Boolean(contactName.trim()), priority: "Required" },
      { item: "Approved website/domain captured", owner: "Security Analyst", complete: Boolean(normalizedWebsite), priority: "Required" },
      { item: "Service package selected", owner: "Deal Desk", complete: Boolean(selectedPackage), priority: "Required" },
      { item: "Delivery timeline agreed", owner: "Project Owner", complete: Boolean(timeline.trim()), priority: "Required" },
      { item: "Commercial quotation approved", owner: "Client", complete: initial.commercialApproved, priority: "Recommended" },
      { item: "Assessment scope documented", owner: "Security Analyst", complete: Boolean(scanScope.trim()), priority: "Required" },
      { item: "Authorized representative recorded", owner: "Client", complete: Boolean(authorizedBy.trim() && authorizationDate), priority: "Required" },
      { item: "Scan authorization confirmed", owner: "Client", complete: authorizationConfirmed, priority: "Required" },
    ],
    [clientName, contactName, normalizedWebsite, selectedPackage, timeline, initial.commercialApproved, scanScope, authorizedBy, authorizationDate, authorizationConfirmed]
  );

  const completedCount = checklist.filter((item) => item.complete).length;
  const requiredItems = checklist.filter((item) => item.priority === "Required");
  const requiredComplete = requiredItems.every((item) => item.complete);
  const progress = Math.round((completedCount / checklist.length) * 100);

  const persist = () => saveCommercialWorkflow({
    clientName: clientName.trim() || "Prospective Client",
    contactName: contactName.trim(),
    website: normalizedWebsite,
    industry,
    packageName: selectedPackage,
    assetCount: safeAssetCount,
    timeline: timeline.trim(),
    scanScope: scanScope.trim(),
    authorizationConfirmed,
    authorizedBy: authorizedBy.trim(),
    authorizationDate,
  });

  const saveDraft = () => {
    persist();
    setError(null);
    setMsg("Onboarding draft saved in this browser.");
  };

  const continueToAssets = () => {
    setMsg(null);
    if (!requiredComplete) {
      setError("Complete the required onboarding and scan authorization items before continuing to assessment.");
      return;
    }

    persist();
    setError(null);
    navigate(`/assets?domain=${encodeURIComponent(normalizedWebsite)}`);
  };

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 - Client Onboarding Summary"],
      [],
      ["Client", clientName],
      ["Contact Person", contactName],
      ["Website / Domain", normalizedWebsite],
      ["Industry", industry],
      ["Selected Package", selectedPackage],
      ["Assets / Websites", safeAssetCount],
      ["Timeline", timeline],
      ["Commercial Approval", initial.commercialApproved ? "Approved" : "Pending"],
      ["Authorization Confirmed", authorizationConfirmed ? "Yes" : "No"],
      ["Authorized By", authorizedBy],
      ["Authorization Date", authorizationDate],
      ["Assessment Scope", scanScope],
      [],
      ["Checklist"],
      ["Item", "Owner", "Priority", "Status"],
      ...checklist.map((item) => [item.item, item.owner, item.priority, item.complete ? "Ready" : "Pending"]),
    ];

    const htmlRows = rows
      .map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #d9e2ec;padding:10px;text-align:center;vertical-align:middle">${cleanCell(String(cell))}</td>`).join("")}</tr>`)
      .join("");

    downloadTextFile(
      `cybershield360-client-onboarding-${clientName.replace(/\s+/g, "-").toLowerCase()}.xls`,
      `<html><head><meta charset="UTF-8" /></head><body><table>${htmlRows}</table></body></html>`,
      "application/vnd.ms-excel;charset=utf-8"
    );
    setMsg("Excel onboarding summary downloaded.");
  };

  const exportPdf = () => {
    setMsg("Print dialog opened. Choose Save as PDF.");
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #onboarding-print-area, #onboarding-print-area * { visibility: visible; }
          #onboarding-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; background: white !important; color: #0f172a !important; padding: 28px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <CommercialJourney current="onboarding" />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">Client Success Hub</div>
            <h1 className="text-3xl font-black tracking-tight text-white">Client Onboarding & Scan Authorization</h1>
            <p className="mt-3 text-sm leading-7 text-slate-400">Capture the client, scope, package, timeline, and explicit authorization before any assessment target moves into Assets & Scans.</p>
          </div>
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 xl:max-w-md">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={exportPdf} className="btn-primary justify-center">Download PDF</button><button onClick={exportExcel} className="btn-ghost justify-center">Download Excel</button></div>
            <button onClick={continueToAssets} disabled={!requiredComplete} className="btn-primary mt-2 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">Authorize & Continue to Assessment →</button>
          </div>
        </div>
      </section>

      {msg && <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-semibold text-brand-300">{msg}</div>}
      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-300">{error}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Progress" value={`${progress}%`} hint={`${completedCount}/${checklist.length} checklist items`} tone={progress === 100 ? "green" : "brand"} />
        <CyberStatCard label="Commercial" value={initial.commercialApproved ? "Approved" : "Pending"} hint="Quotation status" tone={initial.commercialApproved ? "green" : "orange"} />
        <CyberStatCard label="Authorization" value={authorizationConfirmed ? "Confirmed" : "Required"} hint="Before assessment" tone={authorizationConfirmed ? "green" : "orange"} />
        <CyberStatCard label="Next Step" value="Assessment" hint="Add approved asset" tone="brand" />
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-black text-white">Onboarding Progress</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Required items must be completed before the assessment target is handed to Assets & Scans.</p>
          </div>
          <CyberStatusBadge value={requiredComplete ? "Ready" : "In Progress"} />
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} /></div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">1. Client Intake</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Record the business and the primary assessment target.</p>
          <div className="mt-5 space-y-4">
            <div><label htmlFor="onboarding-client-name" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Client / Business Name</label><input id="onboarding-client-name" className="input mt-2" value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
            <div><label htmlFor="onboarding-contact-name" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Contact Person</label><input id="onboarding-contact-name" className="input mt-2" value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
            <div><label htmlFor="onboarding-website" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Website / Domain</label><input id="onboarding-website" className="input mt-2" value={website} onChange={(e) => setWebsite(e.target.value)} onBlur={() => setWebsite(normalizeDomainInput(website))} placeholder="example.com" /><div className="mt-2 text-xs leading-5 text-slate-500">Only enter a domain the client owns or is explicitly authorized to assess.</div></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label htmlFor="onboarding-industry" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Industry</label><select id="onboarding-industry" className="input mt-2" value={industry} onChange={(e) => setIndustry(e.target.value)}>{INDUSTRIES.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label htmlFor="onboarding-asset-count" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Assets / Websites</label><input id="onboarding-asset-count" className="input mt-2" value={assetCount} onChange={(e) => setAssetCount(e.target.value)} inputMode="numeric" /></div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">2. Engagement Setup</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Confirm package, delivery timing, and the approved assessment boundary.</p>
          <div className="mt-5 space-y-4">
            <div><label htmlFor="onboarding-package" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Selected Package</label><select id="onboarding-package" className="input mt-2" value={selectedPackage} onChange={(e) => setSelectedPackage(e.target.value as PackageName)}>{PACKAGE_NAMES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div><label htmlFor="onboarding-timeline" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Delivery Timeline</label><input id="onboarding-timeline" className="input mt-2" value={timeline} onChange={(e) => setTimeline(e.target.value)} /></div>
            <div><label htmlFor="onboarding-scan-scope" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Approved Assessment Scope</label><textarea id="onboarding-scan-scope" className="input mt-2 min-h-32 resize-y" value={scanScope} onChange={(e) => setScanScope(e.target.value)} /></div>
            <div className={`rounded-2xl border p-4 text-sm ${initial.commercialApproved ? "border-green-500/20 bg-green-500/5 text-green-200" : "border-orange-500/20 bg-orange-500/5 text-orange-200"}`}>
              Commercial quotation: <span className="font-black">{initial.commercialApproved ? "Approved" : "Pending / Draft"}</span>. The assessment can be prepared here, but commercial approval should be completed before paid delivery work begins.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-orange-500/20 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">3. Scan Authorization</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">This gate is required before handing the domain to the assessment workflow. It documents authorization and keeps the demo language honest and safe.</p>
          </div>
          <CyberStatusBadge value={authorizationConfirmed ? "Confirmed" : "Required"} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><input type="checkbox" checked={ownsOrAuthorized} onChange={(e) => setOwnsOrAuthorized(e.target.checked)} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-black text-white">Authority to assess the target</span><span className="mt-1 block text-xs leading-5 text-slate-500">The client owns the target or has explicit authorization from the asset owner.</span></span></label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><input type="checkbox" checked={scopeRestricted} onChange={(e) => setScopeRestricted(e.target.checked)} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-black text-white">Scope limited to approved assets</span><span className="mt-1 block text-xs leading-5 text-slate-500">Scanning will be limited to the documented domain(s) and approved public-facing scope.</span></span></label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><input type="checkbox" checked={nonDestructiveConsent} onChange={(e) => setNonDestructiveConsent(e.target.checked)} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-black text-white">Non-destructive external assessment consent</span><span className="mt-1 block text-xs leading-5 text-slate-500">The client understands the default assessment checks external posture and does not claim to be a full penetration test.</span></span></label>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div><label htmlFor="onboarding-authorized-by" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Authorized By</label><input id="onboarding-authorized-by" className="input mt-2" value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} placeholder="Client representative name" /></div>
            <div className="mt-4"><label htmlFor="onboarding-authorization-date" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Authorization Date</label><input id="onboarding-authorization-date" type="date" className="input mt-2" value={authorizationDate} onChange={(e) => setAuthorizationDate(e.target.value)} /></div>
            <div className="mt-5 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-center text-xs leading-5 text-slate-300">Authorization status is saved as part of the browser-based commercial workflow draft in this batch. It is not a legal contract or a substitute for your signed client agreement.</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-white">4. Launch Readiness Checklist</h2><p className="mt-2 text-sm leading-6 text-slate-400">A live checklist driven by the current intake and authorization fields.</p></div><button onClick={saveDraft} className="btn-ghost justify-center">Save Draft</button></div>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checklist.map((item) => <div key={item.item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-white">{item.item}</div><div className="mt-1 text-xs text-slate-500">Owner: {item.owner}</div></div><CyberStatusBadge value={item.complete ? "Ready" : "Pending"} /></div><div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{item.priority}</div></div>)}
        </div>
      </section>

      <section id="onboarding-print-area" className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full">
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white"><div className="text-2xl font-black">CyberShield360 By Mujtaba</div><div className="mt-1 text-sm text-teal-300">Client Onboarding & Assessment Authorization Summary</div></div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm"><div><div className="font-bold">Client</div><div>{clientName}</div></div><div><div className="font-bold">Contact</div><div>{contactName}</div></div><div><div className="font-bold">Domain</div><div>{normalizedWebsite}</div></div><div><div className="font-bold">Industry</div><div>{industry}</div></div><div><div className="font-bold">Package</div><div>{selectedPackage}</div></div><div><div className="font-bold">Timeline</div><div>{timeline}</div></div></div>
        <div className="mt-6 rounded-xl border border-slate-200 p-4 text-sm"><div className="font-black">Assessment Scope</div><div className="mt-2 leading-6">{scanScope}</div></div>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm"><div className="border p-3"><div className="font-bold">Authorization</div><div>{authorizationConfirmed ? "Confirmed" : "Pending"}</div></div><div className="border p-3"><div className="font-bold">Authorized By</div><div>{authorizedBy || "Not recorded"}</div></div><div className="border p-3"><div className="font-bold">Date</div><div>{authorizationDate || "Not recorded"}</div></div></div>
        <table className="mt-8 w-full border-collapse text-xs"><thead><tr className="bg-teal-500 text-white"><th className="border p-2">Checklist Item</th><th className="border p-2">Owner</th><th className="border p-2">Priority</th><th className="border p-2">Status</th></tr></thead><tbody>{checklist.map((item) => <tr key={item.item}><td className="border p-2 text-center font-semibold">{item.item}</td><td className="border p-2 text-center">{item.owner}</td><td className="border p-2 text-center">{item.priority}</td><td className="border p-2 text-center">{item.complete ? "Ready" : "Pending"}</td></tr>)}</tbody></table>
        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">Confidential Onboarding Summary - CyberShield360 By Mujtaba</div>
      </section>
    </div>
  );
}
