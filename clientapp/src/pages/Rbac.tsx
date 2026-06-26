import { useEffect, useMemo, useState } from "react";
import { RbacApi } from "../api/endpoints";

import ModuleTabs from "../components/ModuleTabs";
type RoleCard = { role: string; description: string; users: number; privilege: string; mfaRecommended: boolean };
type UserAccess = { id: string; email?: string; fullName?: string; isActive: boolean; emailConfirmed: boolean; lastLoginUtc?: string | null; roles: string[]; accessLevel: string };
type PermissionRow = { module: string; tenantAdmin: boolean; securityAnalyst: boolean; auditor: boolean; member: boolean };
type RbacSummary = { generatedUtc: string; totalUsers: number; activeUsers: number; privilegedUsers: number; unassignedUsers: number; totalRoles: number; roles: RoleCard[]; users: UserAccess[]; permissions: PermissionRow[]; recommendations: string[] };

const TABS = ["Overview", "Roles", "Users", "Permission Matrix", "Reports"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("critical") || v.includes("privileged")) return "bg-red-600";
  if (v.includes("high")) return "bg-orange-500";
  if (v.includes("medium") || v.includes("standard")) return "bg-brand-600";
  if (v.includes("active") || v.includes("yes")) return "bg-green-600";
  if (v.includes("unassigned") || v.includes("inactive") || v.includes("no")) return "bg-gray-600";
  return "bg-slate-600";
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Rbac() {
  const [data, setData] = useState<RbacSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");

  const load = async () => {
    try { setLoading(true); setError(null); setData(await RbacApi.summary()); }
    catch { setError("Failed to load RBAC summary."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.users.filter((u) => !q || [u.email, u.fullName, u.accessLevel, u.roles.join(" ")].some((x) => String(x ?? "").toLowerCase().includes(q)));
  }, [data, query]);

  const exportUsers = () => {
    if (!data) return;
    downloadCsv("cybershield360-rbac-users.csv", [
      ["Name", "Email", "Active", "Email Confirmed", "Roles", "Access Level", "Last Login"],
      ...filteredUsers.map((u) => [u.fullName ?? "", u.email ?? "", u.isActive ? "Yes" : "No", u.emailConfirmed ? "Yes" : "No", u.roles.join("; "), u.accessLevel, u.lastLoginUtc ?? ""]),
    ]);
  };

  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-900 dark:bg-red-950">{error}</div>;
  if (loading || !data) return <div className="card text-sm text-slate-500">Loading RBAC engine...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div><h1 className="text-2xl font-black tracking-tight">RBAC Engine</h1><p className="section-subtitle">Review roles, access levels, permission mapping, and privileged access exposure.</p></div>
        <div className="flex gap-2"><button onClick={load} className="btn-ghost">Refresh</button><button onClick={exportUsers} className="btn-primary">Export Users</button></div>
      </header>

      <ModuleTabs tabs={TABS.map((t) => ({ key: t, label: t }))} activeKey={tab} onChange={setTab} />

      {tab === "Overview" && <>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="metric-card"><div className="section-subtitle">Total Users</div><div className="text-3xl font-black">{data.totalUsers}</div></div>
          <div className="metric-card"><div className="section-subtitle">Active Users</div><div className="text-3xl font-black text-green-600">{data.activeUsers}</div></div>
          <div className="metric-card"><div className="section-subtitle">Privileged Users</div><div className="text-3xl font-black text-red-600">{data.privilegedUsers}</div></div>
          <div className="metric-card"><div className="section-subtitle">Unassigned Users</div><div className="text-3xl font-black text-orange-500">{data.unassignedUsers}</div></div>
          <div className="metric-card"><div className="section-subtitle">Roles</div><div className="text-3xl font-black text-brand-500">{data.totalRoles}</div></div>
        </section>
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2"><div className="card"><h2 className="section-title mb-4">Access Recommendations</h2><div className="space-y-3">{data.recommendations.map((r) => <div key={r} className="rounded-2xl border border-slate-200 p-4 font-medium dark:border-slate-800">{r}</div>)}</div></div><div className="card"><h2 className="section-title mb-4">Privileged Role Summary</h2><div className="space-y-3">{data.roles.filter((r) => ["Critical", "High"].includes(r.privilege)).map((r) => <div key={r.role} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div className="flex items-center justify-between"><div><div className="font-bold">{r.role}</div><div className="text-sm text-slate-500">{r.description}</div></div><span className={`badge ${badgeColor(r.privilege)}`}>{r.users}</span></div></div>)}</div></div></section>
      </>}

      {tab === "Roles" && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">{data.roles.map((r) => <div key={r.role} className="card card-hover"><div className="flex items-start justify-between gap-3"><div><div className="text-lg font-black">{r.role}</div><div className="mt-1 text-sm text-slate-500">{r.description}</div></div><span className={`badge ${badgeColor(r.privilege)}`}>{r.privilege}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-950/60"><div className="text-slate-500">Assigned Users</div><div className="text-2xl font-black">{r.users}</div></div><div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-950/60"><div className="text-slate-500">MFA</div><div className="font-bold">{r.mfaRecommended ? "Required" : "Recommended"}</div></div></div></div>)}</div>}

      {tab === "Users" && <div className="card"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="section-title">User Access Review</h2><p className="section-subtitle">Search users and verify role assignments before audit.</p></div><input className="input max-w-md" placeholder="Search user, role, access level..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="table-wrap"><table className="w-full text-sm"><thead className="table-head"><tr><th className="p-3">User</th><th>Status</th><th>Roles</th><th>Access</th><th>Last Login</th></tr></thead><tbody>{filteredUsers.map((u) => <tr key={u.id} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3"><div className="font-bold">{u.fullName || u.email}</div><div className="text-xs text-slate-500">{u.email}</div></td><td><span className={`badge ${badgeColor(u.isActive ? "Active" : "Inactive")}`}>{u.isActive ? "Active" : "Inactive"}</span></td><td>{u.roles.length ? u.roles.join(", ") : "No role"}</td><td><span className={`badge ${badgeColor(u.accessLevel)}`}>{u.accessLevel}</span></td><td className="text-xs text-slate-500">{u.lastLoginUtc ? new Date(u.lastLoginUtc).toLocaleString() : "No login"}</td></tr>)}</tbody></table></div></div>}

      {tab === "Permission Matrix" && <div className="card"><h2 className="section-title mb-4">Permission Matrix</h2><div className="table-wrap"><table className="w-full text-sm"><thead className="table-head"><tr><th className="p-3">Module</th><th>Tenant Admin</th><th>Security Analyst</th><th>Auditor</th><th>Member</th></tr></thead><tbody>{data.permissions.map((p) => <tr key={p.module} className="border-t border-slate-200 dark:border-slate-800"><td className="p-3 font-bold">{p.module}</td>{[p.tenantAdmin, p.securityAnalyst, p.auditor, p.member].map((v, i) => <td key={i}><span className={`badge ${badgeColor(v ? "Yes" : "No")}`}>{v ? "Allowed" : "Blocked"}</span></td>)}</tr>)}</tbody></table></div></div>}

      {tab === "Reports" && <div className="card"><h2 className="section-title mb-2">RBAC Reports</h2><p className="section-subtitle mb-4">Download current user access and role assignments for review.</p><button onClick={exportUsers} className="btn-primary">Download User Access Review</button></div>}
    </div>
  );
}
