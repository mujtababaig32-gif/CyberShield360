import { useMemo, useState } from "react";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type PricingLine = {
  name: string;
  description: string;
  dependsOn: string;
  status: "Required" | "Optional" | "Included";
  owner: string;
};

const PRICING_LINES: PricingLine[] = [
  {
    name: "Assessment Fee",
    description: "Initial website, asset, risk, DNS, SSL, headers, email security, and exposure review.",
    dependsOn: "Assets, websites, report depth",
    status: "Required",
    owner: "Security Analyst",
  },
  {
    name: "Client Report",
    description: "Executive PDF and implementation Excel report with findings, business impact, and fixes.",
    dependsOn: "Latest Full Posture scan",
    status: "Included",
    owner: "Report Builder",
  },
  {
    name: "Optional Fixing Fee",
    description: "Security improvements based on approved remediation scope.",
    dependsOn: "Issue count and complexity",
    status: "Optional",
    owner: "Web / IT Team",
  },
  {
    name: "Optional Training Fee",
    description: "Client training session for team awareness, report understanding, and handover.",
    dependsOn: "Team size and session length",
    status: "Optional",
    owner: "Client Success",
  },
];

const QUOTATION_NOTES = [
  "Pricing depends on number of websites, assets, and issues found.",
  "Fixing work should start only after the assessment report is approved.",
  "Final report should include before/after score comparison.",
  "Training can be added for non-technical teams and business owners.",
];

const SCOPE_ITEMS = [
  {
    title: "Security Assessment",
    detail: "Review website posture, SSL/TLS, DNS, headers, email security, and common exposure points.",
    status: "Core",
  },
  {
    title: "Executive Report",
    detail: "Deliver a professional CyberShield360 PDF report for management and decision makers.",
    status: "Included",
  },
  {
    title: "Technical Handover",
    detail: "Provide Excel findings and remediation details for the implementation team.",
    status: "Included",
  },
  {
    title: "Approved Fixes",
    detail: "Fixing is scoped after the assessment, based on severity, complexity, and approval.",
    status: "Optional",
  },
];

function money(value: number) {
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function safeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
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
  const [clientName, setClientName] = useState("Acme Corp");
  const [projectName, setProjectName] = useState("Website Security Assessment");
  const [assetCount, setAssetCount] = useState("1");
  const [assessmentFee, setAssessmentFee] = useState("25000");
  const [fixingFee, setFixingFee] = useState("0");
  const [trainingFee, setTrainingFee] = useState("0");
  const [validDays, setValidDays] = useState("7");
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
      assetCount: safeNumber(assetCount),
      validDays: safeNumber(validDays),
    };
  }, [assessmentFee, fixingFee, trainingFee, assetCount, validDays]);

  const estimateRows = useMemo(
    () => [
      {
        item: "Assessment Fee",
        scope: `${totals.assetCount || 1} asset / website review`,
        amount: totals.assessment,
        status: "Required",
      },
      {
        item: "Optional Fixing Fee",
        scope: "Approved remediation support",
        amount: totals.fixing,
        status: totals.fixing > 0 ? "Optional" : "Not Added",
      },
      {
        item: "Optional Training Fee",
        scope: "Client handover and awareness session",
        amount: totals.training,
        status: totals.training > 0 ? "Optional" : "Not Added",
      },
    ],
    [totals]
  );

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 By Mujtaba - Client Quotation"],
      [],
      ["Client", clientName],
      ["Project", projectName],
      ["Assets", totals.assetCount],
      ["Valid For", `${totals.validDays} days`],
      [],
      ["Line Item", "Scope", "Status", "Amount PKR"],
      ...estimateRows.map((row) => [row.item, row.scope, row.status, row.amount]),
      [],
      ["Grand Total", "", "", totals.grandTotal],
      [],
      ["Notes"],
      ...QUOTATION_NOTES.map((note) => [note]),
    ];

    const htmlRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td style="border:1px solid #d9e2ec;padding:10px;text-align:center;">${cell}</td>`)
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
      `cybershield360-client-quotation-${clientName.replace(/ /g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );

    setMsg("Excel quotation downloaded.");
  };

  const exportPdf = () => {
    setMsg("Print dialog opened. Choose Save as PDF to download the quotation.");
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

            #quotation-print-area,
            #quotation-print-area * {
              visibility: visible;
            }

            #quotation-print-area {
              position: absolute;
              inset: 0;
              width: 100%;
              background: white;
              color: #0f172a;
              padding: 28px;
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
              Deal Desk
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Client Quotation
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Prepare one-time pricing based on assessment scope, number of assets,
              remediation complexity, report requirements, and optional client training.
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
        <CyberStatCard label="Pricing Model" value="One-Time" hint="Assessment based" tone="brand" />
        <CyberStatCard label="Core Fee" value="Assessment" hint="Required scope" tone="green" />
        <CyberStatCard label="Grand Total" value={`PKR ${money(totals.grandTotal)}`} hint="Current estimate" tone="orange" />
        <CyberStatCard label="Validity" value={`${totals.validDays || 0} Days`} hint="Quotation window" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Quotation Details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Fill these values before exporting the client quotation.
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
                Project Name
              </label>
              <input
                className="input mt-2"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Website Security Assessment"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Valid Days
                </label>
                <input
                  className="input mt-2"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Pricing Inputs</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Keep assessment required. Add fixing and training only when included in the proposal.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Assessment Fee
              </label>
              <input
                className="input mt-2"
                value={assessmentFee}
                onChange={(e) => setAssessmentFee(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Fixing Fee
              </label>
              <input
                className="input mt-2"
                value={fixingFee}
                onChange={(e) => setFixingFee(e.target.value)}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Training Fee
              </label>
              <input
                className="input mt-2"
                value={trainingFee}
                onChange={(e) => setTrainingFee(e.target.value)}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-brand-500/30 bg-brand-500/10 p-5 text-center">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Estimated Total
            </div>
            <div className="mt-2 text-3xl font-black text-white">
              PKR {money(totals.grandTotal)}
            </div>
          </div>
        </div>
      </section>

      <CyberTable
        title="Quotation Structure"
        description="Clear pricing components for assessment, approved fixing, and client training."
        data={PRICING_LINES}
        emptyText="No quotation lines available."
        columns={[
          {
            key: "name",
            label: "Line Item",
            render: (line) => (
              <div className="mx-auto min-w-64 text-center font-semibold text-white">
                {line.name}
              </div>
            ),
          },
          {
            key: "description",
            label: "Description",
            render: (line) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                {line.description}
              </div>
            ),
          },
          {
            key: "depends",
            label: "Depends On",
            render: (line) => (
              <div className="mx-auto min-w-72 text-center text-sm leading-6 text-slate-400">
                {line.dependsOn}
              </div>
            ),
          },
          {
            key: "owner",
            label: "Owner",
            render: (line) => (
              <div className="mx-auto min-w-48 text-center text-sm font-semibold text-slate-300">
                {line.owner}
              </div>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (line) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={line.status} />
              </div>
            ),
          },
        ]}
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Scope Summary</h2>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {SCOPE_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-white">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {item.detail}
                    </div>
                  </div>

                  <CyberStatusBadge value={item.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Quotation Notes</h2>

          <div className="mt-5 space-y-3">
            {QUOTATION_NOTES.map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-sm leading-6 text-slate-300"
              >
                <div className="mb-2 text-xs font-black uppercase tracking-widest text-brand-300">
                  Note #{index + 1}
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="quotation-print-area"
        className="hidden rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 print:block"
      >
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white">
          <div className="text-2xl font-black">CyberShield360 By Mujtaba</div>
          <div className="mt-1 text-sm text-teal-300">Client Security Quotation</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-bold">Client</div>
            <div>{clientName}</div>
          </div>
          <div>
            <div className="font-bold">Project</div>
            <div>{projectName}</div>
          </div>
          <div>
            <div className="font-bold">Assets / Websites</div>
            <div>{totals.assetCount}</div>
          </div>
          <div>
            <div className="font-bold">Valid For</div>
            <div>{totals.validDays} days</div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-teal-500 text-white">
              <th className="border border-slate-200 p-3 text-center">Line Item</th>
              <th className="border border-slate-200 p-3 text-center">Scope</th>
              <th className="border border-slate-200 p-3 text-center">Status</th>
              <th className="border border-slate-200 p-3 text-center">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimateRows.map((row) => (
              <tr key={row.item}>
                <td className="border border-slate-200 p-3 text-center font-semibold">{row.item}</td>
                <td className="border border-slate-200 p-3 text-center">{row.scope}</td>
                <td className="border border-slate-200 p-3 text-center">{row.status}</td>
                <td className="border border-slate-200 p-3 text-center">PKR {money(row.amount)}</td>
              </tr>
            ))}
            <tr>
              <td className="border border-slate-200 p-3 text-center font-black" colSpan={3}>
                Grand Total
              </td>
              <td className="border border-slate-200 p-3 text-center font-black">
                PKR {money(totals.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8">
          <div className="text-lg font-black">Notes</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {QUOTATION_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Confidential Quotation - CyberShield360 By Mujtaba
        </div>
      </section>
    </div>
  );
}
