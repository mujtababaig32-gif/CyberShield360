import { useEffect, useMemo, useState } from "react";
import { VendorRiskApi } from "../api/endpoints";

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

function riskBadge(risk: string) {
  if (risk === "Critical") return "bg-red-700";
  if (risk === "High") return "bg-orange-600";
  if (risk === "Medium") return "bg-yellow-500";
  if (risk === "Low") return "bg-green-600";
  return "bg-slate-600";
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
      setData(await VendorRiskApi.summary());
    } catch {
      setError("Failed to load vendor risk center.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const vendors = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.vendors.filter((v) => {
      const matchesRating = rating === "All" || v.riskRating === rating;
      const text = `${v.vendorName} ${v.website} ${v.reviewStatus} ${v.recommendedAction}`.toLowerCase();
      return matchesRating && (!q || text.includes(q));
    });
  }, [data, search, rating]);

  const exportVendors = () => {
    const rows = [
      ["Vendor", "Website", "Score", "Grade", "Risk", "Review Status", "Failed Findings", "High Findings", "Email Issues", "Attack Surface Issues", "Recommended Action"],
      ...vendors.map((v) => [v.vendorName, v.website, v.securityScore, v.grade, v.riskRating, v.reviewStatus, v.failedFindings, v.highFindings, v.emailSecurityIssues, v.attackSurfaceIssues, v.recommendedAction]),
    ];
    downloadTextFile("cybershield360-vendor-risk.csv", rows.map((r) => r.map(csvSafe).join(",")).join("\n"));
  };

  if (loading && !data) return <div className="card text-sm text-slate-500">Loading vendor risk center...</div>;
  if (error) return <div className="card text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-500">Third-Party Risk</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vendor Risk Center</h1>
          <p className="section-subtitle mt-1">Vendor scorecards derived from tenant assets, latest scans, attack-surface findings, and email-security evidence.</p>
        </div>
        <div className="flex flex-wrap gap-2"><button onClick={load} disabled={loading} className="btn-ghost">{loading ? "Refreshing..." : "Refresh"}</button><button onClick={exportVendors} className="btn-primary">Export Vendors</button></div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="metric-card"><div className="section-subtitle">Total Vendors</div><div className="text-3xl font-bold">{data.totalVendors}</div></div>
        <div className="metric-card"><div className="section-subtitle">Critical</div><div className="text-3xl font-bold text-red-700">{data.criticalVendors}</div></div>
        <div className="metric-card"><div className="section-subtitle">High Risk</div><div className="text-3xl font-bold text-orange-600">{data.highRiskVendors}</div></div>
        <div className="metric-card"><div className="section-subtitle">Pending Reviews</div><div className="text-3xl font-bold">{data.pendingReviews}</div></div>
        <div className="metric-card"><div className="section-subtitle">Approved</div><div className="text-3xl font-bold text-green-600">{data.approvedVendors}</div></div>
      </section>

      <div className="card mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input md:col-span-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor, domain, status, action..." />
          <select className="input" value={rating} onChange={(e) => setRating(e.target.value)}>{RATINGS.map((r) => <option key={r}>{r}</option>)}</select>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="empty-state"><div className="text-3xl mb-2">🤝</div><h3 className="font-semibold">No vendors match this view</h3><p className="section-subtitle mt-1">Add assets or run scans to build vendor evidence.</p></div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {vendors.map((v) => (
            <div key={v.website} className="card card-hover">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><div className="font-semibold break-all">{v.vendorName}</div><div className="text-xs text-slate-500">{v.website} · Criticality: {v.businessCriticality}</div></div>
                <span className={`badge ${riskBadge(v.riskRating)}`}>{v.riskRating}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                <div><div className="section-subtitle">Security Score</div><b>{v.securityScore}/100</b></div>
                <div><div className="section-subtitle">Grade</div><b>{v.grade}</b></div>
                <div><div className="section-subtitle">Failed</div><b>{v.failedFindings}</b></div>
                <div><div className="section-subtitle">High</div><b>{v.highFindings}</b></div>
              </div>
              <div className="mt-4 rounded-xl border p-3 text-sm dark:border-slate-700"><b>Status:</b> {v.reviewStatus}<br /><span className="text-slate-500">{v.recommendedAction}</span></div>
              <div className="text-xs text-slate-500 mt-3">Last reviewed: {v.lastReviewedUtc ? new Date(v.lastReviewedUtc).toLocaleString() : "No scan evidence yet"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
