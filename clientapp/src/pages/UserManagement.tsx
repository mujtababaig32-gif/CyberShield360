import { useEffect, useMemo, useState } from "react";
import { UserInvitationsApi, UserManagementApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

type UserRow = {
  id: string;
  email?: string;
  fullName?: string;
  isActive: boolean;
  emailConfirmed?: boolean;
  lastLoginUtc?: string | null;
  roles?: string[];
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedUtc: string;
  subject?: string;
  message?: string;
};

type RoleSummary = {
  role: string;
  count: number;
};

type UserManagementSummary = {
  generatedUtc: string;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  confirmedUsers?: number;
  unconfirmedUsers?: number;
  pendingInvitations?: number;
  roleSummary: RoleSummary[];
  invitations: Invitation[];
  users: UserRow[];
  recommendations?: string[];
};

const TABS = [
  "Overview",
  "Users",
  "Invitations",
  "Roles",
  "Permissions",
  "Reports",
  "Settings",
];

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

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function stripHtml(html?: string) {
  if (!html) return "";

  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function extractRoleFromInvitation(message?: string, fallback?: string) {
  if (!message) return fallback || "Invited User";

  const text = stripHtml(message);
  const match = text.match(/Role:\s*([A-Za-z ]+)/i);

  return match?.[1]?.trim() || fallback || "Invited User";
}

function extractCompanyFromInvitation(message?: string) {
  if (!message) return "this workspace";

  const text = stripHtml(message);
  const match = text.match(/join\s+(.+?)\./i);

  return match?.[1]?.trim() || "this workspace";
}

function extractInviteLink(message?: string) {
  if (!message) return "";

  const match = message.match(/href=['"]([^'"]+)['"]/i);
  return match?.[1] || "";
}

function professionalInviteStatus(status: string) {
  const s = status.toLowerCase();

  if (s.includes("accepted")) return "Accepted";
  if (s.includes("sent")) return "Sent";
  if (s.includes("failed")) return "Failed";
  if (s.includes("pending")) return "Pending";

  return "Email Pending";
}

function dateText(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No login recorded";
}

export default function UserManagement() {
  const [data, setData] = useState<UserManagementSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [loading, setLoading] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Security Analyst");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await UserManagementApi.summary();
      setData(result);
    } catch {
      setError("Failed to load user management.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pendingInviteCount = useMemo(() => {
    if (!data) return 0;

    return data.invitations.filter((invitation) => {
      const status = professionalInviteStatus(invitation.status).toLowerCase();
      return status.includes("pending");
    }).length;
  }, [data]);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteMessage("Enter an email address first.");
      return;
    }

    try {
      setInviteLoading(true);
      setInviteMessage("Sending invitation...");

      const result = await UserInvitationsApi.send(inviteEmail.trim(), inviteRole);

      setInviteMessage(
        result?.sent
          ? `Invitation sent to ${inviteEmail}.`
          : "Invitation prepared successfully. Email delivery is pending because SMTP/SendGrid is not configured yet."
      );

      setInviteEmail("");
      await load();
    } catch {
      setInviteMessage("Failed to send invitation.");
    } finally {
      setInviteLoading(false);
    }
  };

  const resendInvite = async (invitation: Invitation) => {
    try {
      const cleanRole = extractRoleFromInvitation(invitation.message, invitation.role);

      setInviteMessage(`Resending invitation to ${invitation.email}...`);
      await UserInvitationsApi.send(invitation.email, cleanRole || "Security Analyst");
      setInviteMessage(`Invitation request processed for ${invitation.email}.`);
      await load();
    } catch {
      setInviteMessage(`Failed to resend invitation to ${invitation.email}.`);
    }
  };

  const copyInviteLink = async (email: string, link: string) => {
    if (!link) {
      setInviteMessage(`No invitation link found for ${email}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setInviteMessage(`Invite link copied for ${email}.`);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setInviteMessage(`Invite link copied for ${email}.`);
    }
  };

  const generateUserAccessReport = () => {
    if (!data) return;

    const rows = [
      ["Name", "Email", "Status", "Email Confirmed", "Roles", "Last Login UTC"],
      ...data.users.map((user) => [
        user.fullName || "",
        user.email || "",
        user.isActive ? "Active" : "Inactive",
        user.emailConfirmed ? "Yes" : "No",
        user.roles?.join("; ") || "No role assigned",
        user.lastLoginUtc || "",
      ]),
    ];

    const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-user-access-review.csv", csv);
  };

  const generateInvitationReport = () => {
    if (!data) return;

    const rows = [
      ["Email", "Role", "Status", "Invited UTC", "Workspace", "Invite Link"],
      ...data.invitations.map((invitation) => [
        invitation.email,
        extractRoleFromInvitation(invitation.message, invitation.role),
        professionalInviteStatus(invitation.status),
        invitation.invitedUtc,
        extractCompanyFromInvitation(invitation.message),
        extractInviteLink(invitation.message),
      ]),
    ];

    const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-invitation-report.csv", csv);
  };

  const generateRbacReport = () => {
    if (!data) return;

    const rows = [
      ["Role", "Assigned Users"],
      ...data.roleSummary.map((role) => [role.role, role.count]),
    ];

    const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-rbac-report.csv", csv);
  };

  const saveSetting = (setting: string) => {
    localStorage.setItem(`cs360_user_management_${setting}`, "enabled");
    setSettingsMessage(`${setting} setting saved locally for this workspace.`);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-500">Loading user management...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">User Management & RBAC</h1>
          <p className="text-sm text-gray-500">
            Manage tenant users, invitations, roles, permissions, and access governance.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} className="btn-ghost">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {inviteMessage && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-300">
          {inviteMessage}
        </div>
      )}

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CyberStatCard label="Total Users" value={data.totalUsers} hint="Tenant accounts" tone="brand" />
            <CyberStatCard label="Active Users" value={data.activeUsers} hint="Enabled accounts" tone="green" />
            <CyberStatCard label="Inactive Users" value={data.inactiveUsers} hint="Disabled accounts" tone="slate" />
            <CyberStatCard label="Pending Invites" value={data.pendingInvitations ?? pendingInviteCount} hint="Need acceptance" tone="orange" />
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">Invite User</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Invite users into the tenant with the correct role.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  className="input"
                  placeholder="user@company.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />

                <select
                  className="input"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value)}
                >
                  <option>Tenant Admin</option>
                  <option>Security Manager</option>
                  <option>Security Analyst</option>
                  <option>Auditor</option>
                  <option>Read Only</option>
                </select>

                <button
                  type="button"
                  onClick={sendInvite}
                  className="btn-primary w-full justify-center"
                  disabled={inviteLoading}
                >
                  {inviteLoading ? "Processing..." : "Send Invitation"}
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">Role Distribution</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Current assigned user count by role.
                </p>
              </div>

              <div className="space-y-3">
                {data.roleSummary.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No roles assigned yet.
                  </div>
                ) : (
                  data.roleSummary.map((role) => (
                    <div
                      key={role.role}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="font-semibold text-white">{role.role}</div>
                      <CyberStatusBadge value={`${role.count} users`} />
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 text-xs text-slate-500">
                Generated: {new Date(data.generatedUtc).toLocaleString()}
              </div>
            </section>
          </section>
        </div>
      )}

      {tab === "Users" && (
        <div className="space-y-6">
          <CyberTable
            title="Tenant Users"
            description="User status, roles, email confirmation, last login, and access review action."
            data={data.users}
            emptyText="No tenant users available."
            columns={[
              {
                key: "user",
                label: "User",
                render: (user) => (
                  <div className="mx-auto min-w-72 text-center">
                    <div className="font-semibold text-white">
                      {user.fullName || user.email || "Unknown User"}
                    </div>
                    <div className="mt-1 break-all text-xs text-slate-500">{user.id}</div>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (user) => <CyberStatusBadge value={user.isActive ? "Active" : "Inactive"} />,
              },
              {
                key: "roles",
                label: "Roles",
                render: (user) => (
                  <div className="mx-auto min-w-64 text-center text-sm leading-6 text-slate-300">
                    {user.roles?.join(", ") || "No role assigned"}
                  </div>
                ),
              },
              {
                key: "email",
                label: "Email",
                render: (user) => <CyberStatusBadge value={user.emailConfirmed ? "Confirmed" : "Unconfirmed"} />,
              },
              {
                key: "last",
                label: "Last Login",
                render: (user) => (
                  <div className="whitespace-nowrap text-slate-400">{dateText(user.lastLoginUtc)}</div>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (user) => (
                  <button
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className="rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs font-black text-brand-300 transition hover:bg-brand-500/20"
                  >
                    Manage
                  </button>
                ),
              },
            ]}
          />

          {selectedUser && (
            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white">User Details</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {selectedUser.fullName || selectedUser.email}
                  </p>
                </div>

                <button type="button" onClick={() => setSelectedUser(null)} className="btn-ghost">
                  Close
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">Email</div>
                  <div className="mt-2 break-all font-semibold text-white">
                    {selectedUser.email || "Not available"}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">Status</div>
                  <div className="mt-2 flex justify-center">
                    <CyberStatusBadge value={selectedUser.isActive ? "Active" : "Inactive"} />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-xs font-black uppercase tracking-wide text-slate-500">Roles</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    {selectedUser.roles?.join(", ") || "No role assigned"}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "Invitations" && (
        <CyberTable
          title="Invitation Register"
          description="Invitation status, role, workspace, delivery status, and invite-link actions."
          data={data.invitations}
          emptyText="No invitations available."
          columns={[
            {
              key: "email",
              label: "Email",
              render: (invitation) => (
                <div className="mx-auto min-w-72 break-all text-center font-semibold text-white">
                  {invitation.email}
                </div>
              ),
            },
            {
              key: "role",
              label: "Role",
              render: (invitation) => (
                <CyberStatusBadge value={extractRoleFromInvitation(invitation.message, invitation.role)} />
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (invitation) => <CyberStatusBadge value={professionalInviteStatus(invitation.status)} />,
            },
            {
              key: "workspace",
              label: "Workspace",
              render: (invitation) => (
                <div className="min-w-48 text-slate-300">
                  {extractCompanyFromInvitation(invitation.message)}
                </div>
              ),
            },
            {
              key: "invited",
              label: "Invited",
              render: (invitation) => (
                <div className="whitespace-nowrap text-slate-400">
                  {new Date(invitation.invitedUtc).toLocaleString()}
                </div>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (invitation) => (
                <div className="flex min-w-60 flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => resendInvite(invitation)}
                    className="btn-primary text-xs"
                  >
                    Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => copyInviteLink(invitation.email, extractInviteLink(invitation.message))}
                    className="btn-ghost text-xs"
                  >
                    Copy Link
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Roles" && (
        <CyberTable
          title="Role Summary"
          description="Assigned user count by role."
          data={data.roleSummary}
          emptyText="No roles assigned yet."
          columns={[
            {
              key: "role",
              label: "Role",
              render: (role) => <div className="font-semibold text-white">{role.role}</div>,
            },
            {
              key: "count",
              label: "Assigned Users",
              render: (role) => <div className="font-black text-white">{role.count}</div>,
            },
            {
              key: "review",
              label: "Review",
              render: (role) => <CyberStatusBadge value={role.count > 0 ? "Assigned" : "Unused"} />,
            },
          ]}
        />
      )}

      {tab === "Permissions" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Permission Governance
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Use the RBAC Engine page for detailed permission matrix review. This page focuses on tenant users and invitations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {["Least privilege review", "Privileged role MFA", "Inactive account cleanup"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                <CyberStatusBadge value="Recommended" />
                <div className="mt-3 font-semibold text-white">{item}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "Reports" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">User Access Report</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Export user status, confirmation, roles, and last login.
            </p>
            <button type="button" onClick={generateUserAccessReport} className="btn-primary mt-4">
              Download CSV
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">Invitation Report</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Export invitation status, role, workspace, and invite links.
            </p>
            <button type="button" onClick={generateInvitationReport} className="btn-primary mt-4">
              Download CSV
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
            <h2 className="font-black text-white">RBAC Report</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Export role distribution summary.
            </p>
            <button type="button" onClick={generateRbacReport} className="btn-primary mt-4">
              Download CSV
            </button>
          </section>
        </div>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              User Governance Settings
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Recommended controls for stronger tenant access governance.
            </p>
          </div>

          {settingsMessage && (
            <div className="mb-4 rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-center text-sm font-medium text-brand-300">
              {settingsMessage}
            </div>
          )}

          <div className="space-y-3">
            {["Quarterly access review", "MFA for privileged roles", "Disable inactive users"].map((setting) => (
              <div
                key={setting}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-center sm:text-left">
                  <div className="font-semibold text-white">{setting}</div>
                  <div className="text-sm text-slate-500">
                    Recommended access governance control.
                  </div>
                </div>

                <button type="button" onClick={() => saveSetting(setting)} className="btn-primary">
                  Save
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
