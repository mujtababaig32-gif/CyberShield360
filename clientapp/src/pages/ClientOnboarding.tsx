import { useMemo, useState } from "react";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type StepItem = {
  title: string;
  text: string;
  owner: string;
  status: string;
  outcome: string;
};

type ChecklistItem = {
  item: string;
  owner: string;
  status: string;
  priority: "Required" | "Recommended" | "Optional";
};

const STEPS: StepItem[] = [
  {
    title: "Client Information",
    text: "Collect business name, website, contact person, industry, and assessment scope.",
    owner: "Sales / Client Success",
    status: "Required",
    outcome: "Client profile ready",
  },
  {
    title: "Asset Collection",
    text: "Add domains, applications, cloud assets, email domains, and public-facing systems.",
    owner: "Security Analyst",
    status: "Required",
    outcome: "Assessment scope prepared",
  },
  {
    title: "Assessment Scope",
    text: "Define what CyberShield360 will scan, report, explain, and optionally fix.",
    owner: "Project Owner",
    status: "Required",
    outcome: "Deliverables agreed",
  },
  {
    title: "Approval & Start",
    text: "Confirm package, timeline, deliverables, and start the assessment workflow.",
    owner: "Client",
    status: "Approval",
    outcome: "Engagement ready to begin",
  },
];

const CHECKLIST: ChecklistItem[] = [
  {
    item: "Website/domain added",
    owner: "Security Analyst",
    status: "Ready",
    priority: "Required",
  },
  {
    item: "Business contact added",
    owner: "Client Success",
    status: "Ready",
    priority: "Required",
  },
  {
    item: "Assessment package selected",
    owner: "Deal Desk",
    status: "Needs Approval",
    priority: "Required",
  },
  {
    item: "Fixing scope discussed",
    owner: "Remediation Lead",
    status: "Planned",
    priority: "Recommended",
  },
  {
    item: "Training requirement confirmed",
    owner: "Client Success",
    status: "Planned",
    priority: "Optional",
  },
  {
    item: "Report delivery timeline agreed",
    owner: "Project Owner",
    status: "Needs Approval",
    priority: "Required",
  },
];

const PACKAGE_OPTIONS = [
  "Website Security Assessment",
  "Assessment + Fixing",
  "Business Security Readiness",
];

const INDUSTRIES = [
  "E-commerce",
  "Healthcare",
  "Education",
  "Finance",
  "Real Estate",
  "Professional Services",
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
  const [clientName, setClientName] = useState("Acme Corp");
  const [contactName, setContactName] = useState("Client Contact");
  const [website, setWebsite] = useState("example.com");
  const [industry, setIndustry] = useState("E-commerce");
  const [selectedPackage, setSelectedPackage] = useState("Assessment + Fixing");
  const [timeline, setTimeline] = useState("3-5 business days");
  const [assetCount, setAssetCount] = useState("1");
  const [msg, setMsg] = useState<string | null>(null);

  const stats = useMemo(() => {
    const ready = CHECKLIST.filter((item) => item.status === "Ready").length;
    const approval = CHECKLIST.filter((item) => item.status.includes("Approval")).length;
    const required = CHECKLIST.filter((item) => item.priority === "Required").length;

    return {
      ready,
      approval,
      required,
      total: CHECKLIST.length,
    };
  }, []);

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 By Mujtaba - Client Onboarding"],
      [],
      ["Client", clientName],
      ["Contact Person", contactName],
      ["Website / Domain", website],
      ["Industry", industry],
      ["Selected Package", selectedPackage],
      ["Assets / Websites", assetCount],
      ["Timeline", timeline],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Onboarding Steps"],
      ["Step", "Title", "Description", "Owner", "Status", "Outcome"],
      ...STEPS.map((step, index) => [
        index + 1,
        step.title,
        step.text,
        step.owner,
        step.status,
        step.outcome,
      ]),
      [],
      ["Checklist"],
      ["Item", "Owner", "Status", "Priority"],
      ...CHECKLIST.map((item) => [item.item, item.owner, item.status, item.priority]),
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
      `cybershield360-client-onboarding-${clientName.replace(/ /g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );

    setMsg("Excel onboarding file downloaded.");
  };

  const exportPdf = () => {
    setMsg("Print dialog opened. Choose Save as PDF to download the onboarding file.");
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

            #onboarding-print-area,
            #onboarding-print-area * {
              visibility: visible;
            }

            #onboarding-print-area {
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
              Client Onboarding
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Start every client engagement with a clean intake process. Capture client details,
              assets, assessment scope, service package, timeline, and approval before the
              security review begins.
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
        <CyberStatCard label="Client Intake" value="4 Steps" hint="Structured onboarding" tone="brand" />
        <CyberStatCard label="Ready Items" value={stats.ready} hint="Checklist completed" tone="green" />
        <CyberStatCard label="Need Approval" value={stats.approval} hint="Client decision" tone="orange" />
        <CyberStatCard label="Required Items" value={stats.required} hint="Launch readiness" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Client Intake Details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            These values are used in the exported onboarding document.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Client / Business Name
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
                Contact Person
              </label>
              <input
                className="input mt-2"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Main client contact"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Website / Domain
              </label>
              <input
                className="input mt-2"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="example.com"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Industry
                </label>
                <select
                  className="input mt-2"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  {INDUSTRIES.map((item) => (
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
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Engagement Setup</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Confirm the package and timeline before the assessment starts.
          </p>

          <div className="mt-5 space-y-4">
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
                Delivery Timeline
              </label>
              <input
                className="input mt-2"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="3-5 business days"
              />
            </div>

            <div className="rounded-3xl border border-brand-500/30 bg-brand-500/10 p-5 text-center">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-brand-300">
                Launch Readiness
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {stats.ready}/{stats.total}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Checklist items currently marked ready.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-xl shadow-black/10"
          >
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500/15 text-sm font-black text-brand-300">
              {index + 1}
            </div>

            <h2 className="text-base font-black text-white">{step.title}</h2>
            <p className="mt-2 min-h-24 text-sm leading-6 text-slate-400">{step.text}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <CyberStatusBadge value={step.status} />
              <CyberStatusBadge value={step.owner} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs font-semibold leading-5 text-slate-400">
              {step.outcome}
            </div>
          </div>
        ))}
      </section>

      <CyberTable
        title="Onboarding Checklist"
        description="Client-ready checklist for assessment launch readiness."
        data={CHECKLIST}
        emptyText="No onboarding checklist items."
        columns={[
          {
            key: "item",
            label: "Checklist Item",
            render: (row) => (
              <div className="mx-auto min-w-80 text-center font-semibold text-white">
                {row.item}
              </div>
            ),
          },
          {
            key: "owner",
            label: "Owner",
            render: (row) => (
              <div className="mx-auto min-w-52 text-center text-sm font-semibold text-slate-300">
                {row.owner}
              </div>
            ),
          },
          {
            key: "priority",
            label: "Priority",
            render: (row) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={row.priority} />
              </div>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={row.status} />
              </div>
            ),
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Onboarding Standard</h2>

        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          A client should not start assessment until the business contact, asset list,
          package, scope, deliverables, and timeline are clearly agreed. This avoids confusion
          and makes the final report easier to approve.
        </p>

        <div className="mx-auto mt-5 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Clear Scope</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              Define what will be scanned and delivered.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Client Approval</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              Confirm package and timeline before starting.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Clean Handover</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              Export intake details for client records.
            </div>
          </div>
        </div>
      </section>

      <section
        id="onboarding-print-area"
        className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full"
      >
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white">
          <div className="text-2xl font-black">CyberShield360 By Mujtaba</div>
          <div className="mt-1 text-sm text-teal-300">Client Onboarding Summary</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-bold">Client</div>
            <div>{clientName}</div>
          </div>
          <div>
            <div className="font-bold">Contact Person</div>
            <div>{contactName}</div>
          </div>
          <div>
            <div className="font-bold">Website / Domain</div>
            <div>{website}</div>
          </div>
          <div>
            <div className="font-bold">Industry</div>
            <div>{industry}</div>
          </div>
          <div>
            <div className="font-bold">Selected Package</div>
            <div>{selectedPackage}</div>
          </div>
          <div>
            <div className="font-bold">Timeline</div>
            <div>{timeline}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3 text-center text-sm">
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Steps</div>
            <div>{STEPS.length}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Checklist</div>
            <div>{CHECKLIST.length}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Ready</div>
            <div>{stats.ready}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Approval</div>
            <div>{stats.approval}</div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-teal-500 text-white">
              <th className="border border-slate-200 p-2 text-center">Checklist Item</th>
              <th className="border border-slate-200 p-2 text-center">Owner</th>
              <th className="border border-slate-200 p-2 text-center">Priority</th>
              <th className="border border-slate-200 p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {CHECKLIST.map((item) => (
              <tr key={item.item}>
                <td className="border border-slate-200 p-2 text-center font-semibold">{item.item}</td>
                <td className="border border-slate-200 p-2 text-center">{item.owner}</td>
                <td className="border border-slate-200 p-2 text-center">{item.priority}</td>
                <td className="border border-slate-200 p-2 text-center">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          Next Step: Confirm approval items, add final assets, run the assessment, and prepare the executive report.
        </div>

        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Confidential Onboarding Summary - CyberShield360 By Mujtaba
        </div>
      </section>
    </div>
  );
}
