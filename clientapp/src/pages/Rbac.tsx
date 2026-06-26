import { useEffect, useMemo, useState } from "react";
import { RbacApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type RoleCard = {
  role: string;
  description: string;
  users: number;
  privilege: string;
  mfaRecommended: boolean;
};

type UserAccess = {
  id: string;
  email?: string;
  fullName?: string;
  isActive: boolean;
  emailConfirmed: boolean;
  lastLoginUtc?: string | null;
  roles: string[];
  accessLevel: string;
};

type PermissionRow = {
  module: string;
  tenantAdmin: boolean;
  securityAnalyst: boolean;
  auditor: boolean;
  member: boolean;
};

type RbacSummary = {
  generatedUtc: string;
  totalUsers: number;
  activeUsers: number;
  privilegedUsers: number;
  unassignedUsers: number;
  totalRoles: number;
  roles: RoleCard[];
  users: UserAccess[];
  permissions: PermissionRow[];
  recommendations: string[];
};

const TABS = ["Overview", "Roles", "Users", "Permission Matrix", "Reports"];

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No login recorded";
}

function accessPriority(value: string) {
  const v = value.toLowerCase();

  if (v.includes("privileged") || v.includes("critical")) return "Privileged";
  if (v.includes("high")) return "High Access";
  if (v.includes("standard") || v.includes("medium")) return "Standard";
  if (v.includes("unassigned")) return "Unassigned";

  return value;
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
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
    try {
      setLoading(true);
      setError(null);

      const result = await RbacApi.summary();
      setData(result);
    } catch {
      setError("Failed to load RBAC summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!data) return [];

    const q = query.trim().toLowerCase();

    return data.users.filter(
      (user) =>
        !q ||
        [user.email, user.fullName, user.accessLevel, user.roles.join(" ")]
          .some((value) => String(value ?? "").toLowerCase().includes(q))
    );
  }, [data, query]);

  const exportUsers = () => {
    if (!data) return;

    downloadCsv("cybershield360-rbac-users.csv", [
      ["Name", "Email", "Active", "Email Confirmed", "Roles", "Access Level", "Last Login"],
      ...filteredUsers.map((user) => [
        user.fullName ?? "",
        user.email ?? "",
        user.isActive ? "Yes" : "No",
        user.emailConfirmed ? "Yes" : "No",
        user.roles.join("; "),
        user.accessLevel,
        user.lastLoginUtc ?? "",
      ]),
    ]);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (loading || !data) {
    return <div className="card text-sm text-slate-500">Loading RBAC engine...</div>;
  }

  const privilegedRoles = data.roles.filter((role) =>
    ["Critical", "High"].includes(role.privilege)
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">RBAC Engine</h1>
          <p className="section-subtitle">
            Review roles, access levels, permission mapping, and privileged access exposure.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn-ghost">
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={exportUsers} className="btn-primary">
            Export Users
          </button>
        </div>
      </header>

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CyberStatCard label="Total Users" value={data.totalUsers} hint="All accounts" tone="brand" />
            <CyberStatCard label="Active Users" value={data.activeUsers} hint="Enabled users" tone="green" />
            <CyberStatCard label="Privileged Users" value={data.privilegedUsers} hint="Admin-sensitive" tone={data.privilegedUsers > 0 ? "red" : "green"} />
            <CyberStatCard label="Unassigned Users" value={data.unassignedUsers} hint="Need role review" tone={data.unassignedUsers > 0 ? "orange" : "green"} />
            <CyberStatCard label="Roles" value={data.totalRoles} hint="Configured roles" tone="brand" />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Access Recommendations
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Priority actions for stronger access governance.
                </p>
              </div>

              <div className="space-y-3">
                {data.recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No access recommendations available.
                  </div>
                ) : (
                  data.recommendations.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                        Action #{index + 1}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                        {item}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Privileged Role Summary
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Roles with elevated access should be reviewed regularly.
                </p>
              </div>

              <div className="space-y-3">
                {privilegedRoles.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No privileged role exposure found.
                  </div>
                ) : (
                  privilegedRoles.map((role) => (
                    <div
                      key={role.role}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="font-black text-white">{role.role}</div>
                      <div className="mt-1 text-sm text-slate-500">{role.description}</div>
                      <div className="mt-3 flex justify-center gap-2">
                        <CyberStatusBadge value={role.privilege} />
                        <CyberStatusBadge value={`${role.users} users`} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      )}

      {tab === "Roles" && (
        <CyberTable
          title="Role Register"
          description="Role descriptions, privilege level, assigned users, and MFA recommendation."
          data={data.roles}
          emptyText="No roles available."
          columns={[
            {
              key: "role",
              label: "Role",
              render: (role) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{role.role}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{role.description}</div>
                </div>
              ),
            },
            {
              key: "privilege",
              label: "Privilege",
              render: (role) => <CyberStatusBadge value={role.privilege} />,
            },
            {
              key: "users",
              label: "Assigned Users",
              render: (role) => <div className="font-black text-white">{role.users}</div>,
            },
            {
              key: "mfa",
              label: "MFA",
              render: (role) => (
                <CyberStatusBadge value={role.mfaRecommended ? "Required" : "Recommended"} />
              ),
            },
          ]}
        />
      )}

      {tab === "Users" && (
        <div className="space-y-6">
          <section className="card grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
            <input
              className="input"
              placeholder="Search users, roles, access level..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="button" onClick={exportUsers} className="btn-primary">
              Export Users
            </button>
          </section>

          <CyberTable
            title="User Access Review"
            description="User status, role assignment, email confirmation, access level, and last login."
            data={filteredUsers}
            emptyText="No users match this view."
            columns={[
              {
                key: "user",
                label: "User",
                render: (user) => (
                  <div className="mx-auto min-w-72 text-center">
                    <div className="font-semibold text-white">{user.fullName || "Unnamed User"}</div>
                    <div className="mt-1 break-all text-xs text-slate-500">{user.email || user.id}</div>
                  </div>
                ),
              },
              {
                key: "active",
                label: "Active",
                render: (user) => <CyberStatusBadge value={user.isActive ? "Active" : "Inactive"} />,
              },
              {
                key: "email",
                label: "Email",
                render: (user) => <CyberStatusBadge value={user.emailConfirmed ? "Confirmed" : "Unconfirmed"} />,
              },
              {
                key: "roles",
                label: "Roles",
                render: (user) => (
                  <div className="mx-auto min-w-64 text-center text-sm leading-6 text-slate-300">
                    {user.roles.length ? user.roles.join(", ") : "No role assigned"}
                  </div>
                ),
              },
              {
                key: "access",
                label: "Access Level",
                render: (user) => <CyberStatusBadge value={accessPriority(user.accessLevel)} />,
              },
              {
                key: "last",
                label: "Last Login",
                render: (user) => (
                  <div className="whitespace-nowrap text-slate-400">{dateText(user.lastLoginUtc)}</div>
                ),
              },
            ]}
          />
        </div>
      )}

      {tab === "Permission Matrix" && (
        <CyberTable
          title="Permission Matrix"
          description="Role-level access by CyberShield360 module."
          data={data.permissions}
          emptyText="No permission matrix available."
          columns={[
            {
              key: "module",
              label: "Module",
              render: (row) => <div className="font-semibold text-white">{row.module}</div>,
            },
            {
              key: "tenantAdmin",
              label: "Tenant Admin",
              render: (row) => <CyberStatusBadge value={yesNo(row.tenantAdmin)} />,
            },
            {
              key: "securityAnalyst",
              label: "Security Analyst",
              render: (row) => <CyberStatusBadge value={yesNo(row.securityAnalyst)} />,
            },
            {
              key: "auditor",
              label: "Auditor",
              render: (row) => <CyberStatusBadge value={yesNo(row.auditor)} />,
            },
            {
              key: "member",
              label: "Member",
              render: (row) => <CyberStatusBadge value={yesNo(row.member)} />,
            },
          ]}
        />
      )}

      {tab === "Reports" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <h2 className="font-black text-white">User Access Report</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Export user access, assigned roles, confirmation status, and last-login evidence.
          </p>
          <button type="button" onClick={exportUsers} className="btn-primary mt-4">
            Download CSV
          </button>
        </section>
      )}

      <div className="text-xs text-slate-400">
        Generated: {new Date(data.generatedUtc).toLocaleString()}
      </div>
    </div>
  );
}
