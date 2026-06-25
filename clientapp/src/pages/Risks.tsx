import { useEffect, useMemo, useState } from "react";
import { RiskApi } from "../api/endpoints";
import type { Risk } from "../types";

const LIKELIHOOD_LABELS = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS = ["", "Insignificant", "Minor", "Moderate", "Major", "Severe"];
const STATUS_LABELS = ["Identified", "Assessed", "Mitigating", "Closed"];

const STATUS_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Identified", value: 0 },
  { label: "Assessed", value: 1 },
  { label: "Mitigating", value: 2 },
  { label: "Closed", value: 3 },
];

function riskColor(score: number) {
  if (score >= 20) return "#991b1b";
  if (score >= 15) return "#dc2626";
  if (score >= 9) return "#ea580c";
  if (score >= 4) return "#ca8a04";
  return "#16a34a";
}

function riskLabel(score: number) {
  if (score >= 20) return "Critical";
  if (score >= 15) return "High";
  if (score >= 9) return "Medium";
  if (score >= 4) return "Low";
  return "Minimal";
}

function statusLabel(status: string | number | undefined) {
  if (status === undefined || status === null) return "Identified";
  if (typeof status === "number") return STATUS_LABELS[status] ?? String(status);

  const parsed = Number(status);
  if (!Number.isNaN(parsed)) return STATUS_LABELS[parsed] ?? status;

  return status;
}

function enumNumber(value: string | number | undefined, labels: string[]) {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const parsed = Number(value);
  if (!Number.isNaN(parsed)) return parsed;

  return labels.findIndex((x) => x.toLowerCase() === value.toLowerCase());
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

export default function Risks() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [heatmap, setHeatmap] = useState<{ likelihood: number; impact: number; count: number }[]>([]);
  const [status, setStatus] = useState<string | number>("All");
  const [query, setQuery] = useState("");
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Operational",
    owner: "",
    likelihood: 3,
    impact: 3,
    mitigationPlan: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const [riskResult, heatmapResult] = await Promise.all([
        RiskApi.list({ status, page: 1, pageSize: 100 }),
        RiskApi.heatmap(),
      ]);

      setRisks(riskResult.items ?? []);
      setHeatmap(heatmapResult ?? []);
    } catch {
      setError("Failed to load risk register.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const filteredRisks = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return risks;

    return risks.filter((risk) => {
      return [
        risk.title,
        risk.category,
        risk.owner,
        statusLabel(risk.status),
        risk.mitigationPlan,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text));
    });
  }, [risks, query]);

  const summary = useMemo(() => {
    const openRisks = risks.filter((r) => statusLabel(r.status) !== "Closed");
    const critical = openRisks.filter((r) => r.inherentScore >= 20).length;
    const high = openRisks.filter((r) => r.inherentScore >= 15 && r.inherentScore < 20).length;
    const avgScore = openRisks.length
      ? Math.round(openRisks.reduce((sum, r) => sum + r.inherentScore, 0) / openRisks.length)
      : 0;

    return {
      total: risks.length,
      open: openRisks.length,
      critical,
      high,
      avgScore,
    };
  }, [risks]);

  const countAt = (likelihood: number, impact: number) => {
    return heatmap.find((cell) => cell.likelihood === likelihood && cell.impact === impact)?.count ?? 0;
  };

  const createRisk = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("Enter a risk title first.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage("Creating risk...");

      await RiskApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        owner: form.owner.trim() || undefined,
        likelihood: form.likelihood,
        impact: form.impact,
        mitigationPlan: form.mitigationPlan.trim() || undefined,
      });

      setForm({
        title: "",
        description: "",
        category: "Operational",
        owner: "",
        likelihood: 3,
        impact: 3,
        mitigationPlan: "",
      });

      setMessage("Risk created successfully.");
      await load();
    } catch {
      setError("Failed to create risk. Check required fields and permissions.");
    } finally {
      setSaving(false);
    }
  };

  const updateRisk = async (risk: Risk, newStatus: number) => {
    try {
      setMessage("Updating risk status...");
      setError(null);

      await RiskApi.update(risk.id, {
        status: newStatus,
        mitigationPlan: risk.mitigationPlan,
        residualScore: risk.residualScore ?? null,
      });

      setMessage("Risk status updated.");
      await load();
    } catch {
      setError("Failed to update risk status.");
    }
  };

  const exportRisks = () => {
    downloadCsv("cybershield360-risk-register.csv", [
      ["Title", "Category", "Likelihood", "Impact", "Inherent Score", "Risk Level", "Status", "Owner", "Residual Score", "Mitigation Plan"],
      ...filteredRisks.map((risk) => {
        const likelihood = enumNumber(risk.likelihood, LIKELIHOOD_LABELS);
        const impact = enumNumber(risk.impact, IMPACT_LABELS);

        return [
          risk.title,
          risk.category ?? "",
          LIKELIHOOD_LABELS[likelihood] ?? risk.likelihood ?? "",
          IMPACT_LABELS[impact] ?? risk.impact ?? "",
          risk.inherentScore,
          riskLabel(risk.inherentScore),
          statusLabel(risk.status),
          risk.owner ?? "",
          risk.residualScore ?? "",
          risk.mitigationPlan ?? "",
        ];
      }),
    ]);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            Governance, Risk & Compliance
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Risk Register
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Track risk ownership, likelihood, impact, mitigation activity, and residual exposure across your tenant.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={exportRisks} disabled={filteredRisks.length === 0} className="btn-primary">
            Export CSV
          </button>
        </div>
      </header>

      {message && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-600 dark:text-brand-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="metric-card">
          <div className="section-subtitle">Total Risks</div>
          <div className="mt-2 text-3xl font-black">{summary.total}</div>
        </div>
        <div className="metric-card">
          <div className="section-subtitle">Open Risks</div>
          <div className="mt-2 text-3xl font-black text-orange-500">{summary.open}</div>
        </div>
        <div className="metric-card">
          <div className="section-subtitle">Critical</div>
          <div className="mt-2 text-3xl font-black text-red-600">{summary.critical}</div>
        </div>
        <div className="metric-card">
          <div className="section-subtitle">High</div>
          <div className="mt-2 text-3xl font-black text-orange-500">{summary.high}</div>
        </div>
        <div className="metric-card">
          <div className="section-subtitle">Average Score</div>
          <div className="mt-2 text-3xl font-black" style={{ color: riskColor(summary.avgScore) }}>
            {summary.avgScore || "-"}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card">
          <div className="flex flex-col gap-1">
            <h2 className="section-title">Risk Heatmap</h2>
            <p className="section-subtitle">Likelihood × impact. Failed controls and business exposure should be reviewed from the red/orange zones first.</p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="border-separate border-spacing-2">
              <tbody>
                {[5, 4, 3, 2, 1].map((likelihood) => (
                  <tr key={likelihood}>
                    <td className="w-28 pr-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {LIKELIHOOD_LABELS[likelihood]}
                    </td>
                    {[1, 2, 3, 4, 5].map((impact) => {
                      const score = likelihood * impact;
                      const count = countAt(likelihood, impact);

                      return (
                        <td
                          key={impact}
                          className="h-16 w-20 rounded-2xl text-center align-middle text-sm font-black text-white shadow-sm"
                          style={{
                            background: riskColor(score),
                            opacity: count ? 1 : 0.28,
                          }}
                          title={`${LIKELIHOOD_LABELS[likelihood]} × ${IMPACT_LABELS[impact]} = ${score}`}
                        >
                          <div>{count || ""}</div>
                          <div className="text-[10px] font-semibold opacity-80">{count ? riskLabel(score) : ""}</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td />
                  {[1, 2, 3, 4, 5].map((impact) => (
                    <td key={impact} className="w-20 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {IMPACT_LABELS[impact]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={createRisk} className="card space-y-4">
          <div>
            <h2 className="section-title">Create Risk</h2>
            <p className="section-subtitle">Add a real risk with likelihood, impact, owner, and mitigation plan.</p>
          </div>

          <input
            className="input"
            placeholder="Risk title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />

          <textarea
            className="input min-h-24"
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className="input"
              placeholder="Category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
            <input
              className="input"
              placeholder="Owner"
              value={form.owner}
              onChange={(event) => setForm({ ...form, owner: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              className="input"
              value={form.likelihood}
              onChange={(event) => setForm({ ...form, likelihood: Number(event.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>{LIKELIHOOD_LABELS[value]}</option>
              ))}
            </select>

            <select
              className="input"
              value={form.impact}
              onChange={(event) => setForm({ ...form, impact: Number(event.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>{IMPACT_LABELS[value]}</option>
              ))}
            </select>
          </div>

          <textarea
            className="input min-h-24"
            placeholder="Mitigation plan"
            value={form.mitigationPlan}
            onChange={(event) => setForm({ ...form, mitigationPlan: event.target.value })}
          />

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/60">
            <span className="text-slate-500 dark:text-slate-400">Calculated inherent score:</span>{" "}
            <span className="font-black" style={{ color: riskColor(form.likelihood * form.impact) }}>
              {form.likelihood * form.impact} / {riskLabel(form.likelihood * form.impact)}
            </span>
          </div>

          <button disabled={saving} className="btn-primary w-full">
            {saving ? "Saving..." : "Create Risk"}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="section-title">Risk Register</h2>
            <p className="section-subtitle">{filteredRisks.length} visible risks from {risks.length} loaded records.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:min-w-[520px]">
            <input
              className="input"
              placeholder="Search risks, owners, category..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={String(option.value)} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">Loading risk register...</div>
        ) : filteredRisks.length === 0 ? (
          <div className="empty-state mt-6">
            <div className="text-lg font-bold">No risks found</div>
            <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Create a risk or adjust filters to view existing risk records.
            </p>
          </div>
        ) : (
          <div className="table-wrap mt-6">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRisks.map((risk) => (
                  <tr key={risk.id} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-950 dark:text-white">{risk.title}</div>
                      {risk.mitigationPlan && (
                        <div className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                          {risk.mitigationPlan}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{risk.category ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className="badge" style={{ background: riskColor(risk.inherentScore) }}>
                        {risk.inherentScore} {riskLabel(risk.inherentScore)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusLabel(risk.status)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{risk.owner ?? "Unassigned"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedRisk(risk)} className="btn-ghost px-3 py-1.5 text-xs" type="button">
                          View
                        </button>
                        {statusLabel(risk.status) !== "Closed" && (
                          <button onClick={() => updateRisk(risk, 3)} className="btn-ghost px-3 py-1.5 text-xs" type="button">
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedRisk && (
        <section className="card border-brand-500/30">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="section-title">Risk Detail</h2>
              <p className="section-subtitle">{selectedRisk.title}</p>
            </div>
            <button onClick={() => setSelectedRisk(null)} className="btn-ghost">Close</button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="section-subtitle">Score</div>
              <div className="mt-2 text-2xl font-black" style={{ color: riskColor(selectedRisk.inherentScore) }}>
                {selectedRisk.inherentScore} / {riskLabel(selectedRisk.inherentScore)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="section-subtitle">Likelihood</div>
              <div className="mt-2 font-bold">{LIKELIHOOD_LABELS[enumNumber(selectedRisk.likelihood, LIKELIHOOD_LABELS)] ?? "-"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="section-subtitle">Impact</div>
              <div className="mt-2 font-bold">{IMPACT_LABELS[enumNumber(selectedRisk.impact, IMPACT_LABELS)] ?? "-"}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="section-subtitle">Status</div>
              <div className="mt-2 font-bold">{statusLabel(selectedRisk.status)}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div className="text-sm font-bold">Description</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedRisk.description || "No description provided."}</p>
            </div>
            <div>
              <div className="text-sm font-bold">Mitigation Plan</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedRisk.mitigationPlan || "No mitigation plan provided."}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
