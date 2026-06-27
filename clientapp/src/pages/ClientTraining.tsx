import { useMemo, useState } from "react";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type TrainingTopic = {
  topic: string;
  audience: string;
  outcome: string;
  priority: "Core" | "Recommended" | "Handover";
  duration: string;
};

const TRAINING_TOPICS: TrainingTopic[] = [
  {
    topic: "Basic cybersecurity awareness",
    audience: "All Staff",
    outcome: "Understand common security risks and daily safe behavior.",
    priority: "Core",
    duration: "20 min",
  },
  {
    topic: "Phishing and fake email detection",
    audience: "All Staff",
    outcome: "Report suspicious messages faster and avoid credential theft.",
    priority: "Core",
    duration: "25 min",
  },
  {
    topic: "Password safety and MFA",
    audience: "All Staff",
    outcome: "Reduce account takeover risk through stronger login hygiene.",
    priority: "Core",
    duration: "20 min",
  },
  {
    topic: "Email spoofing and DMARC awareness",
    audience: "Managers / IT",
    outcome: "Understand email impersonation risk and domain trust controls.",
    priority: "Recommended",
    duration: "20 min",
  },
  {
    topic: "Website admin safety",
    audience: "Website Owners",
    outcome: "Avoid admin-panel exposure, weak login controls, and repeated mistakes.",
    priority: "Recommended",
    duration: "25 min",
  },
  {
    topic: "How to read CyberShield360 reports",
    audience: "Business Owners",
    outcome: "Understand score, grade, risk, business impact, and fix priorities.",
    priority: "Handover",
    duration: "20 min",
  },
  {
    topic: "What to do when a new risk appears",
    audience: "IT / Operations",
    outcome: "Follow clear response steps and know when to escalate.",
    priority: "Handover",
    duration: "20 min",
  },
  {
    topic: "How to avoid repeating fixed issues",
    audience: "Client Team",
    outcome: "Maintain the improved security posture after remediation.",
    priority: "Handover",
    duration: "20 min",
  },
];

const TRAINING_STEPS = [
  {
    title: "Explain the Report",
    detail: "Walk the client through score, grade, failed checks, and business impact.",
    status: "Required",
  },
  {
    title: "Train the Team",
    detail: "Cover practical security behavior for staff, owners, and IT teams.",
    status: "Included",
  },
  {
    title: "Confirm Owners",
    detail: "Make sure every fix has a responsible person or team.",
    status: "Handover",
  },
  {
    title: "Reduce Repeat Issues",
    detail: "Give clear guidance to prevent the same findings from returning.",
    status: "Outcome",
  },
];

const AUDIENCE_FILTERS = ["All", "All Staff", "Managers / IT", "Website Owners", "Business Owners", "IT / Operations", "Client Team"] as const;
type AudienceFilter = (typeof AUDIENCE_FILTERS)[number];

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

export default function ClientTraining() {
  const [clientName, setClientName] = useState("Acme Corp");
  const [sessionTitle, setSessionTitle] = useState("CyberShield360 Security Awareness Handover");
  const [attendees, setAttendees] = useState("10");
  const [trainingFee, setTrainingFee] = useState("15000");
  const [filter, setFilter] = useState<AudienceFilter>("All");
  const [msg, setMsg] = useState<string | null>(null);

  const filteredTopics = useMemo(() => {
    if (filter === "All") return TRAINING_TOPICS;
    return TRAINING_TOPICS.filter((topic) => topic.audience === filter);
  }, [filter]);

  const totals = useMemo(() => {
    const attendeeCount = safeNumber(attendees);
    const fee = safeNumber(trainingFee);

    return {
      attendeeCount,
      fee,
      perPerson: attendeeCount > 0 ? Math.round(fee / attendeeCount) : 0,
      coreTopics: TRAINING_TOPICS.filter((topic) => topic.priority === "Core").length,
      handoverTopics: TRAINING_TOPICS.filter((topic) => topic.priority === "Handover").length,
    };
  }, [attendees, trainingFee]);

  const exportExcel = () => {
    const rows = [
      ["CyberShield360 By Mujtaba - Client Training Plan"],
      [],
      ["Client", clientName],
      ["Session", sessionTitle],
      ["Attendees", totals.attendeeCount],
      ["Training Fee PKR", totals.fee],
      ["Estimated Cost Per Person PKR", totals.perPerson],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Priority", "Topic", "Audience", "Outcome", "Duration"],
      ...TRAINING_TOPICS.map((topic) => [
        topic.priority,
        topic.topic,
        topic.audience,
        topic.outcome,
        topic.duration,
      ]),
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
      `cybershield360-client-training-${clientName.replace(/ /g, "-").toLowerCase()}.xls`,
      html,
      "application/vnd.ms-excel;charset=utf-8"
    );

    setMsg("Excel training plan downloaded.");
  };

  const exportPdf = () => {
    setMsg("Print dialog opened. Choose Save as PDF to download the training plan.");
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

            #training-print-area,
            #training-print-area * {
              visibility: visible;
            }

            #training-print-area {
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
              Human Defense
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Client Training
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              CyberShield360 should not only deliver a report. It should help clients
              understand security risks, avoid repeated mistakes, and know what to do
              when a new issue appears.
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
        <CyberStatCard label="Training Topics" value={TRAINING_TOPICS.length} hint="Client-ready topics" tone="brand" />
        <CyberStatCard label="Core Topics" value={totals.coreTopics} hint="Staff essentials" tone="green" />
        <CyberStatCard label="Attendees" value={totals.attendeeCount} hint="Planned audience" tone="orange" />
        <CyberStatCard label="Training Fee" value={`PKR ${money(totals.fee)}`} hint="Editable estimate" tone="brand" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Session Details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            These details are used in the exported client training plan.
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
                Session Title
              </label>
              <input
                className="input mt-2"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Cybersecurity Awareness Session"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Attendees
                </label>
                <input
                  className="input mt-2"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
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
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Training Delivery</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                The training converts technical findings into practical actions for staff and owners.
              </p>
            </div>

            <CyberStatusBadge value="Client Ready" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {TRAINING_STEPS.map((step) => (
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
            <h2 className="text-lg font-black text-white">Audience Filter</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter training topics by the audience that needs the guidance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {AUDIENCE_FILTERS.map((item) => (
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
        title="Training Topics"
        description="Client-friendly training topics with audience, expected outcome, priority, and duration."
        data={filteredTopics}
        emptyText="No training topics match this audience."
        columns={[
          {
            key: "topic",
            label: "Topic",
            render: (row) => (
              <div className="mx-auto min-w-80 text-center font-semibold text-white">
                {row.topic}
              </div>
            ),
          },
          {
            key: "audience",
            label: "Audience",
            render: (row) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={row.audience} />
              </div>
            ),
          },
          {
            key: "outcome",
            label: "Outcome",
            render: (row) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                {row.outcome}
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
            key: "duration",
            label: "Duration",
            render: (row) => (
              <div className="mx-auto min-w-24 text-center text-sm font-semibold text-slate-300">
                {row.duration}
              </div>
            ),
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Training Promise</h2>

        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          We do not just give the client a report and leave. We explain the findings,
          train the team, and help them understand how to stay secure after the remediation
          work is completed.
        </p>

        <div className="mx-auto mt-5 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Clear Language</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              Simple explanations for non-technical teams.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Practical Behavior</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              Focused actions staff can follow daily.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Handover Ready</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              Training plan can be exported for client records.
            </div>
          </div>
        </div>
      </section>

      <section
        id="training-print-area"
        className="fixed -left-[9999px] top-0 w-[980px] bg-white p-8 text-slate-900 print:static print:left-auto print:w-full"
      >
        <div className="border-b-4 border-teal-500 bg-slate-950 p-6 text-white">
          <div className="text-2xl font-black">CyberShield360 By Mujtaba</div>
          <div className="mt-1 text-sm text-teal-300">Client Security Training Plan</div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-bold">Client</div>
            <div>{clientName}</div>
          </div>
          <div>
            <div className="font-bold">Session</div>
            <div>{sessionTitle}</div>
          </div>
          <div>
            <div className="font-bold">Attendees</div>
            <div>{totals.attendeeCount}</div>
          </div>
          <div>
            <div className="font-bold">Training Fee</div>
            <div>PKR {money(totals.fee)}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3 text-center text-sm">
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Topics</div>
            <div>{TRAINING_TOPICS.length}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Core</div>
            <div>{totals.coreTopics}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Handover</div>
            <div>{totals.handoverTopics}</div>
          </div>
          <div className="border border-slate-200 p-3">
            <div className="font-bold">Per Person</div>
            <div>PKR {money(totals.perPerson)}</div>
          </div>
        </div>

        <table className="mt-8 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-teal-500 text-white">
              <th className="border border-slate-200 p-2 text-center">Priority</th>
              <th className="border border-slate-200 p-2 text-center">Topic</th>
              <th className="border border-slate-200 p-2 text-center">Audience</th>
              <th className="border border-slate-200 p-2 text-center">Outcome</th>
              <th className="border border-slate-200 p-2 text-center">Duration</th>
            </tr>
          </thead>
          <tbody>
            {TRAINING_TOPICS.map((topic) => (
              <tr key={topic.topic}>
                <td className="border border-slate-200 p-2 text-center font-semibold">{topic.priority}</td>
                <td className="border border-slate-200 p-2 text-center">{topic.topic}</td>
                <td className="border border-slate-200 p-2 text-center">{topic.audience}</td>
                <td className="border border-slate-200 p-2 text-center">{topic.outcome}</td>
                <td className="border border-slate-200 p-2 text-center">{topic.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          Training Outcome: The client team understands the report, knows what to do next, and can avoid repeating the same issues.
        </div>

        <div className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Confidential Training Plan - CyberShield360 By Mujtaba
        </div>
      </section>
    </div>
  );
}
