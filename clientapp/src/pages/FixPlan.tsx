import { useMemo, useState } from "react";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type FixItem = {
  issue: string;
  meaning: string;
  impact: string;
  fix: string;
  difficulty: "Low" | "Medium" | "High";
  owner: string;
  status: "Planned" | "Ready" | "Needs Approval" | "In Progress" | "Completed";
  priority: "Critical" | "High" | "Medium" | "Low";
  training: "Yes" | "No";
  eta: string;
};

const FIX_ITEMS: FixItem[] = [
  {
    issue: "Missing DMARC Record",
    meaning: "Your email domain has weaker protection against spoofed messages.",
    impact: "Email spoofing risk, lower domain trust, and possible customer fraud attempts.",
    fix: "Add a DMARC DNS record in monitoring mode, review reports, then move toward quarantine/reject.",
    difficulty: "Medium",
    owner: "Domain / IT Admin",
    status: "Planned",
    priority: "High",
    training: "Yes",
    eta: "1-2 days",
  },
  {
    issue: "Weak Security Headers",
    meaning: "The website is missing browser protections that reduce common web risks.",
    impact: "Browser-side protection gaps and weaker protection against common web attacks.",
    fix: "Add recommended HTTP security headers including CSP, HSTS, X-Frame-Options, and X-Content-Type-Options.",
    difficulty: "Low",
    owner: "Web Developer",
    status: "Ready",
    priority: "Medium",
    training: "No",
    eta: "Same day",
  },
  {
    issue: "Public Admin Panel",
    meaning: "The admin login is visible publicly and may be targeted by attackers.",
    impact: "Higher brute-force risk, account takeover exposure, and increased attack surface.",
    fix: "Restrict access, enable MFA, add rate limiting, and harden login controls.",
    difficulty: "High",
    owner: "Website Admin",
    status: "Needs Approval",
    priority: "Critical",
    training: "Yes",
    eta: "2-5 days",
  },
];

const DELIVERY_STEPS = [
  {
    title: "Confirm Scope",
    detail: "Review critical and high-priority issues with the client before implementation.",
    status: "Required",
  },
  {
    title: "Apply Fixes",
    detail: "Complete approved fixes with the assigned owner and update the fix status.",
    status: "Next",
  },
  {
    title: "Rescan Asset",
    detail: "Run a fresh Full Posture scan to verify improvements and capture evidence.",
    status: "Verification",
  },
  {
    title: "Final Handover",
    detail: "Deliver before/after score comparison, final report, and owner guidance.",
    status: "Ready",
  },
];

const FILTERS = ["All", "Critical", "High", "Medium", "Low"] as const;
type FilterValue = (typeof FILTERS)[number];

function moneySafeText(value: string) {
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

function statusTone(status: string) {
  if (status === "Completed" || status === "Ready") return "Ready";
  if (status === "Needs Approval") return "Needs Approval";
  if (status === "In Progress") return "In Progress";
  return status;
}

export default function FixPlan() {
  const [filter, setFilter] = useState<FilterValue>("All");
  const [clientName, setClientName] = useState("Acme Corp");
  const [assetName, setAssetName] = useState("onestream.live");
  const [msg, setMsg] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (filter === "All") return FIX_ITEMS;
    return FIX_ITEMS.filter((item) => item.priority === filter);
  }, [filter]);

  const ready = FIX_ITEMS.filter((item) => item.status === "Ready").length;
  const approval = FIX_ITEMS.filter((item) => item.status.includes("Approval")).length;
  const highPriority = FIX_ITEMS.filter((item) => ["Critical", "High"].includes(item.priority)).length;
  const trainingRequired = FIX_ITEMS.filter((item) => item.training === "Yes").length;

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 By Mujtaba - Fix Plan"],
      [],
      ["Client", clientName],
      ["Asset", assetName],
      ["Generated", new Date().toLocaleString()],
      [],
      [
        "Priority",
        "Issue",
        "What This Means",
        "Business Impact",
        "Recommended Fix",
        "Difficulty",
        "Owner",
        "Status",
        "Training Required",
        "ETA",
      ],
      ...FIX_ITEMS.map((item) => [
        item.priority,
        item.issue,
        item.meaning,
        item.impact,
        item.fix,
        item.difficulty,
        item.owner,
        item.status,
        item.training,
        item.eta,
      ]),
    ];

    const htmlRows = rows
      .map(
        (row) =>
          `<tr>${row
            .map(
              (cell) =>
                `<td style="border:1px solid #d9e2ec;padding:10px;text-align:center;vertical-align:middle;">${moneySafeText(
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
      `cybershield360-fix-plan-${assetName.replace(/ /g, "-").replace(/\./g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );

    setMsg("Excel fix plan downloaded.");
  };

  const exportPdf = () => {
    setMsg("Print dialog opened. Choose Save as PDF to download the fix plan.");
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

            #fix-plan-print-area,
            #fix-plan-print-area * {
              visibility: visible;
            }

            #fix-plan-print-area {
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
              Remediation Workflow
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Fix Plan
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Convert scan findings into a clear remediation workflow: what the issue means,
              why it matters, how to fix it, who should fix it, the expected difficulty,
              and the current status.
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
        <CyberStatCard label="Fix Items" value={FIX_ITEMS.length} hint="Current plan" tone="brand" />
        <CyberStatCard label="Ready" value={ready} hint="Can start now" tone="green" />
        <CyberStatCard label="Need Approval" value={approval} hint="Client decision" tone="orange" />
        <CyberStatCard label="High Priority" value={highPriority} hint="Critical/high fixes" tone="red" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Plan Details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            These details are used in the exported fix plan.
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
                Asset / Domain
              </label>
              <input
                className="input mt-2"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="example.com"
              />
            </div>

            <div className="rounded-3xl border border-brand-500/30 bg-brand-500/10 p-5 text-center">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-brand-300">
                Training Required
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {trainingRequired}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Items require client handover guidance.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Delivery Steps</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use these stages to move from client approval to verified improvement.
              </p>
            </div>

            <CyberStatusBadge value="Client Ready" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {DELIVERY_STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-white">{step.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">
                      {step.detail}
                    </div>
                  </div>

                  <CyberStatusBadge value={step.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Priority Filter</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter remediation items by priority before reviewing or exporting.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={item === filter ? "btn-primary" : "btn-ghost"}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <CyberTable
        title="Remediation Plan"
        description="Client-friendly fix plan with issue explanation, business impact, owner, difficulty, training requirement, and status."
        data={filteredItems}
        emptyText="No fix items match this filter."
        columns={[
          {
            key: "issue",
            label: "Issue",
            render: (item) => (
              <div className="mx-auto min-w-80 text-center">
                <div className="font-semibold leading-6 text-white">{item.issue}</div>
                <div className="mt-1 text-xs leading-5 text-slate-500">{item.meaning}</div>
              </div>
            ),
          },
          {
            key: "impact",
            label: "Business Impact",
            render: (item) => (
              <div className="mx-auto min-w-72 text-center text-sm leading-6 text-slate-400">
                {item.impact}
              </div>
            ),
          },
          {
            key: "fix",
            label: "Recommended Fix",
            render: (item) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                {item.fix}
              </div>
            ),
          },
          {
            key: "difficulty",
            label: "Difficulty",
            render: (item) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={item.difficulty} />
              </div>
            ),
          },
          {
            key: "owner",
            label: "Who Should Fix It",
            render: (item) => (
              <div className="mx-auto min-w-52 text-center text-sm font-semibold text-slate-300">
                {item.owner}
              </div>
            ),
          },
          {
            key: "priority",
            label: "Priority",
            render: (item) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={item.priority} />
              </div>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (item) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={statusTone(item.status)} />
              </div>
            ),
          },
          {
            key: "training",
            label: "Training",
            render: (item) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={item.training} />
              </div>
            ),
          },
          {
            key: "eta",
            label: "ETA",
            render: (item) => (
              <div className="mx-auto min-w-28 text-center text-sm font-semibold text-slate-300">
                {item.eta}
              </div>
            ),
          },
        ]}
      />

      <section
        id="fix-plan-print-area"
        className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full"
      >
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white">
          <div className="text-2xl font-black">CyberShield360 By Mujtaba</div>
          <div className="mt-1 text-sm text-teal-300">Client Remediation Fix Plan</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-bold">Client</div>
            <div>{clientName}</div>
          </div>
          <div>
            <div className="font-bold">Asset / Domain</div>
            <div>{assetName}</div>
          </div>
          <div>
            <div className="font-bold">Fix Items</div>
            <div>{FIX_ITEMS.length}</div>
          </div>
          <div>
            <div className="font-bold">Generated</div>
            <div>{new Date().toLocaleString()}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3 text-center text-sm">
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Ready</div>
            <div>{ready}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Need Approval</div>
            <div>{approval}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">High Priority</div>
            <div>{highPriority}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Training</div>
            <div>{trainingRequired}</div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-teal-500 text-white">
              <th className="border border-slate-200 p-2 text-center">Priority</th>
              <th className="border border-slate-200 p-2 text-center">Issue</th>
              <th className="border border-slate-200 p-2 text-center">Business Impact</th>
              <th className="border border-slate-200 p-2 text-center">Recommended Fix</th>
              <th className="border border-slate-200 p-2 text-center">Owner</th>
              <th className="border border-slate-200 p-2 text-center">Status</th>
              <th className="border border-slate-200 p-2 text-center">ETA</th>
            </tr>
          </thead>
          <tbody>
            {FIX_ITEMS.map((item) => (
              <tr key={item.issue}>
                <td className="border border-slate-200 p-2 text-center font-semibold">{item.priority}</td>
                <td className="border border-slate-200 p-2 text-center">{item.issue}</td>
                <td className="border border-slate-200 p-2 text-center">{item.impact}</td>
                <td className="border border-slate-200 p-2 text-center">{item.fix}</td>
                <td className="border border-slate-200 p-2 text-center">{item.owner}</td>
                <td className="border border-slate-200 p-2 text-center">{item.status}</td>
                <td className="border border-slate-200 p-2 text-center">{item.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          Next Step: Approve high-priority fixes, apply changes, rescan the asset, and deliver the final before/after report.
        </div>

        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Confidential Fix Plan - CyberShield360 By Mujtaba
        </div>
      </section>
    </div>
  );
}
