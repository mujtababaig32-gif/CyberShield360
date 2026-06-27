import { useEffect, useMemo, useState } from "react";
import { AssetApi } from "../api/endpoints";
import type { Asset } from "../types";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type ReportSection = {
  section: string;
  purpose: string;
  audience: string;
  priority: "Core" | "Important" | "Handover";
};

const REPORT_SECTIONS: ReportSection[] = [
  {
    section: "Executive Summary",
    purpose: "Board-level overview of score, risk, and action required.",
    audience: "Business Owner",
    priority: "Core",
  },
  {
    section: "Security Score",
    purpose: "Shows current posture and grade in simple language.",
    audience: "Management",
    priority: "Core",
  },
  {
    section: "What This Means",
    purpose: "Explains technical findings without jargon.",
    audience: "Non-Technical Client",
    priority: "Core",
  },
  {
    section: "Business Impact",
    purpose: "Connects each issue to trust, fraud, downtime, or compliance risk.",
    audience: "Business Owner",
    priority: "Core",
  },
  {
    section: "Recommended Fix",
    purpose: "Clear next action for each issue.",
    audience: "IT / Web Team",
    priority: "Core",
  },
  {
    section: "Difficulty Level",
    purpose: "Shows how hard the fix is to complete.",
    audience: "Project Owner",
    priority: "Important",
  },
  {
    section: "Who Should Fix It",
    purpose: "Assigns the likely responsible person or team.",
    audience: "Client Team",
    priority: "Important",
  },
  {
    section: "Before / After Score",
    purpose: "Shows improvement after remediation.",
    audience: "Management",
    priority: "Important",
  },
  {
    section: "Fix Status",
    purpose: "Tracks planned, approved, in-progress, or completed fixes.",
    audience: "Project Owner",
    priority: "Handover",
  },
  {
    section: "Training Required",
    purpose: "Highlights whether the team needs awareness training.",
    audience: "Client Success",
    priority: "Handover",
  },
];

const DELIVERY_STEPS = [
  {
    title: "Scan Evidence",
    detail: "Use latest full posture scan results as the source of truth.",
    status: "Required",
  },
  {
    title: "Executive Summary",
    detail: "Translate findings into score, grade, business risk, and next action.",
    status: "Included",
  },
  {
    title: "Remediation Plan",
    detail: "Show issue owner, business impact, fix guidance, and training need.",
    status: "Included",
  },
  {
    title: "Client Handover",
    detail: "Provide PDF for decision makers and Excel for implementation teams.",
    status: "Ready",
  },
];

function priorityTone(priority: string) {
  if (priority === "Core") return "Ready";
  if (priority === "Important") return "In Review";
  return "Handover";
}

function assetLabel(asset: Asset) {
  const score =
    asset.latestScore !== undefined && asset.latestScore !== null
      ? ` • ${asset.latestScore}/100`
      : "";

  const grade = asset.latestGrade ? ` • Grade ${asset.latestGrade}` : "";

  return `${asset.domain}${score}${grade}`;
}

export default function ReportBuilder() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"pdf" | "xlsx" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  const reportReadyAssets = useMemo(
    () => assets.filter((asset) => Boolean(asset.latestScanId)),
    [assets]
  );

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await AssetApi.list();
      setAssets(result);

      const firstReportReady = result.find((asset) => asset.latestScanId);
      const firstAsset = firstReportReady ?? result[0];

      setSelectedAssetId((current) => {
        if (current && result.some((asset) => asset.id === current)) return current;
        return firstAsset?.id ?? "";
      });
    } catch {
      setError("Failed to load report assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const downloadReport = async (format: "pdf" | "xlsx") => {
    if (!selectedAsset) {
      setError("Select an asset first.");
      return;
    }

    if (!selectedAsset.latestScanId) {
      setError("Run a Full Posture scan first before downloading a client report.");
      return;
    }

    try {
      setDownloading(format);
      setError(null);
      setMsg(`Preparing ${format === "pdf" ? "PDF" : "Excel"} report...`);

      await AssetApi.downloadReport(selectedAsset.id, format);

      setMsg(`${format === "pdf" ? "PDF" : "Excel"} report downloaded successfully.`);
    } catch {
      setError(
        `${format === "pdf" ? "PDF" : "Excel"} download failed. Run a Full Posture scan first, then try again.`
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Deal Desk
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Report Builder
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Build client-ready reports that explain technical findings in simple business language.
              Reports show what is wrong, why it matters, how to fix it, who should fix it,
              and what the next service step should be.
            </p>
          </div>

          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-4 xl:max-w-md">
            <div className="mb-3">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Report Asset
              </label>

              <select
                className="input mt-2"
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                disabled={loading || assets.length === 0}
              >
                {assets.length === 0 ? (
                  <option value="">No assets available</option>
                ) : (
                  assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {assetLabel(asset)}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => downloadReport("pdf")}
                disabled={loading || downloading !== null || !selectedAsset?.latestScanId}
                className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading === "pdf" ? "Downloading..." : "Download PDF"}
              </button>

              <button
                onClick={() => downloadReport("xlsx")}
                disabled={loading || downloading !== null || !selectedAsset?.latestScanId}
                className="btn-ghost justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                {downloading === "xlsx" ? "Downloading..." : "Download Excel"}
              </button>
            </div>

            <div className="mt-3 text-center text-xs leading-5 text-slate-500">
              {selectedAsset?.latestScanId
                ? "Latest Full Posture report is ready for export."
                : "Run a Full Posture scan to enable downloads."}
            </div>
          </div>
        </div>
      </section>

      {msg && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-semibold text-brand-300">
          {msg}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard
          label="Report Sections"
          value={REPORT_SECTIONS.length}
          hint="Client-ready format"
          tone="brand"
        />
        <CyberStatCard
          label="Ready Assets"
          value={reportReadyAssets.length}
          hint="Latest scan available"
          tone="green"
        />
        <CyberStatCard
          label="Export Formats"
          value="PDF + Excel"
          hint="Board and technical handover"
          tone="orange"
        />
        <CyberStatCard
          label="Client Language"
          value="Simple"
          hint="Business-friendly report"
          tone="brand"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">Selected Report</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use this panel to confirm the selected asset before exporting the client report.
              </p>
            </div>

            <CyberStatusBadge value={selectedAsset?.latestScanId ? "Ready" : "Scan Required"} />
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Domain
              </div>
              <div className="mt-1 break-all text-lg font-black text-white">
                {selectedAsset?.domain ?? "No asset selected"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Score
                </div>
                <div className="mt-1 text-2xl font-black text-brand-300">
                  {selectedAsset?.latestScore ?? "-"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Grade
                </div>
                <div className="mt-1 text-2xl font-black text-white">
                  {selectedAsset?.latestGrade ?? "-"}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Scan
                </div>
                <div className="mt-2">
                  <CyberStatusBadge value={selectedAsset?.latestScanId ? "Available" : "Missing"} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm leading-6 text-slate-400">
              Last scanned:{" "}
              <span className="font-semibold text-white">
                {selectedAsset?.lastScannedUtc
                  ? new Date(selectedAsset.lastScannedUtc).toLocaleString()
                  : "Never"}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
          <h2 className="text-xl font-black text-white">Delivery Standard</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Every client report should move from evidence to business decision to clear implementation.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {DELIVERY_STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-white">{step.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">{step.detail}</div>
                  </div>

                  <CyberStatusBadge value={step.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CyberTable
        title="Client Report Structure"
        description="Recommended report sections for a professional non-technical security assessment."
        data={REPORT_SECTIONS}
        emptyText="No report sections available."
        columns={[
          {
            key: "section",
            label: "Section",
            render: (row) => (
              <div className="mx-auto min-w-72 text-center font-semibold text-white">
                {row.section}
              </div>
            ),
          },
          {
            key: "purpose",
            label: "Purpose",
            render: (row) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                {row.purpose}
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
            key: "priority",
            label: "Priority",
            render: (row) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={priorityTone(row.priority)} />
              </div>
            ),
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Client Report Purpose</h2>

        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          A non-technical client should be able to read the report and understand
          the problem, the business risk, the recommended action, the responsible owner,
          and the next service step without needing cybersecurity expertise.
        </p>

        <div className="mx-auto mt-5 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Business Clarity</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              Explains risk in client-friendly language.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Action Ownership</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              Connects each issue to the right fixing owner.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-sm font-black text-white">Handover Ready</div>
            <div className="mt-2 text-xs leading-5 text-slate-500">
              PDF for leadership and Excel for implementation.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}