import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommercialJourney from "../components/CommercialJourney";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import {
  PACKAGE_NAMES,
  type PackageName,
  loadCommercialWorkflow,
  saveCommercialWorkflow,
} from "../lib/commercialWorkflow";

type PackageTier = {
  name: PackageName;
  tag: string;
  fit: string;
  description: string;
  delivery: string;
  items: string[];
};

const PACKAGES: PackageTier[] = [
  {
    name: "Website Security Assessment",
    tag: "Starter",
    fit: "Small businesses and first-time clients",
    description: "A focused external posture review for one or more approved business domains.",
    delivery: "Assessment + management and technical reports",
    items: [
      "Full Posture assessment of approved domains",
      "SSL/TLS, DNS, headers, SPF, DKIM and DMARC checks",
      "Executive risk summary",
      "Technical findings workbook",
      "Prioritized remediation guidance",
      "Review and handover call",
    ],
  },
  {
    name: "Assessment + Fixing",
    tag: "Best Value",
    fit: "Clients who want assessment plus approved remediation support",
    description: "Combines the assessment with scoped remediation support and verification after approved fixes.",
    delivery: "Assessment + approved fixes + rescan",
    items: [
      "Everything in Website Security Assessment",
      "Remediation scope review",
      "Approved configuration and hardening support",
      "Fix Plan with owner and effort",
      "Verification rescan",
      "Before/after posture comparison",
    ],
  },
  {
    name: "Business Security Readiness",
    tag: "Advanced",
    fit: "Growing organizations that need broader readiness support",
    description: "A broader engagement combining assessment, remediation support, reporting, and team handover.",
    delivery: "Assessment + remediation + training + support",
    items: [
      "Multi-asset posture assessment",
      "Asset and vendor risk review",
      "Compliance readiness view",
      "Prioritized remediation program",
      "Team training and handover",
      "30-day advisory support window",
    ],
  },
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

export default function ClientPackages() {
  const navigate = useNavigate();
  const initial = useMemo(() => loadCommercialWorkflow(), []);

  const [clientName, setClientName] = useState(initial.clientName);
  const [selectedPackage, setSelectedPackage] = useState<PackageName>(initial.packageName);
  const [assetCount, setAssetCount] = useState(String(initial.assetCount));
  const [starterFee, setStarterFee] = useState("25000");
  const [bestValueFee, setBestValueFee] = useState("55000");
  const [advancedFee, setAdvancedFee] = useState("95000");
  const [msg, setMsg] = useState<string | null>(null);

  const prices = useMemo<Record<PackageName, number>>(
    () => ({
      "Website Security Assessment": safeNumber(starterFee),
      "Assessment + Fixing": safeNumber(bestValueFee),
      "Business Security Readiness": safeNumber(advancedFee),
    }),
    [starterFee, bestValueFee, advancedFee]
  );

  const selectedDetails = PACKAGES.find((pkg) => pkg.name === selectedPackage) ?? PACKAGES[1];
  const selectedPrice = prices[selectedPackage];
  const assets = Math.max(1, safeNumber(assetCount));

  const feeBreakdown = useMemo(() => {
    const starter = prices["Website Security Assessment"];
    const best = prices["Assessment + Fixing"];
    const total = selectedPrice;

    if (selectedPackage === "Website Security Assessment") {
      return { assessmentFee: total, fixingFee: 0, trainingFee: 0 };
    }

    if (selectedPackage === "Assessment + Fixing") {
      const assessmentFee = Math.min(starter, total);
      return { assessmentFee, fixingFee: Math.max(0, total - assessmentFee), trainingFee: 0 };
    }

    const assessmentFee = Math.min(starter, total);
    const preferredFixing = Math.max(0, best - starter);
    const fixingFee = Math.min(preferredFixing, Math.max(0, total - assessmentFee));
    return {
      assessmentFee,
      fixingFee,
      trainingFee: Math.max(0, total - assessmentFee - fixingFee),
    };
  }, [prices, selectedPackage, selectedPrice]);

  const saveAndContinue = () => {
    saveCommercialWorkflow({
      clientName: clientName.trim() || "Prospective Client",
      packageName: selectedPackage,
      assetCount: assets,
      projectName: selectedPackage,
      ...feeBreakdown,
    });
    navigate("/client-quotation");
  };

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 - Client Package Proposal"],
      [],
      ["Client", clientName],
      ["Selected Package", selectedPackage],
      ["Assets / Websites", assets],
      ["Selected Package Fee PKR", selectedPrice],
      [],
      ["Package", "Best Fit", "Delivery", "Starting Fee PKR"],
      ...PACKAGES.map((pkg) => [pkg.name, pkg.fit, pkg.delivery, prices[pkg.name]]),
      [],
      ["Selected Package Includes"],
      ...selectedDetails.items.map((item) => [item]),
    ];

    const html = `<html><head><meta charset="UTF-8" /></head><body><table>${rows
      .map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #d9e2ec;padding:10px;text-align:center">${String(cell)}</td>`).join("")}</tr>`)
      .join("")}</table></body></html>`;

    downloadTextFile(
      `cybershield360-client-packages-${clientName.replace(/\s+/g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );
    setMsg("Excel package proposal downloaded.");
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
          #packages-print-area, #packages-print-area * { visibility: visible; }
          #packages-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; background: white !important; color: #0f172a !important; padding: 28px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <CommercialJourney current="package" />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">Client Success Hub</div>
            <h1 className="text-3xl font-black tracking-tight text-white">Client Packages</h1>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Select a clear commercial package, then carry the client, asset count, package, and fee breakdown directly into the quotation step.
            </p>
          </div>

          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 xl:max-w-md">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button onClick={exportPdf} className="btn-primary justify-center">Download PDF</button>
              <button onClick={exportExcel} className="btn-ghost justify-center">Download Excel</button>
            </div>
            <button onClick={saveAndContinue} className="btn-primary mt-2 w-full justify-center">Use Package & Prepare Quotation →</button>
          </div>
        </div>
      </section>

      {msg && <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-semibold text-brand-300">{msg}</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Packages" value={PACKAGES.length} hint="Simple buying options" tone="brand" />
        <CyberStatCard label="Selected" value={selectedDetails.tag} hint={selectedPackage} tone="green" />
        <CyberStatCard label="Selected Fee" value={`PKR ${money(selectedPrice)}`} hint={`${assets} approved asset(s)`} tone="orange" />
        <CyberStatCard label="Next Step" value="Quotation" hint="Commercial handoff" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Proposal Details</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="packages-client-name" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Client Name</label>
              <input id="packages-client-name" className="input mt-2" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="packages-selected-package" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Selected Package</label>
              <select id="packages-selected-package" className="input mt-2" value={selectedPackage} onChange={(e) => setSelectedPackage(e.target.value as PackageName)}>
                {PACKAGE_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="packages-asset-count" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Assets / Websites</label>
              <input id="packages-asset-count" className="input mt-2" value={assetCount} onChange={(e) => setAssetCount(e.target.value)} inputMode="numeric" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Package Pricing</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Edit starting fees before moving to quotation. The selected package is translated into assessment, fixing, and training line items.</p>
            </div>
            <CyberStatusBadge value={selectedDetails.tag} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><label htmlFor="packages-starter-fee" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Starter</label><input id="packages-starter-fee" className="input mt-2" value={starterFee} onChange={(e) => setStarterFee(e.target.value)} inputMode="numeric" /></div>
            <div><label htmlFor="packages-best-value-fee" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Best Value</label><input id="packages-best-value-fee" className="input mt-2" value={bestValueFee} onChange={(e) => setBestValueFee(e.target.value)} inputMode="numeric" /></div>
            <div><label htmlFor="packages-advanced-fee" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Advanced</label><input id="packages-advanced-fee" className="input mt-2" value={advancedFee} onChange={(e) => setAdvancedFee(e.target.value)} inputMode="numeric" /></div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"><div className="text-xs font-black uppercase tracking-wider text-slate-500">Assessment</div><div className="mt-1 font-black text-white">PKR {money(feeBreakdown.assessmentFee)}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"><div className="text-xs font-black uppercase tracking-wider text-slate-500">Fixing</div><div className="mt-1 font-black text-white">PKR {money(feeBreakdown.fixingFee)}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"><div className="text-xs font-black uppercase tracking-wider text-slate-500">Training</div><div className="mt-1 font-black text-white">PKR {money(feeBreakdown.trainingFee)}</div></div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {PACKAGES.map((pkg) => {
          const selected = pkg.name === selectedPackage;
          return (
            <div key={pkg.name} className={`rounded-3xl border p-6 text-center shadow-xl shadow-black/10 ${selected ? "border-brand-500/50 bg-brand-500/10" : "border-white/10 bg-slate-900/70"}`}>
              <div className="mb-4 flex justify-center"><CyberStatusBadge value={pkg.tag} /></div>
              <h2 className="text-xl font-black text-white">{pkg.name}</h2>
              <p className="mt-2 text-sm font-semibold text-brand-300">{pkg.fit}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">{pkg.description}</p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Starting Fee</div><div className="mt-1 text-2xl font-black text-white">PKR {money(prices[pkg.name])}</div></div>
              <div className="mt-5 space-y-3 text-left">{pkg.items.map((item) => <div key={item} className="flex gap-3 text-sm leading-6 text-slate-300"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" /><span>{item}</span></div>)}</div>
              <button onClick={() => setSelectedPackage(pkg.name)} className={selected ? "btn-primary mt-5 w-full justify-center" : "btn-ghost mt-5 w-full justify-center"}>{selected ? "Selected" : "Select Package"}</button>
            </div>
          );
        })}
      </section>

      <section id="packages-print-area" className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full">
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white"><div className="text-2xl font-black">CyberShield360 By Mujtaba</div><div className="mt-1 text-sm text-teal-300">Client Security Package Proposal</div></div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm"><div><div className="font-bold">Client</div><div>{clientName}</div></div><div><div className="font-bold">Selected Package</div><div>{selectedPackage}</div></div><div><div className="font-bold">Assets / Websites</div><div>{assets}</div></div><div><div className="font-bold">Estimated Fee</div><div>PKR {money(selectedPrice)}</div></div></div>
        <table className="mt-8 w-full border-collapse text-xs"><thead><tr className="bg-teal-500 text-white"><th className="border p-2">Package</th><th className="border p-2">Best Fit</th><th className="border p-2">Delivery</th><th className="border p-2">Starting Fee</th></tr></thead><tbody>{PACKAGES.map((pkg) => <tr key={pkg.name}><td className="border p-2 text-center font-semibold">{pkg.name}</td><td className="border p-2 text-center">{pkg.fit}</td><td className="border p-2 text-center">{pkg.delivery}</td><td className="border p-2 text-center">PKR {money(prices[pkg.name])}</td></tr>)}</tbody></table>
        <div className="mt-8 text-lg font-black">Selected Package Includes</div><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{selectedDetails.items.map((item) => <li key={item}>{item}</li>)}</ul>
        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">Confidential Package Proposal - CyberShield360 By Mujtaba</div>
      </section>
    </div>
  );
}
