import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommercialJourney from "../components/CommercialJourney";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import {
  loadCommercialWorkflow,
  saveCommercialWorkflow,
} from "../lib/commercialWorkflow";

const SERVICE_FLOW = [
  {
    step: "01",
    title: "Identify",
    text: "Assess the approved public domain, SSL/TLS, DNS, security headers, email security controls, and visible exposure.",
    outcome: "Security gaps identified",
  },
  {
    step: "02",
    title: "Explain",
    text: "Translate technical findings into business impact, priority, owner, and practical next actions.",
    outcome: "Decision-makers understand risk",
  },
  {
    step: "03",
    title: "Remediate",
    text: "Prepare a prioritized fix plan and support only the remediation work that the client approves.",
    outcome: "Approved issues are addressed",
  },
  {
    step: "04",
    title: "Verify & Handover",
    text: "Rescan, compare posture, deliver management and technical reports, and explain the remaining risks.",
    outcome: "Client receives evidence and next steps",
  },
];

const DELIVERABLES = [
  "External security posture assessment of approved assets",
  "Executive PDF report with business impact and priorities",
  "Technical Excel report with findings and remediation guidance",
  "Prioritized fix plan with suggested owner and effort",
  "Before/after comparison after approved remediation and rescan",
];

const LIMITS = [
  "Only client-approved domains and public-facing assets are assessed.",
  "The default assessment is non-destructive and does not claim to be a full penetration test.",
  "Provider-dependent capabilities are shown as not connected until the required integration is configured.",
];

function safeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(value || 0);
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

export default function ServiceOverview() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadCommercialWorkflow(), []);

  const [clientName, setClientName] = useState(initial.clientName);
  const [serviceName, setServiceName] = useState("CyberShield360 Security Assessment & Remediation");
  const [assetCount, setAssetCount] = useState(String(initial.assetCount));
  const [estimatedFee, setEstimatedFee] = useState(String(initial.assessmentFee + initial.fixingFee + initial.trainingFee));
  const [msg, setMsg] = useState<string | null>(null);

  const totals = useMemo(
    () => ({
      assets: Math.max(1, safeNumber(assetCount)),
      fee: safeNumber(estimatedFee),
    }),
    [assetCount, estimatedFee]
  );

  const persist = () => {
    saveCommercialWorkflow({
      clientName: clientName.trim() || "Prospective Client",
      assetCount: totals.assets,
      projectName: serviceName.trim() || "CyberShield360 Security Assessment & Remediation",
    });
  };

  const continueToPackages = () => {
    persist();
    navigate("/client-packages");
  };

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 - Service Overview"],
      [],
      ["Client", clientName],
      ["Service", serviceName],
      ["Assets / Websites", totals.assets],
      ["Estimated Fee PKR", totals.fee],
      [],
      ["Step", "Stage", "Description", "Outcome"],
      ...SERVICE_FLOW.map((item) => [item.step, item.title, item.text, item.outcome]),
      [],
      ["Core Deliverables"],
      ...DELIVERABLES.map((item) => [item]),
      [],
      ["Assessment Boundaries"],
      ...LIMITS.map((item) => [item]),
    ];

    const html = `<html><head><meta charset="UTF-8" /></head><body><table>${rows
      .map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #d9e2ec;padding:10px;text-align:center">${String(cell)}</td>`).join("")}</tr>`)
      .join("")}</table></body></html>`;

    downloadTextFile(
      `cybershield360-service-overview-${clientName.replace(/\s+/g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
    setMsg("Excel service overview downloaded.");
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
          #service-print-area, #service-print-area * { visibility: visible; }
          #service-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; background: white !important; color: #0f172a !important; padding: 28px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <CommercialJourney current="service" />

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Client Success Hub
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">CyberShield360 Service Overview</h1>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              A service-backed cybersecurity assessment and remediation workflow for businesses. Start with approved public assets, explain the risk in business language, remediate approved issues, verify improvements, and hand over evidence.
            </p>
          </div>

          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 xl:max-w-md">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button onClick={exportPdf} className="btn-primary justify-center">Download PDF</button>
              <button onClick={exportExcel} className="btn-ghost justify-center">Download Excel</button>
            </div>
            <button onClick={continueToPackages} className="btn-primary mt-2 w-full justify-center">
              Continue to Packages →
            </button>
          </div>
        </div>
      </section>

      {msg && <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-semibold text-brand-300">{msg}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Service Model" value="One-Time" hint="Assessment-led engagement" tone="brand" />
        <CyberStatCard label="Assessment Type" value="External" hint="Approved public assets" tone="green" />
        <CyberStatCard label="Estimate" value={`PKR ${money(totals.fee)}`} hint="Editable commercial draft" tone="orange" />
        <CyberStatCard label="Deliverables" value={DELIVERABLES.length} hint="Management + technical" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Service Proposal Details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">These values carry into the commercial workflow draft.</p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Client Name</label>
              <input className="input mt-2" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client company name" />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Service Name</label>
              <input className="input mt-2" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Assets / Websites</label>
                <input className="input mt-2" value={assetCount} onChange={(e) => setAssetCount(e.target.value)} inputMode="numeric" />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Estimated Fee</label>
                <input className="input mt-2" value={estimatedFee} onChange={(e) => setEstimatedFee(e.target.value)} inputMode="numeric" />
              </div>
            </div>
            <button onClick={() => { persist(); setMsg("Commercial draft saved in this browser."); }} className="btn-ghost w-full justify-center">
              Save Draft
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Honest Client Positioning</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                CyberShield360 should promise what the platform can prove: an authorized external posture assessment, prioritized findings, remediation guidance, rescan verification, and client-ready reporting. Unconnected provider modules stay clearly labelled until configured.
              </p>
            </div>
            <CyberStatusBadge value="Demo Ready" />
          </div>
          <div className="mt-5 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-center text-sm font-semibold leading-6 text-slate-200">
            Identify → Explain → Remediate → Verify → Report
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SERVICE_FLOW.map((item) => (
          <div key={item.step} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-xl shadow-black/10">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-sm font-black text-brand-300">{item.step}</div>
            <h2 className="text-base font-black text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-semibold leading-5 text-slate-400">{item.outcome}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Core Deliverables</h2>
          <div className="mt-5 space-y-3">
            {DELIVERABLES.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold leading-6 text-slate-300">{item}</div>)}
          </div>
        </div>

        <div className="rounded-3xl border border-orange-500/20 bg-orange-500/5 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Assessment Boundaries</h2>
          <div className="mt-5 space-y-3">
            {LIMITS.map((item) => <div key={item} className="rounded-2xl border border-orange-500/15 bg-slate-950/30 px-4 py-3 text-sm leading-6 text-slate-300">{item}</div>)}
          </div>
        </div>
      </section>

      <section id="service-print-area" className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full">
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white">
          <div className="text-2xl font-black">CyberShield360 By Mujtaba</div>
          <div className="mt-1 text-sm text-teal-300">Client Service Overview</div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div><div className="font-bold">Client</div><div>{clientName}</div></div>
          <div><div className="font-bold">Service</div><div>{serviceName}</div></div>
          <div><div className="font-bold">Assets / Websites</div><div>{totals.assets}</div></div>
          <div><div className="font-bold">Estimated Fee</div><div>PKR {money(totals.fee)}</div></div>
        </div>
        <div className="mt-8 text-lg font-black">Service Flow</div>
        <table className="mt-3 w-full border-collapse text-xs">
          <thead><tr className="bg-teal-500 text-white"><th className="border p-2">Step</th><th className="border p-2">Stage</th><th className="border p-2">Description</th><th className="border p-2">Outcome</th></tr></thead>
          <tbody>{SERVICE_FLOW.map((item) => <tr key={item.step}><td className="border p-2 text-center">{item.step}</td><td className="border p-2 text-center">{item.title}</td><td className="border p-2 text-center">{item.text}</td><td className="border p-2 text-center">{item.outcome}</td></tr>)}</tbody>
        </table>
        <div className="mt-8 text-lg font-black">Core Deliverables</div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{DELIVERABLES.map((item) => <li key={item}>{item}</li>)}</ul>
        <div className="mt-8 text-lg font-black">Assessment Boundaries</div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{LIMITS.map((item) => <li key={item}>{item}</li>)}</ul>
        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">Confidential Service Overview - CyberShield360 By Mujtaba</div>
      </section>
    </div>
  );
}
