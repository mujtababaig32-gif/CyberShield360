import { useEffect, useMemo, useState, type FormEvent } from "react";
import { RiskApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
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

function riskLabel(score: number) {
  if (score >= 20) return "Critical";
  if (score >= 15) return "High";
  if (score >= 9) return "Medium";
  if (score >= 4) return "Low";
  return "Minimal";
}

function riskTone(score: number): "green" | "orange" | "red" | "slate" {
  if (!score) return "slate";
  if (score >= 15) return "red";
  if (score >= 9) return "orange";
  return "green";
}

function riskCellClass(score: number) {
  if (score >= 20) return "bg-red-700/80 border-red-400/30";
  if (score >= 15) return "bg-red-600/75 border-red-400/30";
  if (score >= 9) return "bg-orange-500/75 border-orange-300/30";
  if (score >= 4) return "bg-amber-500/70 border-amber-300/30";
  return "bg-emerald-600/70 border-emerald-300/30";
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

  return labels.findIndex((label) => label.toLowerCase() === value.toLowerCase());
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
    void load();
  }, [status]);

  const filteredRisks = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return risks;

    return risks.filter((risk) =>
      [
        risk.title,
        risk.category,
        risk.owner,
        statusLabel(risk.status),
        risk.mitigationPlan,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text))
    );
  }, [risks, query]);

  const summary = useMemo(() => {
    const openRisks = risks.filter((risk) => statusLabel(risk.status) !== "Closed");
    const critical = openRisks.filter((risk) => risk.inherentScore >= 20).length;
    const high = openRisks.filter(
      (risk) => risk.inherentScore >= 15 && risk.inherentScore < 20
    ).length;
    const avgScore = openRisks.length
      ? Math.round(
          openRisks.reduce((sum, risk) => sum + risk.inherentScore, 0) / openRisks.length
        )
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
    return (
      heatmap.find((cell) => cell.likelihood === likelihood && cell.impact === impact)?.count ?? 0
    );
  };

  const createRisk = async (event: FormEvent<HTMLFormElement>) => {
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
      [
        "Title",
        "Category",
        "Likelihood",
        "Impact",
        "Inherent Score",
        "Risk Level",
        "Status",
        "Owner",
        "Residual Score",
        "Mitigation Plan",
      ],
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
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Track ownership, likelihood, impact, mitigation activity, and residual exposure across client risk records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={exportRisks}
            disabled={filteredRisks.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </header>

      {message && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard label="Total Risks" value={summary.total} hint="All loaded records" tone="brand" />
        <CyberStatCard label="Open Risks" value={summary.open} hint="Not closed" tone="orange" />
        <CyberStatCard label="Critical" value={summary.critical} hint="Score 20+" tone="red" />
        <CyberStatCard label="High" value={summary.high} hint="Score 15-19" tone="orange" />
        <CyberStatCard
          label="Average Score"
          value={summary.avgScore || "-"}
          hint={summary.avgScore ? riskLabel(summary.avgScore) : "No open risks"}
          tone={riskTone(summary.avgScore)}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="text-center">
            <h2 className="text-lg font-black tracking-tight text-white">Risk Heatmap</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Likelihood × impact. Review red and orange zones first.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="mx-auto border-separate border-spacing-2">
              <tbody>
                {[5, 4, 3, 2, 1].map((likelihood) => (
                  <tr key={likelihood}>
                    <td className="w-32 pr-2 text-right text-xs font-semibold text-slate-500">
                      {LIKELIHOOD_LABELS[likelihood]}
                    </td>
                    {[1, 2, 3, 4, 5].map((impact) => {
                      const score = likelihood * impact;
                      const count = countAt(likelihood, impact);

                      return (
                        <td
                          key={impact}
                          className={`h-16 w-20 rounded-2xl border text-center align-middle text-sm font-black text-white shadow-sm ${riskCellClass(score)}`}
                          title={`${LIKELIHOOD_LABELS[likelihood]} × ${IMPACT_LABELS[impact]} = ${score}`}
                        >
                          <div>{count || ""}</div>
                          <div className="text-[10px] font-semibold opacity-80">
                            {count ? riskLabel(score) : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td />
                  {[1, 2, 3, 4, 5].map((impact) => (
                    <td
                      key={impact}
                      className="w-20 text-center text-[11px] font-semibold text-slate-500"
                    >
                      {IMPACT_LABELS[impact]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <form
          onSubmit={createRisk}
          className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10"
        >
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">Create Risk</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Add likelihood, impact, owner, and mitigation plan.
            </p>
          </div>

          <div className="space-y-4">
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
                onChange={(event) =>
                  setForm({ ...form, likelihood: Number(event.target.value) })
                }
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {LIKELIHOOD_LABELS[value]}
                  </option>
                ))}
              </select>

              <select
                className="input"
                value={form.impact}
                onChange={(event) => setForm({ ...form, impact: Number(event.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {IMPACT_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              className="input min-h-24"
              placeholder="Mitigation plan"
              value={form.mitigationPlan}
              onChange={(event) => setForm({ ...form, mitigationPlan: event.target.value })}
            />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm">
              <span className="text-slate-500">Calculated inherent score: </span>
              <span className="font-black text-white">
                {form.likelihood * form.impact} / {riskLabel(form.likelihood * form.impact)}
              </span>
            </div>

            <button disabled={saving} className="btn-primary w-full justify-center">
              {saving ? "Saving..." : "Create Risk"}
            </button>
          </div>
        </form>
      </section>

      <section className="card grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
        <input
          className="input"
          placeholder="Search risks, owners, category..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="input"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      <CyberTable
        title="Risk Register"
        description={`${filteredRisks.length} visible risks from ${risks.length} loaded records.`}
        data={filteredRisks}
        emptyText={loading ? "Loading risk register..." : "No risks found."}
        columns={[
          {
            key: "risk",
            label: "Risk",
            render: (risk) => (
              <div className="mx-auto min-w-72 text-center">
                <div className="font-semibold leading-6 text-white">{risk.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {risk.category ?? "Uncategorized"} · Owner: {risk.owner ?? "Unassigned"}
                </div>
              </div>
            ),
          },
          {
            key: "likelihood",
            label: "Likelihood",
            render: (risk) => {
              const likelihood = enumNumber(risk.likelihood, LIKELIHOOD_LABELS);
              return <div className="text-slate-300">{LIKELIHOOD_LABELS[likelihood] ?? "-"}</div>;
            },
          },
          {
            key: "impact",
            label: "Impact",
            render: (risk) => {
              const impact = enumNumber(risk.impact, IMPACT_LABELS);
              return <div className="text-slate-300">{IMPACT_LABELS[impact] ?? "-"}</div>;
            },
          },
          {
            key: "score",
            label: "Score",
            render: (risk) => (
              <div>
                <div className="font-black text-white">{risk.inherentScore}</div>
                <div className="mt-2">
                  <CyberStatusBadge value={riskLabel(risk.inherentScore)} />
                </div>
              </div>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (risk) => <CyberStatusBadge value={statusLabel(risk.status)} />,
          },
          {
            key: "plan",
            label: "Mitigation Plan",
            render: (risk) => (
              <div className="mx-auto min-w-80 text-center text-sm leading-6 text-slate-400">
                {risk.mitigationPlan || "No mitigation plan provided."}
              </div>
            ),
          },
          {
            key: "action",
            label: "Action",
            render: (risk) => (
              <div className="flex min-w-56 flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRisk(risk)}
                  className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs font-black text-brand-300 transition hover:bg-brand-500/20"
                >
                  View
                </button>
                <select
                  className="input min-w-36 py-1"
                  value={String(enumNumber(risk.status, STATUS_LABELS))}
                  onChange={(event) => updateRisk(risk, Number(event.target.value))}
                >
                  {STATUS_LABELS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ),
          },
        ]}
      />

      {selectedRisk && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Selected Risk Detail
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {selectedRisk.title}
              </p>
            </div>
            <button type="button" onClick={() => setSelectedRisk(null)} className="btn-ghost">
              Close
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Level
              </div>
              <div className="mt-2 flex justify-center">
                <CyberStatusBadge value={riskLabel(selectedRisk.inherentScore)} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Residual Score
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {selectedRisk.residualScore ?? "-"}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Status
              </div>
              <div className="mt-2 flex justify-center">
                <CyberStatusBadge value={statusLabel(selectedRisk.status)} />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
