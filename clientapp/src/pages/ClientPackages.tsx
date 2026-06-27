import { useMemo, useState } from "react";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type PackageTier = {
  name: string;
  tag: string;
  fit: string;
  description: string;
  recommendedFor: string;
  delivery: string;
  items: string[];
};

const PACKAGES: PackageTier[] = [
  {
    name: "Website Security Assessment",
    tag: "Starter",
    fit: "Small business websites",
    description: "For small business websites that need a professional security review.",
    recommendedFor: "First-time clients",
    delivery: "Assessment + report",
    items: [
      "Website posture scan",
      "SSL, DNS, headers, and email security checks",
      "Risk report",
      "Executive summary",
      "Fix recommendations",
      "One review call",
    ],
  },
  {
    name: "Assessment + Fixing",
    tag: "Best Value",
    fit: "Clients who want help fixing common issues",
    description: "For clients who want CyberShield360 to identify and help fix common issues.",
    recommendedFor: "Most clients",
    delivery: "Assessment + approved fixes",
    items: [
      "Everything in Website Security Assessment",
      "Common security header fixes",
      "DNS/email security guidance",
      "Admin panel hardening guidance",
      "Before/after score comparison",
      "Final improved report",
    ],
  },
  {
    name: "Business Security Readiness",
    tag: "Advanced",
    fit: "Larger clients and teams",
    description: "For larger clients that need assessment, remediation, training, and support.",
    recommendedFor: "Growing teams",
    delivery: "Assessment + fixing + training",
    items: [
      "Website/app posture scan",
      "Asset inventory",
      "Vulnerability and risk report",
      "Compliance readiness check",
      "Team training session",
      "30-day support window",
    ],
  },
];

const PRICING_MODEL = [
  {
    title: "Assessment Fee",
    text: "Fixed starting scope based on number of assets and report depth.",
    status: "Required",
  },
  {
    title: "Optional Fixing Fee",
    text: "Quoted after findings are confirmed and remediation scope is approved.",
    status: "Optional",
  },
  {
    title: "Optional Training Fee",
    text: "Added when the client wants team awareness or report handover training.",
    status: "Optional",
  },
];

const PACKAGE_OPTIONS = PACKAGES.map((pkg) => pkg.name);

function safeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

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

export default function ClientPackages() {
  const [clientName, setClientName] = useState("Acme Corp");
  const [selectedPackage, setSelectedPackage] = useState("Assessment + Fixing");
  const [assetCount, setAssetCount] = useState("1");
  const [starterFee, setStarterFee] = useState("25000");
  const [bestValueFee, setBestValueFee] = useState("55000");
  const [advancedFee, setAdvancedFee] = useState("95000");
  const [msg, setMsg] = useState<string | null>(null);

  const selectedPackageDetails = useMemo(
    () => PACKAGES.find((pkg) => pkg.name === selectedPackage) ?? PACKAGES[1],
    [selectedPackage]
  );

  const packagePrices = useMemo(
    () => ({
      "Website Security Assessment": safeNumber(starterFee),
      "Assessment + Fixing": safeNumber(bestValueFee),
      "Business Security Readiness": safeNumber(advancedFee),
    }),
    [starterFee, bestValueFee, advancedFee]
  );

  const selectedPrice = packagePrices[selectedPackage as keyof typeof packagePrices] ?? 0;
  const assets = safeNumber(assetCount) || 1;

  const comparisonRows = useMemo(
    () =>
      PACKAGES.map((pkg) => ({
        package: pkg.name,
        fit: pkg.fit,
        recommendedFor: pkg.recommendedFor,
        delivery: pkg.delivery,
        startingFee: packagePrices[pkg.name as keyof typeof packagePrices],
        tag: pkg.tag,
      })),
    [packagePrices]
  );

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 By Mujtaba - Client Packages Proposal"],
      [],
      ["Client", clientName],
      ["Selected Package", selectedPackage],
      ["Assets / Websites", assets],
      ["Estimated Package Fee PKR", selectedPrice],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Package", "Fit", "Recommended For", "Delivery", "Starting Fee PKR", "Tag"],
      ...comparisonRows.map((row) => [
        row.package,
        row.fit,
        row.recommendedFor,
        row.delivery,
        row.startingFee,
        row.tag,
      ]),
      [],
      ["Selected Package Includes"],
      ...selectedPackageDetails.items.map((item) => [item]),
    ];

    const htmlRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #d9e2ec;padding:10px;text-align:center;vertical-align:middle;">${cleanCell(
                  String(cell)
                )}</td>`
            )
            .join("")}</tr>`
      )
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table>
            ${htmlRows}
          </table>
        </body>
      </html>
    `;

    downloadTextFile(
      `cybershield360-client-packages-${clientName.replace(/ /g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );

    setMsg("Excel package proposal downloaded.");
  };

  const exportPdf = () => {
    setMsg("Print dialog opened. Choose Save as PDF to download the package proposal.");
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-6">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }

            #packages-print-area,
            #packages-print-area * {
              visibility: visible;
            }

            #packages-print-area {
              position: absolute !important;
              inset: 0 !important;
              width: 100% !important;
              background: white !important;
              color: #0f172a !important;
              padding: 28px !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Client Success Hub
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Client Packages
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              CyberShield360 can be sold as a one-time assessment, assessment plus fixing,
              or full business readiness package. This is easier for non-technical clients
              to understand than a monthly SaaS subscription.
            </p>
          </div>

          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 xl:max-w-md">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button onClick={exportPdf} className="btn-primary justify-center">
                Download PDF
              </button>

              <button onClick={exportExcel} className="btn-ghost justify-center">
                Download Excel
              </button>
            </div>

            <div className="mt-3 text-center text-xs leading-5 text-slate-500">
              PDF uses the browser print dialog. Choose Save as PDF.
            </div>
          </div>
        </div>
      </section>

      {msg && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-semibold text-brand-300">
          {msg}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Packages" value="3" hint="Simple buying options" tone="brand" />
        <CyberStatCard label="Best Offer" value="Fixing" hint="Assessment + remediation" tone="green" />
        <CyberStatCard label="Selected Fee" value={`PKR ${money(selectedPrice)}`} hint="Current package" tone="orange" />
        <CyberStatCard label="Training" value="Optional" hint="Add-on value" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Proposal Details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use these fields before exporting a package proposal.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Client Name
              </label>
              <input
                className="input mt-2"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client company name"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Selected Package
              </label>
              <select
                className="input mt-2"
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
              >
                {PACKAGE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Assets / Websites
              </label>
              <input
                className="input mt-2"
                value={assetCount}
                onChange={(e) => setAssetCount(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Package Pricing</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Edit starting prices based on scope, asset count, support level, and client requirement.
              </p>
            </div>

            <CyberStatusBadge value={selectedPackageDetails.tag} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Starter
              </label>
              <input
                className="input mt-2"
                value={starterFee}
                onChange={(e) => setStarterFee(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Best Value
              </label>
              <input
                className="input mt-2"
                value={bestValueFee}
                onChange={(e) => setBestValueFee(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Advanced
              </label>
              <input
                className="input mt-2"
                value={advancedFee}
                onChange={(e) => setAdvancedFee(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-brand-500/30 bg-brand-500/10 p-5 text-center">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Selected Package Fee
            </div>
            <div className="mt-2 text-3xl font-black text-white">
              PKR {money(selectedPrice)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {selectedPackageDetails.name} for {assets} asset(s) / website(s).
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {PACKAGES.map((pkg) => {
          const isSelected = pkg.name === selectedPackage;

          return (
            <div
              key={pkg.name}
              className={`rounded-3xl border p-6 text-center shadow-xl shadow-black/10 ${
                isSelected
                  ? "border-brand-500/50 bg-brand-500/10"
                  : "border-white/10 bg-slate-900/70"
              }`}
            >
              <div className="mb-4 flex justify-center">
                <CyberStatusBadge value={pkg.tag} />
              </div>

              <h2 className="text-xl font-black text-white">{pkg.name}</h2>
              <p className="mt-2 text-sm font-semibold text-brand-300">{pkg.fit}</p>
              <p className="mt-2 min-h-16 text-sm leading-6 text-slate-400">
                {pkg.description}
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Starting Fee
                </div>
                <div className="mt-1 text-2xl font-black text-white">
                  PKR {money(packagePrices[pkg.name as keyof typeof packagePrices])}
                </div>
              </div>

              <div className="mt-5 space-y-3 text-left">
                {pkg.items.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <CyberTable
        title="Package Comparison"
        description="Client-facing comparison of package fit, delivery style, and starting fee."
        data={comparisonRows}
        emptyText="No packages available."
        columns={[
          {
            key: "package",
            label: "Package",
            render: (row) => (
              <div className="mx-auto min-w-72 text-center font-semibold text-white">
                {row.package}
              </div>
            ),
          },
          {
            key: "fit",
            label: "Best Fit",
            render: (row) => (
              <div className="mx-auto min-w-72 text-center text-sm leading-6 text-slate-400">
                {row.fit}
              </div>
            ),
          },
          {
            key: "recommendedFor",
            label: "Recommended For",
            render: (row) => (
              <div className="mx-auto min-w-52 text-center text-sm font-semibold text-slate-300">
                {row.recommendedFor}
              </div>
            ),
          },
          {
            key: "delivery",
            label: "Delivery",
            render: (row) => (
              <div className="mx-auto min-w-64 text-center text-sm leading-6 text-slate-400">
                {row.delivery}
              </div>
            ),
          },
          {
            key: "startingFee",
            label: "Starting Fee",
            render: (row) => (
              <div className="mx-auto min-w-40 text-center text-sm font-black text-brand-300">
                PKR {money(row.startingFee)}
              </div>
            ),
          },
          {
            key: "tag",
            label: "Tag",
            render: (row) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={row.tag} />
              </div>
            ),
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Recommended Pricing Model</h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PRICING_MODEL.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
            >
              <div className="mb-3 flex justify-center">
                <CyberStatusBadge value={item.status} />
              </div>
              <div className="font-black text-white">{item.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-400">{item.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="packages-print-area"
        className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full"
      >
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white">
          <div className="text-2xl font-black">CyberShield360 By Mujtaba</div>
          <div className="mt-1 text-sm text-teal-300">Client Security Package Proposal</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-bold">Client</div>
            <div>{clientName}</div>
          </div>
          <div>
            <div className="font-bold">Selected Package</div>
            <div>{selectedPackage}</div>
          </div>
          <div>
            <div className="font-bold">Assets / Websites</div>
            <div>{assets}</div>
          </div>
          <div>
            <div className="font-bold">Estimated Fee</div>
            <div>PKR {money(selectedPrice)}</div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm">
          <div className="font-black text-slate-950">{selectedPackageDetails.name}</div>
          <div className="mt-1 text-slate-700">{selectedPackageDetails.description}</div>
          <div className="mt-2 font-semibold text-slate-900">Best fit: {selectedPackageDetails.fit}</div>
        </div>

        <table className="mt-8 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-teal-500 text-white">
              <th className="border border-slate-200 p-2 text-center">Package</th>
              <th className="border border-slate-200 p-2 text-center">Best Fit</th>
              <th className="border border-slate-200 p-2 text-center">Delivery</th>
              <th className="border border-slate-200 p-2 text-center">Starting Fee</th>
              <th className="border border-slate-200 p-2 text-center">Tag</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.package}>
                <td className="border border-slate-200 p-2 text-center font-semibold">{row.package}</td>
                <td className="border border-slate-200 p-2 text-center">{row.fit}</td>
                <td className="border border-slate-200 p-2 text-center">{row.delivery}</td>
                <td className="border border-slate-200 p-2 text-center">PKR {money(row.startingFee)}</td>
                <td className="border border-slate-200 p-2 text-center">{row.tag}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8">
          <div className="text-lg font-black">Selected Package Includes</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {selectedPackageDetails.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Confidential Package Proposal - CyberShield360 By Mujtaba
        </div>
      </section>
    </div>
  );
}
