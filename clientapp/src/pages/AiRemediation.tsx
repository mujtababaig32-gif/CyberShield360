import { useEffect, useMemo, useState } from "react";
import { AiRemediationApi, AssetApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import type {
  AiRemediationAction,
  AiRemediationAssetSummary,
  AiRemediationPlan,
  AiRemediationSummary,
} from "../types";

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not generated";
}

function riskTone(count: number): "green" | "orange" | "red" {
  if (count <= 0) return "green";
  if (count <= 3) return "orange";
  return "red";
}

function scoreTone(score: number): "green" | "orange" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "orange";
  return "red";
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AiRemediation() {
  const [summary, setSummary] = useState<AiRemediationSummary | null>(null);
  const [selectedScanId, setSelectedScanId] = useState("");
  const [plan, setPlan] = useState<AiRemediationPlan | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assets = summary?.assets ?? [];

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;

    return assets.filter((asset) =>
      `${asset.domain} ${asset.grade} ${asset.guidanceStatus} ${asset.guidanceProvider ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [assets, search]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.scanId === selectedScanId) ?? null,
    [assets, selectedScanId]
  );

  const loadPlan = async (scanId: string) => {
    if (!scanId) {
      setPlan(null);
      return;
    }

    try {
      setWorking(true);
      setError(null);
      setSelectedScanId(scanId);
      const result = await AiRemediationApi.getForScan(scanId);
      setPlan(result);
    } catch {
      setPlan(null);
      setError("Failed to load AI remediation guidance for this scan.");
    } finally {
      setWorking(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const result = await AiRemediationApi.summary();
      setSummary(result);

      const firstScanId = selectedScanId || result.assets[0]?.scanId || "";
      if (firstScanId) {
        await loadPlan(firstScanId);
      } else {
        setSelectedScanId("");
        setPlan(null);
      }
    } catch {
      setError("Failed to load AI Remediation. Run a Full Posture scan first, then refresh this page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    if (!selectedScanId) {
      setError("Select a scanned asset first.");
      return;
    }

    try {
      setWorking(true);
      setError(null);
      setMessage("Generating remediation guidance from real scan findings...");

      const result = await AiRemediationApi.generateForScan(selectedScanId);
      setPlan(result);
      setMessage(`Guidance generated using ${result.provider}.`);

      const refreshed = await AiRemediationApi.summary();
      setSummary(refreshed);
    } catch {
      setError("Failed to generate remediation guidance. Check backend logs and OpenAI configuration.");
    } finally {
      setWorking(false);
    }
  };

  const download = async (format: "pdf" | "xlsx") => {
    if (!selectedAsset?.assetId) {
      setError("Select an asset first.");
      return;
    }

    try {
      setWorking(true);
      setError(null);
      setMessage(`Downloading latest full posture ${format.toUpperCase()} report...`);
      await AssetApi.downloadReport(selectedAsset.assetId, format);
      setMessage(`${format.toUpperCase()} report downloaded.`);
    } catch {
      setError(`Failed to download ${format.toUpperCase()} report. Run a Full Posture scan first.`);
    } finally {
      setWorking(false);
    }
  };

  const exportPlan = () => {
    if (!plan || plan.actions.length === 0) return;

    downloadCsv("cybershield360-ai-remediation-plan.csv", [
      [
        "Domain",
        "Score",
        "Grade",
        "Provider",
        "Finding",
        "Severity",
        "Priority",
        "Issue",
        "Business Impact",
        "Recommended Fix",
        "Owner",
        "Difficulty",
        "Verification",
        "Estimated Hours",
      ],
      ...plan.actions.map((action) => [
        plan.domain,
        plan.score,
        plan.grade,
        plan.provider,
        action.findingTitle,
        action.severity,
        action.priority,
        action.plainEnglishIssue,
        action.businessImpact,
        action.recommendedFix,
        action.owner,
        action.difficulty,
        action.verificationStep,
        action.estimatedEffortHours,
      ]),
    ]);
  };

  const actionRows = plan?.actions ?? [];
  const generated = plan?.status === "Generated" && actionRows.length > 0;

  if (loading && !summary) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400 shadow-2xl shadow-black/10">
        Loading AI Remediation...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Control Room
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              AI Remediation
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Generate client-ready remediation guidance from real CyberShield360 scan findings.
              The AI advisor explains the issue, business impact, owner, fix difficulty, and verification steps.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} disabled={loading || working} className="btn-ghost">
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" onClick={exportPlan} disabled={!generated} className="btn-ghost disabled:opacity-50">
              Export Plan
            </button>
            <button type="button" onClick={generate} disabled={!selectedScanId || working} className="btn-primary disabled:opacity-50">
              {working ? "Working..." : generated ? "Regenerate Guidance" : "Generate Guidance"}
            </button>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-semibold text-brand-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Scanned Assets" value={summary?.scannedAssets ?? 0} hint="Latest full posture scans" tone="brand" />
        <CyberStatCard label="Need Remediation" value={summary?.assetsNeedingRemediation ?? 0} hint="Assets with failed findings" tone={riskTone(summary?.assetsNeedingRemediation ?? 0)} />
        <CyberStatCard label="High/Critical" value={summary?.highCriticalFindings ?? 0} hint="Priority findings" tone={riskTone(summary?.highCriticalFindings ?? 0)} />
        <CyberStatCard label="Guidance Saved" value={summary?.guidanceGenerated ?? 0} hint="Generated remediation plans" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-4">
            <h2 className="text-lg font-black text-white">Scanned Assets</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Select an asset with a completed Full Posture scan.
            </p>
            <input
              className="input mt-4"
              placeholder="Search assets..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {filteredAssets.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-slate-500">
                No scanned assets found. Run a Full Posture scan first.
              </div>
            ) : (
              filteredAssets.map((asset: AiRemediationAssetSummary) => {
                const active = asset.scanId === selectedScanId;

                return (
                  <button
                    key={asset.scanId}
                    type="button"
                    onClick={() => loadPlan(asset.scanId)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-brand-500/50 bg-brand-500/10 shadow-lg shadow-brand-950/20"
                        : "border-white/10 bg-white/[0.03] hover:border-brand-500/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-all font-black text-white">{asset.domain}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Last scan: {dateText(asset.lastScanUtc)}
                        </div>
                      </div>
                      <CyberStatusBadge value={asset.guidanceGenerated ? "Guidance Saved" : "Not Generated"} />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-xl border border-white/10 bg-slate-950/40 px-2 py-2">
                        <div className="text-slate-500">Score</div>
                        <div className="mt-1 font-black text-white">{asset.score}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-950/40 px-2 py-2">
                        <div className="text-slate-500">Grade</div>
                        <div className="mt-1 font-black text-white">{asset.grade}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-slate-950/40 px-2 py-2">
                        <div className="text-slate-500">Failed</div>
                        <div className="mt-1 font-black text-white">{asset.failedFindings}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          {!plan ? (
            <div className="flex min-h-80 items-center justify-center text-center text-sm text-slate-500">
              Select a scanned asset to view or generate remediation guidance.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-brand-300">
                  {plan.provider}
                </div>
                <h2 className="mt-2 break-all text-2xl font-black text-white">{plan.domain}</h2>
                <p className="mx-auto mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                  {plan.executiveSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <CyberStatCard label="Score" value={`${plan.score}/100`} hint="Selected scan" tone={scoreTone(plan.score)} />
                <CyberStatCard label="Grade" value={plan.grade} hint="Posture grade" tone={plan.grade === "A" || plan.grade === "B" ? "green" : plan.grade === "C" ? "orange" : "red"} />
                <CyberStatCard label="Failed" value={plan.failedFindings} hint="Failed controls" tone={riskTone(plan.failedFindings)} />
                <CyberStatCard label="High/Critical" value={plan.highCriticalFindings} hint="Priority issues" tone={riskTone(plan.highCriticalFindings)} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Business Impact
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-300">{plan.businessImpact}</p>
                <div className="mt-3 text-xs text-slate-500">
                  Generated: {dateText(plan.generatedUtc)}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => download("pdf")} disabled={!selectedAsset || working} className="btn-primary disabled:opacity-50">
                  Download PDF
                </button>
                <button type="button" onClick={() => download("xlsx")} disabled={!selectedAsset || working} className="btn-ghost disabled:opacity-50">
                  Download Excel
                </button>
              </div>
            </div>
          )}
        </section>
      </section>

      {plan && (
        <CyberTable
          title="AI Remediation Actions"
          description="Saved remediation guidance generated from real failed scan findings."
          data={actionRows}
          emptyText="No saved actions yet. Click Generate Guidance to create a remediation plan."
          columns={[
            {
              key: "priority",
              label: "Priority",
              render: (action: AiRemediationAction) => <CyberStatusBadge value={action.priority} />,
            },
            {
              key: "finding",
              label: "Finding",
              render: (action: AiRemediationAction) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold leading-6 text-white">{action.findingTitle}</div>
                  <div className="mt-1 text-xs text-slate-500">{action.plainEnglishIssue}</div>
                </div>
              ),
            },
            {
              key: "impact",
              label: "Business Impact",
              render: (action: AiRemediationAction) => (
                <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">
                  {action.businessImpact}
                </div>
              ),
            },
            {
              key: "fix",
              label: "Recommended Fix",
              render: (action: AiRemediationAction) => (
                <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                  {action.recommendedFix}
                </div>
              ),
            },
            {
              key: "owner",
              label: "Owner",
              render: (action: AiRemediationAction) => (
                <div className="mx-auto min-w-44 text-center text-slate-300">{action.owner}</div>
              ),
            },
            {
              key: "difficulty",
              label: "Difficulty",
              render: (action: AiRemediationAction) => <CyberStatusBadge value={action.difficulty} />,
            },
            {
              key: "verify",
              label: "Verification",
              render: (action: AiRemediationAction) => (
                <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">
                  {action.verificationStep}
                </div>
              ),
            },
          ]}
        />
      )}

      {plan && plan.verificationSteps.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">Verification Checklist</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Use these steps after remediation to prove that the issue has been resolved.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {plan.verificationSteps.map((step, index) => (
              <div key={`${step}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm leading-6 text-slate-300">
                <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-brand-300">
                  Step #{index + 1}
                </div>
                {step}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
