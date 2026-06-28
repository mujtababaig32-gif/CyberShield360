import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import type { VendorRiskItem, VendorRiskSummary } from "../types";

const RATINGS = ["All", "Critical", "High", "Medium", "Low", "Not Assessed"];
const CRITICALITIES = ["Critical", "High", "Medium", "Low"];
const REVIEW_STATUSES = [
  "Assessment Required",
  "Needs Immediate Review",
  "Review Required",
  "Monitor",
  "Approved",
  "Accepted",
  "Assessment Failed",
];

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not reviewed";
}

function vendorPriority(vendor: VendorRiskItem) {
  if (vendor.riskRating === "Critical") return "Immediate";
  if (vendor.riskRating === "High") return "Priority";
  if (vendor.riskRating === "Medium") return "Planned";
  return "Monitor";
}

function scoreTextClass(score: number) {
  if (score >= 80) return "text-green-300";
  if (score >= 60) return "text-orange-300";
  return "text-red-300";
}

function cleanDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0];
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

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-slate-950/95 px-4 py-3 text-sm shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-brand-300">
        {label}
      </div>

      <div className="space-y-1">
        {payload.map((item: any) => (
          <div
            key={`${item.dataKey}-${item.value}`}
            className="flex items-center justify-between gap-5 text-slate-300"
          >
            <span className="capitalize">{item.name || item.dataKey}</span>
            <span className="font-black text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VendorRisk() {
  const [data, setData] = useState<VendorRiskSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState("All");

  const [vendorName, setVendorName] = useState("");
  const [website, setWebsite] = useState("");
  const [businessCriticality, setBusinessCriticality] = useState("Medium");
  const [serviceType, setServiceType] = useState("");
  const [contactEmail, setContactEmail] = useState("");

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
      const text = `${vendor.vendorName} ${vendor.website} ${vendor.reviewStatus} ${vendor.businessCriticality} ${vendor.serviceType ?? ""} ${vendor.contactEmail ?? ""} ${vendor.recommendedAction}`.toLowerCase();

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

  const createVendor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedWebsite = cleanDomain(website);

    if (!vendorName.trim() || !normalizedWebsite) {
      setMsg(null);
      setError("Vendor name and website are required.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMsg("Adding vendor...");

      await VendorRiskApi.create({
        vendorName: vendorName.trim(),
        website: normalizedWebsite,
        businessCriticality,
        serviceType: serviceType.trim(),
        contactEmail: contactEmail.trim(),
      });

      setVendorName("");
      setWebsite("");
      setServiceType("");
      setContactEmail("");
      setBusinessCriticality("Medium");
      setMsg(`Vendor added: ${normalizedWebsite}`);
      await load();
    } catch {
      setMsg(null);
      setError("Failed to add vendor. It may already exist or the website is invalid.");
    } finally {
      setSaving(false);
    }
  };

  const assessVendor = async (vendor: VendorRiskItem) => {
    try {
      setAssessingId(vendor.id);
      setError(null);
      setMsg(`Running Full Posture assessment for ${vendor.vendorName}...`);

      await VendorRiskApi.assess(vendor.id);

      setMsg(`Vendor assessment completed for ${vendor.vendorName}.`);
      await load();
    } catch {
      setMsg(null);
      setError("Vendor assessment failed. Check backend logs and try again.");
    } finally {
      setAssessingId(null);
    }
  };

  const updateVendorStatus = async (vendor: VendorRiskItem, reviewStatus: string) => {
    try {
      setError(null);
      setMsg(`Updating ${vendor.vendorName}...`);

      await VendorRiskApi.updateStatus(vendor.id, {
        reviewStatus,
        businessCriticality: vendor.businessCriticality,
      });

      setMsg(`Vendor status updated: ${vendor.vendorName}`);
      await load();
    } catch {
      setMsg(null);
      setError("Failed to update vendor status.");
    }
  };

  const deleteVendor = async (vendor: VendorRiskItem) => {
    const confirmed = window.confirm(
      `Delete vendor ${vendor.vendorName}? Existing asset scan history will remain, but this vendor scorecard will be removed.`
    );

    if (!confirmed) return;

    try {
      setError(null);
      setMsg(`Deleting ${vendor.vendorName}...`);

      await VendorRiskApi.delete(vendor.id);

      setMsg(`Vendor deleted: ${vendor.vendorName}`);
      await load();
    } catch {
      setMsg(null);
      setError("Failed to delete vendor.");
    }
  };

  const exportVendors = () => {
    const rows = [
      [
        "Vendor",
        "Website",
        "Service Type",
        "Contact Email",
        "Score",
        "Grade",
        "Risk",
        "Review Status",
        "Business Criticality",
        "Failed Findings",
        "High Findings",
        "Email Issues",
        "Attack Surface Issues",
        "Last Reviewed",
        "Recommended Action",
      ],
      ...vendors.map((vendor) => [
        vendor.vendorName,
        vendor.website,
        vendor.serviceType ?? "",
        vendor.contactEmail ?? "",
        vendor.securityScore,
        vendor.grade,
        vendor.riskRating,
        vendor.reviewStatus,
        vendor.businessCriticality,
        vendor.failedFindings,
        vendor.highFindings,
        vendor.emailSecurityIssues,
        vendor.attackSurfaceIssues,
        vendor.lastReviewedUtc ?? "",
        vendor.recommendedAction,
      ]),
    ];

    downloadTextFile(
      "cybershield360-vendor-risk.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );
  };

  if (loading && !data) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400 shadow-2xl shadow-black/10">
        Loading vendor risk center...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const approvalRate =
    data.totalVendors > 0
      ? Math.round((data.approvedVendors / data.totalVendors) * 100)
      : 0;

  const reviewBacklog =
    data.totalVendors > 0
      ? Math.round((data.pendingReviews / data.totalVendors) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
              Risk & Trust
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white">
              Vendor Risk Center
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Add third-party vendors, assess their websites with the real Full Posture scanner,
              calculate evidence-backed risk, and track review decisions.
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
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <CyberStatCard
          label="Total Vendors"
          value={data.totalVendors}
          hint="Third parties in scope"
          tone="brand"
        />
        <CyberStatCard
          label="Critical"
          value={data.criticalVendors}
          hint="Immediate risk"
          tone="red"
        />
        <CyberStatCard
          label="High Risk"
          value={data.highRiskVendors}
          hint="Priority review"
          tone="orange"
        />
        <CyberStatCard
          label="Pending Reviews"
          value={data.pendingReviews}
          hint="Needs decision"
          tone="orange"
        />
        <CyberStatCard
          label="Approved"
          value={data.approvedVendors}
          hint="Accepted vendors"
          tone="green"
        />
      </section>

      <form
        onSubmit={createVendor}
        className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10"
      >
        <div className="mb-5">
          <h2 className="text-lg font-black text-white">Add Vendor</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Create a vendor scorecard. The vendor domain will be linked to an asset so CyberShield360 can run a real Full Posture assessment.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_180px]">
          <input
            className="input"
            placeholder="Vendor name, e.g. Payment Gateway"
            value={vendorName}
            onChange={(event) => setVendorName(event.target.value)}
          />

          <input
            className="input"
            placeholder="Vendor website, e.g. stripe.com"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />

          <select
            className="input"
            value={businessCriticality}
            onChange={(event) => setBusinessCriticality(event.target.value)}
          >
            {CRITICALITIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            className="input"
            placeholder="Service type, e.g. Payments, Hosting, CRM"
            value={serviceType}
            onChange={(event) => setServiceType(event.target.value)}
          />

          <input
            className="input"
            placeholder="Contact email, optional"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />

          <button
            type="submit"
            disabled={saving}
            className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Vendor"}
          </button>
        </div>
      </form>

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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Approval Rate
          </div>
          <div className="mt-2 text-3xl font-black text-green-300">
            {approvalRate}%
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Approved vendors out of total vendors.
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Review Backlog
          </div>
          <div className="mt-2 text-3xl font-black text-orange-300">
            {reviewBacklog}%
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Vendors waiting for review or decision.
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            Filtered View
          </div>
          <div className="mt-2 text-3xl font-black text-brand-300">
            {vendors.length}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-500">
            Vendors matching current search/filter.
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CyberChartCard
            title="Vendor Risk Breakdown"
            description="Current third-party risk distribution by rating. Ratings are calculated from real Full Posture findings when assessments exist."
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
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  content={<DarkTooltip />}
                  cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                />
                <Bar dataKey="count" name="Vendors" radius={[10, 10, 0, 0]} fill="#10B5A6" />
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
              Start with critical and high-risk vendors, then request remediation evidence or run reassessments after fixes.
            </p>

            <div className="mt-5 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-xs leading-6 text-slate-300">
              Generated: {new Date(data.generatedUtc).toLocaleString()}
            </div>
          </div>
        </section>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_240px]">
          <div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Search Vendors
            </label>
            <input
              className="input mt-2"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor, domain, status, action..."
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Risk Rating
            </label>
            <select
              className="input mt-2"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
            >
              {RATINGS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <CyberTable
        title="Vendor Scorecards"
        description="Vendor posture, review status, business criticality, findings, assessment actions, and recommended next steps."
        data={vendors}
        emptyText="No vendors match this view. Add a vendor above to create the first real scorecard."
        columns={[
          {
            key: "vendor",
            label: "Vendor",
            render: (vendor) => (
              <div className="mx-auto min-w-72 text-center">
                <div className="font-semibold text-white">{vendor.vendorName}</div>
                <div className="mt-1 break-all text-xs text-slate-500">{vendor.website}</div>
                {vendor.serviceType && (
                  <div className="mt-1 text-xs text-brand-300">{vendor.serviceType}</div>
                )}
              </div>
            ),
          },
          {
            key: "score",
            label: "Score",
            render: (vendor) => (
              <div className="mx-auto min-w-28 text-center">
                <div className={`font-black ${scoreTextClass(vendor.securityScore)}`}>
                  {vendor.securityScore}/100
                </div>
                <div className="mt-2 flex justify-center">
                  <CyberStatusBadge value={`Grade ${vendor.grade}`} />
                </div>
              </div>
            ),
          },
          {
            key: "risk",
            label: "Risk",
            render: (vendor) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={vendor.riskRating} />
              </div>
            ),
          },
          {
            key: "status",
            label: "Review Status",
            render: (vendor) => (
              <select
                className="input min-w-52 text-xs"
                value={vendor.reviewStatus}
                onChange={(event) => updateVendorStatus(vendor, event.target.value)}
              >
                {REVIEW_STATUSES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            ),
          },
          {
            key: "criticality",
            label: "Criticality",
            render: (vendor) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={vendor.businessCriticality} />
              </div>
            ),
          },
          {
            key: "findings",
            label: "Findings",
            render: (vendor) => (
              <div className="mx-auto min-w-56 text-center text-sm leading-6 text-slate-300">
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
            render: (vendor) => (
              <div className="flex justify-center">
                <CyberStatusBadge value={vendorPriority(vendor)} />
              </div>
            ),
          },
          {
            key: "reviewed",
            label: "Last Reviewed",
            render: (vendor) => (
              <div className="mx-auto min-w-48 whitespace-nowrap text-center text-slate-400">
                {dateText(vendor.lastReviewedUtc)}
              </div>
            ),
          },
          {
            key: "actions",
            label: "Actions",
            render: (vendor) => (
              <div className="flex min-w-56 flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => assessVendor(vendor)}
                  disabled={assessingId === vendor.id}
                  className="btn-primary text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {assessingId === vendor.id ? "Assessing..." : "Run Assessment"}
                </button>

                <button
                  type="button"
                  onClick={() => deleteVendor(vendor)}
                  className="btn-ghost text-xs"
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
