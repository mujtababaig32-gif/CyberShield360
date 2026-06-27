import { useMemo, useState } from "react";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type ServiceFlowItem = {
  step: string;
  title: string;
  text: string;
  owner: string;
  outcome: string;
};

const SERVICE_FLOW: ServiceFlowItem[] = [
  {
    step: "01",
    title: "Identify",
    text: "Scan websites, assets, DNS, SSL, headers, vulnerabilities, and public exposure.",
    owner: "CyberShield360",
    outcome: "Security gaps discovered",
  },
  {
    step: "02",
    title: "Explain",
    text: "Translate technical findings into simple business language for non-technical clients.",
    owner: "Advisor Mode",
    outcome: "Client understands risk",
  },
  {
    step: "03",
    title: "Fix",
    text: "Create a clear remediation plan and support approved one-time fixing work.",
    owner: "Remediation Team",
    outcome: "Approved issues resolved",
  },
  {
    step: "04",
    title: "Train",
    text: "Help the client understand what changed and how to avoid repeated issues.",
    owner: "Client Success",
    outcome: "Team can maintain posture",
  },
];

const DELIVERABLES = [
  "Executive security assessment report",
  "Business-impact explanation for each major issue",
  "Prioritized fix plan with difficulty and owner",
  "Before/after score comparison after remediation",
  "Client training session and handover guidance",
];

const POSITIONING_POINTS = [
  {
    title: "One-Time Service Offer",
    detail: "Simple assessment and remediation model that is easier for businesses to buy.",
    status: "Recommended",
  },
  {
    title: "Business-Friendly Report",
    detail: "Explains risk, impact, and fix priority without heavy technical jargon.",
    status: "Included",
  },
  {
    title: "Optional Fixing Support",
    detail: "Client can approve remediation work after reviewing the assessment report.",
    status: "Add-On",
  },
  {
    title: "Training Handover",
    detail: "Team guidance helps the client avoid repeating the same security mistakes.",
    status: "Value Add",
  },
];

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

export default function ServiceOverview() {
  const [clientName, setClientName] = useState("Acme Corp");
  const [serviceName, setServiceName] = useState("CyberShield360 Security Assessment & Remediation");
  const [assetCount, setAssetCount] = useState("1");
  const [estimatedFee, setEstimatedFee] = useState("55000");
  const [msg, setMsg] = useState<string | null>(null);

  const totals = useMemo(() => {
    const assets = safeNumber(assetCount) || 1;
    const fee = safeNumber(estimatedFee);

    return {
      assets,
      fee,
      deliverables: DELIVERABLES.length,
      serviceSteps: SERVICE_FLOW.length,
    };
  }, [assetCount, estimatedFee]);

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 By Mujtaba - Service Overview"],
      [],
      ["Client", clientName],
      ["Service", serviceName],
      ["Assets / Websites", totals.assets],
      ["Estimated Fee PKR", totals.fee],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Step", "Title", "Description", "Owner", "Outcome"],
      ...SERVICE_FLOW.map((item) => [
        item.step,
        item.title,
        item.text,
        item.owner,
        item.outcome,
      ]),
      [],
      ["Core Deliverables"],
      ...DELIVERABLES.map((item) => [item]),
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
      `cybershield360-service-overview-${clientName.replace(/ /g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );

    setMsg("Excel service overview downloaded.");
  };

  const exportPdf = () => {
    setMsg("Print dialog opened. Choose Save as PDF to download the service overview.");
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

            #service-print-area,
            #service-print-area * {
              visibility: visible;
            }

            #service-print-area {
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

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Client Success Hub
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              CyberShield360 Service Overview
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              CyberShield360 is a service-backed security assessment and remediation platform.
              It helps businesses identify cybersecurity issues, understand business impact,
              receive a professional report, fix approved issues, and train their team to avoid repeated risks.
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
        <CyberStatCard label="Service Model" value="One-Time" hint="Assessment + remediation" tone="brand" />
        <CyberStatCard label="Client Type" value="Business" hint="Non-technical friendly" tone="green" />
        <CyberStatCard label="Service Fee" value={`PKR ${money(totals.fee)}`} hint="Editable estimate" tone="orange" />
        <CyberStatCard label="Deliverables" value={totals.deliverables} hint="Client handover" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Service Proposal Details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use these values before exporting a client-facing service overview.
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
                Service Name
              </label>
              <input
                className="input mt-2"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Security Assessment & Remediation"
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
                  Estimated Fee
                </label>
                <input
                  className="input mt-2"
                  value={estimatedFee}
                  onChange={(e) => setEstimatedFee(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Best Positioning</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                CyberShield360 should be presented as a one-time cybersecurity assessment
                and remediation solution for businesses, not only as a monthly SaaS subscription.
                The offer becomes easier to sell because the client receives identification,
                reporting, solution guidance, fixing, and training in one package.
              </p>
            </div>

            <CyberStatusBadge value="Client Ready" />
          </div>

          <div className="mt-5 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-center text-sm font-semibold leading-6 text-slate-200">
            “Identify the problem, explain the impact, fix what is approved, and train the client to stay secure.”
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SERVICE_FLOW.map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-xl shadow-black/10"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-sm font-black text-brand-300">
              {item.step}
            </div>

            <h2 className="text-base font-black text-white">{item.title}</h2>
            <p className="mt-2 min-h-24 text-sm leading-6 text-slate-400">{item.text}</p>

            <div className="mt-4 flex justify-center">
              <CyberStatusBadge value={item.owner} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-semibold leading-5 text-slate-400">
              {item.outcome}
            </div>
          </div>
        ))}
      </section>

      <CyberTable
        title="Service Delivery Flow"
        description="Client-facing service stages from discovery to handover."
        data={SERVICE_FLOW}
        emptyText="No service steps available."
        columns={[
          {
            key: "step",
            label: "Step",
            render: (row) => (
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-center text-sm font-black text-brand-300">
                {row.step}
              </div>
            ),
          },
          {
            key: "title",
            label: "Stage",
            render: (row) => (
              <div className="mx-auto min-w-40 text-center font-semibold text-white">
                {row.title}
              </div>
            ),
          },
          {
            key: "text",
            label: "Description",
            render: (row) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                {row.text}
              </div>
            ),
          },
          {
            key: "owner",
            label: "Owner",
            render: (row) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={row.owner} />
              </div>
            ),
          },
          {
            key: "outcome",
            label: "Outcome",
            render: (row) => (
              <div className="mx-auto min-w-64 text-center text-sm font-semibold text-slate-300">
                {row.outcome}
              </div>
            ),
          },
        ]}
      />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Service Positioning Points</h2>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {POSITIONING_POINTS.map((item) => (
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
          <h2 className="text-xl font-black text-white">Core Deliverables</h2>

          <div className="mt-5 space-y-3">
            {DELIVERABLES.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold leading-6 text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="service-print-area"
        className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full"
      >
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white">
          <div className="text-2xl font-black">CyberShield360 By Mujtaba</div>
          <div className="mt-1 text-sm text-teal-300">Client Service Overview</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-bold">Client</div>
            <div>{clientName}</div>
          </div>
          <div>
            <div className="font-bold">Service</div>
            <div>{serviceName}</div>
          </div>
          <div>
            <div className="font-bold">Assets / Websites</div>
            <div>{totals.assets}</div>
          </div>
          <div>
            <div className="font-bold">Estimated Fee</div>
            <div>PKR {money(totals.fee)}</div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm">
          <div className="font-black text-slate-950">Service Positioning</div>
          <div className="mt-1 leading-6 text-slate-700">
            CyberShield360 helps businesses identify risk, understand business impact,
            complete approved remediation, and train the team to maintain improved security posture.
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-teal-500 text-white">
              <th className="border border-slate-200 p-2 text-center">Step</th>
              <th className="border border-slate-200 p-2 text-center">Stage</th>
              <th className="border border-slate-200 p-2 text-center">Description</th>
              <th className="border border-slate-200 p-2 text-center">Owner</th>
              <th className="border border-slate-200 p-2 text-center">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {SERVICE_FLOW.map((item) => (
              <tr key={item.step}>
                <td className="border border-slate-200 p-2 text-center font-semibold">{item.step}</td>
                <td className="border border-slate-200 p-2 text-center">{item.title}</td>
                <td className="border border-slate-200 p-2 text-center">{item.text}</td>
                <td className="border border-slate-200 p-2 text-center">{item.owner}</td>
                <td className="border border-slate-200 p-2 text-center">{item.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8">
          <div className="text-lg font-black">Core Deliverables</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {DELIVERABLES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Confidential Service Overview - CyberShield360 By Mujtaba
        </div>
      </section>
    </div>
  );
}
