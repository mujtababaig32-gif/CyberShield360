import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommercialJourney from "../components/CommercialJourney";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import {
  loadCommercialWorkflow,
  saveCommercialWorkflow,
} from "../lib/commercialWorkflow";

const NOTES = [
  "Only the approved assessment scope is included in this quotation.",
  "Remediation work starts after findings and fixing scope are approved.",
  "Any third-party licensing, paid provider data, or client cloud charges are excluded unless listed separately.",
  "A verification rescan is recommended after approved remediation work.",
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

export default function ClientQuotation() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadCommercialWorkflow(), []);

  const [clientName, setClientName] = useState(initial.clientName);
  const [projectName, setProjectName] = useState(initial.projectName || initial.packageName);
  const [assetCount, setAssetCount] = useState(String(initial.assetCount));
  const [assessmentFee, setAssessmentFee] = useState(String(initial.assessmentFee));
  const [fixingFee, setFixingFee] = useState(String(initial.fixingFee));
  const [trainingFee, setTrainingFee] = useState(String(initial.trainingFee));
  const [validDays, setValidDays] = useState(String(initial.validDays));
  const [commercialApproved, setCommercialApproved] = useState(initial.commercialApproved);
  const [msg, setMsg] = useState<string | null>(null);

  const totals = useMemo(() => {
    const assessment = safeNumber(assessmentFee);
    const fixing = safeNumber(fixingFee);
    const training = safeNumber(trainingFee);
    return {
      assessment,
      fixing,
      training,
      grandTotal: assessment + fixing + training,
      assetCount: Math.max(1, safeNumber(assetCount)),
      validDays: Math.max(1, safeNumber(validDays)),
    };
  }, [assessmentFee, fixingFee, trainingFee, assetCount, validDays]);

  const estimateRows = [
    { item: "Assessment Fee", scope: `${totals.assetCount} approved asset(s) / website(s)`, amount: totals.assessment, status: "Required" },
    { item: "Fixing Support", scope: "Approved remediation scope only", amount: totals.fixing, status: totals.fixing > 0 ? "Included" : "Not Added" },
    { item: "Training & Handover", scope: "Client awareness and report handover", amount: totals.training, status: totals.training > 0 ? "Included" : "Not Added" },
  ];

  const persist = () => saveCommercialWorkflow({
    clientName: clientName.trim() || "Prospective Client",
    projectName: projectName.trim() || initial.packageName,
    assetCount: totals.assetCount,
    assessmentFee: totals.assessment,
    fixingFee: totals.fixing,
    trainingFee: totals.training,
    validDays: totals.validDays,
    commercialApproved,
  });

  const saveAndContinue = () => {
    persist();
    navigate("/client-onboarding");
  };

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 - Client Quotation"],
      [],
      ["Client", clientName],
      ["Project", projectName],
      ["Package", initial.packageName],
      ["Assets", totals.assetCount],
      ["Valid For", `${totals.validDays} days`],
      ["Commercial Approval", commercialApproved ? "Approved" : "Draft / Pending"],
      [],
      ["Line Item", "Scope", "Status", "Amount PKR"],
      ...estimateRows.map((row) => [row.item, row.scope, row.status, row.amount]),
      [],
      ["Grand Total", "", "", totals.grandTotal],
      [],
      ["Notes"],
      ...NOTES.map((note) => [note]),
    ];

    const html = `<html><head><meta charset="UTF-8" /></head><body><table>${rows
      .map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #d9e2ec;padding:10px;text-align:center">${String(cell)}</td>`).join("")}</tr>`)
      .join("")}</table></body></html>`;

    downloadTextFile(
      `cybershield360-client-quotation-${clientName.replace(/\s+/g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
    setMsg("Excel quotation downloaded.");
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
          #quotation-print-area, #quotation-print-area * { visibility: visible; }
          #quotation-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; background: white !important; color: #0f172a !important; padding: 28px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <CommercialJourney current="quotation" />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">Deal Desk</div>
            <h1 className="text-3xl font-black tracking-tight text-white">Client Quotation</h1>
            <p className="mt-3 text-sm leading-7 text-slate-400">Prepare the commercial scope, document what is included, and carry the approved draft into onboarding without re-entering the client details.</p>
          </div>
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 xl:max-w-md">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={exportPdf} className="btn-primary justify-center">Download PDF</button><button onClick={exportExcel} className="btn-ghost justify-center">Download Excel</button></div>
            <button onClick={saveAndContinue} className="btn-primary mt-2 w-full justify-center">Save & Continue to Onboarding →</button>
          </div>
        </div>
      </section>

      {msg && <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-semibold text-brand-300">{msg}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Package" value={initial.packageName} hint="Selected commercial offer" tone="brand" />
        <CyberStatCard label="Assets" value={totals.assetCount} hint="Current quoted scope" tone="green" />
        <CyberStatCard label="Grand Total" value={`PKR ${money(totals.grandTotal)}`} hint="Current quotation" tone="orange" />
        <CyberStatCard label="Approval" value={commercialApproved ? "Approved" : "Pending"} hint="Commercial status" tone={commercialApproved ? "green" : "brand"} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Quotation Details</h2>
          <div className="mt-5 space-y-4">
            <div><label htmlFor="quotation-client-name" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Client Name</label><input id="quotation-client-name" className="input mt-2" value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
            <div><label htmlFor="quotation-project-name" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Project Name</label><input id="quotation-project-name" className="input mt-2" value={projectName} onChange={(e) => setProjectName(e.target.value)} /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label htmlFor="quotation-asset-count" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Assets / Websites</label><input id="quotation-asset-count" className="input mt-2" value={assetCount} onChange={(e) => setAssetCount(e.target.value)} inputMode="numeric" /></div>
              <div><label htmlFor="quotation-valid-days" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Valid Days</label><input id="quotation-valid-days" className="input mt-2" value={validDays} onChange={(e) => setValidDays(e.target.value)} inputMode="numeric" /></div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <input type="checkbox" checked={commercialApproved} onChange={(e) => setCommercialApproved(e.target.checked)} className="mt-1 h-4 w-4" />
              <span><span className="block text-sm font-black text-white">Commercial scope approved</span><span className="mt-1 block text-xs leading-5 text-slate-500">Use this only when the client has approved the quoted package, scope, and commercial terms.</span></span>
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Pricing Inputs</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Assessment remains the core line item. Fixing and training are included only when they are part of the selected scope.</p>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><label htmlFor="quotation-assessment-fee" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Assessment Fee</label><input id="quotation-assessment-fee" className="input mt-2" value={assessmentFee} onChange={(e) => setAssessmentFee(e.target.value)} inputMode="numeric" /></div>
            <div><label htmlFor="quotation-fixing-fee" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Fixing Fee</label><input id="quotation-fixing-fee" className="input mt-2" value={fixingFee} onChange={(e) => setFixingFee(e.target.value)} inputMode="numeric" /></div>
            <div><label htmlFor="quotation-training-fee" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Training Fee</label><input id="quotation-training-fee" className="input mt-2" value={trainingFee} onChange={(e) => setTrainingFee(e.target.value)} inputMode="numeric" /></div>
          </div>
          <div className="mt-5 rounded-3xl border border-brand-500/30 bg-brand-500/10 p-5 text-center"><div className="text-xs font-black uppercase tracking-[0.18em] text-brand-300">Estimated Total</div><div className="mt-2 text-3xl font-black text-white">PKR {money(totals.grandTotal)}</div></div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {estimateRows.map((row) => <div key={row.item} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-xl shadow-black/10"><div className="flex justify-center"><CyberStatusBadge value={row.status} /></div><h2 className="mt-4 font-black text-white">{row.item}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{row.scope}</p><div className="mt-4 text-2xl font-black text-brand-300">PKR {money(row.amount)}</div></div>)}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Quotation Notes</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">{NOTES.map((note, index) => <div key={note} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300"><div className="mb-2 text-xs font-black uppercase tracking-widest text-brand-300">Note #{index + 1}</div>{note}</div>)}</div>
      </section>

      <section id="quotation-print-area" className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full">
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white"><div className="text-2xl font-black">CyberShield360 By Mujtaba</div><div className="mt-1 text-sm text-teal-300">Client Security Quotation</div></div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm"><div><div className="font-bold">Client</div><div>{clientName}</div></div><div><div className="font-bold">Project</div><div>{projectName}</div></div><div><div className="font-bold">Package</div><div>{initial.packageName}</div></div><div><div className="font-bold">Valid For</div><div>{totals.validDays} days</div></div></div>
        <table className="mt-8 w-full border-collapse text-sm"><thead><tr className="bg-teal-500 text-white"><th className="border p-3">Line Item</th><th className="border p-3">Scope</th><th className="border p-3">Status</th><th className="border p-3">Amount</th></tr></thead><tbody>{estimateRows.map((row) => <tr key={row.item}><td className="border p-3 text-center font-semibold">{row.item}</td><td className="border p-3 text-center">{row.scope}</td><td className="border p-3 text-center">{row.status}</td><td className="border p-3 text-center">PKR {money(row.amount)}</td></tr>)}<tr><td className="border p-3 text-center font-black" colSpan={3}>Grand Total</td><td className="border p-3 text-center font-black">PKR {money(totals.grandTotal)}</td></tr></tbody></table>
        <div className="mt-8 text-lg font-black">Notes</div><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{NOTES.map((note) => <li key={note}>{note}</li>)}</ul>
        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">Confidential Quotation - CyberShield360 By Mujtaba</div>
      </section>
    </div>
  );
}
