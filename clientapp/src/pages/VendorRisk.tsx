import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { VendorRiskApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type Vendor = {
  vendorName: string;
  website: string;
  securityScore: number;
  grade: string;
  complianceRisk: number;
  riskRating: string;
  reviewStatus: string;
  businessCriticality: string;
  failedFindings: number;
  highFindings: number;
  emailSecurityIssues: number;
  attackSurfaceIssues: number;
  lastReviewedUtc?: string;
  recommendedAction: string;
};

type VendorRiskSummary = {
  generatedUtc: string;
  totalVendors: number;
  criticalVendors: number;
  highRiskVendors: number;
  pendingReviews: number;
  approvedVendors: number;
  vendors: Vendor[];
};

const RATINGS = ["All", "Critical", "High", "Medium", "Low", "Not Assessed"];


function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not reviewed";
}

function vendorPriority(vendor: Vendor) {
  if (vendor.riskRating === "Critical") return "Immediate";
  if (vendor.riskRating === "High") return "Priority";
  if (vendor.riskRating === "Medium") return "Planned";
  return "Monitor";
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function VendorRisk() {
  const [data, setData] = useState<VendorRiskSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("All");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await VendorRiskApi.summary();
      setData(result);
    } catch {
      setError("Failed to load vendor risk center.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const vendors = useMemo(() => {
    if (!data) return [];

    const q = search.trim().toLowerCase();

    return data.vendors.filter((vendor) => {
      const matchesRating = rating === "All" || vendor.riskRating === rating;
      const text = `${vendor.vendorName} ${vendor.website} ${vendor.reviewStatus} ${vendor.recommendedAction}`.toLowerCase();

      return matchesRating && (!q || text.includes(q));
    });
  }, [data, search, rating]);

  const riskBreakdown = useMemo(() => {
    if (!data) return [];

    return RATINGS.filter((item) => item !== "All").map((risk) => ({
      risk,
      count: data.vendors.filter((vendor) => vendor.riskRating === risk).length,
    }));
  }, [data]);

  const exportVendors = () => {
    const rows = [
      [
        "Vendor",
        "Website",
        "Score",
        "Grade",
        "Risk",
        "Review Status",
        "Failed Findings",
        "High Findings",
        "Email Issues",
        "Attack Surface Issues",
        "Recommended Action",
      ],
      ...vendors.map((vendor) => [
        vendor.vendorName,
        vendor.website,
        vendor.securityScore,
        vendor.grade,
        vendor.riskRating,
        vendor.reviewStatus,
        vendor.failedFindings,
        vendor.highFindings,
        vendor.emailSecurityIssues,
        vendor.attackSurfaceIssues,
        vendor.recommendedAction,
      ]),
    ];

    downloadTextFile(
      "cybershield360-vendor-risk.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );
  };

  if (loading && !data) {
    return <div className="card text-sm text-slate-500">Loading vendor risk center...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-500">
            Third-Party Risk
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Vendor Risk Center
          </h1>
          <p className="section-subtitle mt-1">
            Vendor scorecards derived from latest scans, attack-surface findings, and email-security evidence.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={exportVendors} className="btn-primary">
            Export Vendors
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard label="Total Vendors" value={data.totalVendors} hint="Vendors in scope" tone="brand" />
        <CyberStatCard label="Critical" value={data.criticalVendors} hint="Immediate risk" tone="red" />
        <CyberStatCard label="High Risk" value={data.highRiskVendors} hint="Priority review" tone="orange" />
        <CyberStatCard label="Pending Reviews" value={data.pendingReviews} hint="Needs decision" tone="orange" />
        <CyberStatCard label="Approved" value={data.approvedVendors} hint="Accepted vendors" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CyberChartCard
            title="Vendor Risk Breakdown"
            description="Current third-party risk distribution by rating."
            insight={
              data.criticalVendors > 0
                ? `${data.criticalVendors} critical vendor(s) require immediate review.`
                : "No critical vendors are currently reported."
            }
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="risk" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "14px",
                    color: "#e2e8f0",
                    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
                  }}
                  labelStyle={{ color: "#99f6e4", fontWeight: 800 }}
                  itemStyle={{ color: "#e2e8f0" }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#10B5A6" />
              </BarChart>
            </ResponsiveContainer>
          </CyberChartCard>
        </div>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Review Guidance
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Focus first on vendors with high findings, poor security scores, email-security issues, or external exposure.
            </p>
            <div className="mt-5 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-xs leading-6 text-slate-300">
              Generated: {new Date(data.generatedUtc).toLocaleString()}
            </div>
          </div>
        </section>
      </section>

      <section className="card grid grid-cols-1 gap-3 md:grid-cols-[1fr_240px]">
        <input
          className="input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search vendor, domain, status, action..."
        />
        <select className="input" value={rating} onChange={(event) => setRating(event.target.value)}>
          {RATINGS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </section>

      <CyberTable
        title="Vendor Scorecards"
        description="Vendor posture, review status, business criticality, findings, and recommended actions."
        data={vendors}
        emptyText="No vendors match this view."
        columns={[
          {
            key: "vendor",
            label: "Vendor",
            render: (vendor) => (
              <div className="mx-auto min-w-72 text-center">
                <div className="font-semibold text-white">{vendor.vendorName}</div>
                <div className="mt-1 break-all text-xs text-slate-500">{vendor.website}</div>
              </div>
            ),
          },
          {
            key: "score",
            label: "Score",
            render: (vendor) => (
              <div>
                <div className="font-black text-white">{vendor.securityScore}/100</div>
                <div className="mt-2">
                  <CyberStatusBadge value={`Grade ${vendor.grade}`} />
                </div>
              </div>
            ),
          },
          {
            key: "risk",
            label: "Risk",
            render: (vendor) => <CyberStatusBadge value={vendor.riskRating} />,
          },
          {
            key: "status",
            label: "Review Status",
            render: (vendor) => <CyberStatusBadge value={vendor.reviewStatus} />,
          },
          {
            key: "criticality",
            label: "Criticality",
            render: (vendor) => <CyberStatusBadge value={vendor.businessCriticality} />,
          },
          {
            key: "findings",
            label: "Findings",
            render: (vendor) => (
              <div className="text-sm text-slate-300">
                Failed {vendor.failedFindings} · High {vendor.highFindings}
                <br />
                Email {vendor.emailSecurityIssues} · ASM {vendor.attackSurfaceIssues}
              </div>
            ),
          },
          {
            key: "action",
            label: "Recommended Action",
            render: (vendor) => (
              <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                {vendor.recommendedAction}
              </div>
            ),
          },
          {
            key: "priority",
            label: "Priority",
            render: (vendor) => <CyberStatusBadge value={vendorPriority(vendor)} />,
          },
          {
            key: "reviewed",
            label: "Last Reviewed",
            render: (vendor) => (
              <div className="whitespace-nowrap text-slate-400">
                {dateText(vendor.lastReviewedUtc)}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
