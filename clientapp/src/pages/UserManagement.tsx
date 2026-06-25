import { useEffect, useMemo, useState } from "react";
import { UserManagementApi, UserInvitationsApi } from "../api/endpoints";

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

function badgeColor(value: string) {
  const v = value.toLowerCase();

  if (v.includes("active") || v.includes("accepted") || v.includes("sent")) {
    return "bg-green-600";
  }

  if (v.includes("pending") || v.includes("created")) {
    return "bg-orange-500";
  }

  if (v.includes("inactive") || v.includes("failed")) {
    return "bg-gray-600";
  }

  return "bg-brand-600";
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
    load();
  }, []);

  const pendingInviteCount = useMemo(() => {
    if (!data) return 0;

    return data.invitations.filter((i) => {
      const s = professionalInviteStatus(i.status).toLowerCase();
      return s.includes("pending");
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
          : `Invitation prepared successfully. Email delivery is pending because SMTP/SendGrid is not configured yet.`
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
      ...data.users.map((u) => [
        u.fullName || "",
        u.email || "",
        u.isActive ? "Active" : "Inactive",
        u.emailConfirmed ? "Yes" : "No",
        u.roles?.join("; ") || "No role assigned",
        u.lastLoginUtc || "",
      ]),
    ];

    const csv = rows.map((r) => r.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-user-access-review.csv", csv);
  };

  const generateInvitationReport = () => {
    if (!data) return;

    const rows = [
      ["Email", "Role", "Status", "Invited UTC", "Workspace", "Invite Link"],
      ...data.invitations.map((i) => [
        i.email,
        extractRoleFromInvitation(i.message, i.role),
        professionalInviteStatus(i.status),
        i.invitedUtc,
        extractCompanyFromInvitation(i.message),
        extractInviteLink(i.message),
      ]),
    ];

    const csv = rows.map((r) => r.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-invitation-report.csv", csv);
  };

  const generateRbacReport = () => {
    if (!data) return;

    const rows = [
      ["Role", "Assigned Users"],
      ...data.roleSummary.map((r) => [r.role, r.count]),
    ];

    const csv = rows.map((r) => r.map(csvSafe).join(",")).join("\n");
    downloadTextFile("cybershield360-rbac-report.csv", csv);
  };

  const saveSetting = (setting: string) => {
    localStorage.setItem(`cs360_user_management_${setting}`, "enabled");
    setSettingsMessage(`${setting} setting saved locally for this workspace.`);
  };

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading user management...</div>;

  return (
    <div>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">User Management & RBAC</h1>
          <p className="text-sm text-gray-500">
            Manage tenant users, invitations, roles, permissions, and access governance.
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm border ${
              tab === t
                ? "bg-brand-600 text-white border-brand-600"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {inviteMessage && (
        <div className="card mb-4 text-sm text-brand-500">
          {inviteMessage}
        </div>
      )}

      {tab === "Overview" && (
        <div>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <div className="text-xs text-gray-500">Total Users</div>
              <div className="text-3xl font-bold">{data.totalUsers}</div>
            </div>

            <div className="card">
              <div className="text-xs text-gray-500">Active Users</div>
              <div className="text-3xl font-bold text-green-600">{data.activeUsers}</div>
            </div>

            <div className="card">
              <div className="text-xs text-gray-500">Inactive Users</div>
              <div className="text-3xl font-bold">{data.inactiveUsers}</div>
            </div>

            <div className="card">
              <div className="text-xs text-gray-500">Pending Invites</div>
              <div className="text-3xl font-bold text-orange-500">
                {data.pendingInvitations ?? pendingInviteCount}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="font-semibold mb-4">Invite User</h2>

              <div className="space-y-3">
                <input
                  className="input"
                  placeholder="user@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />

                <select
                  className="input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option>Tenant Admin</option>
                  <option>Security Manager</option>
                  <option>Security Analyst</option>
                  <option>Auditor</option>
                  <option>Read Only</option>
                </select>

                <button
                  onClick={sendInvite}
                  className="btn-primary"
                  disabled={inviteLoading}
                >
                  {inviteLoading ? "Processing..." : "Send Invitation"}
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-4">Role Distribution</h2>

              <div className="space-y-3">
                {data.roleSummary.length === 0 && (
                  <div className="text-sm text-gray-500">No roles assigned yet.</div>
                )}

                {data.roleSummary.map((r) => (
                  <div
                    key={r.role}
                    className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-xl p-3"
                  >
                    <div className="font-medium">{r.role}</div>
                    <div className="text-xl font-bold">{r.count}</div>
                  </div>
                ))}
              </div>

              <div className="pt-4 text-xs text-gray-500">
                Generated: {new Date(data.generatedUtc).toLocaleString()}
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "Users" && (
        <div className="card">
          <h2 className="font-semibold mb-4">Tenant Users</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2">User</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3">
                      <div className="font-semibold">
                        {u.fullName || u.email || "Unknown User"}
                      </div>
                      <div className="text-xs text-gray-500">{u.id}</div>
                    </td>

                    <td>
                      <span className={`badge ${badgeColor(u.isActive ? "Active" : "Inactive")}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>{u.roles?.join(", ") || "No role assigned"}</td>

                    <td>
                      <span className={`badge ${badgeColor(u.emailConfirmed ? "Active" : "Pending")}`}>
                        {u.emailConfirmed ? "Confirmed" : "Unconfirmed"}
                      </span>
                    </td>

                    <td>
                      {u.lastLoginUtc
                        ? new Date(u.lastLoginUtc).toLocaleString()
                        : "No login recorded"}
                    </td>

                    <td>
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="text-brand-500 hover:underline text-sm"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedUser && (
            <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">User Details</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedUser.fullName || selectedUser.email}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                <div>
                  <div className="text-gray-500">Email</div>
                  <div>{selectedUser.email || "Not available"}</div>
                </div>

                <div>
                  <div className="text-gray-500">Status</div>
                  <div>{selectedUser.isActive ? "Active" : "Inactive"}</div>
                </div>

                <div>
                  <div className="text-gray-500">Roles</div>
                  <div>{selectedUser.roles?.join(", ") || "No role assigned"}</div>
                </div>

                <div>
                  <div className="text-gray-500">Last Login</div>
                  <div>
                    {selectedUser.lastLoginUtc
                      ? new Date(selectedUser.lastLoginUtc).toLocaleString()
                      : "No login recorded"}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 mt-4">
                Role changes and account deactivation require backend update endpoints. Details are now viewable here.
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "Invitations" && (
        <div className="card">
          <h2 className="font-semibold mb-4">User Invitations</h2>

          {data.invitations.length === 0 && (
            <div className="text-sm text-gray-500">
              No invitation records found yet. Send an invitation from the Overview tab.
            </div>
          )}

          <div className="space-y-3">
            {data.invitations.map((i) => {
              const cleanRole = extractRoleFromInvitation(i.message, i.role);
              const company = extractCompanyFromInvitation(i.message);
              const inviteLink = extractInviteLink(i.message);
              const cleanStatus = professionalInviteStatus(i.status);

              return (
                <div
                  key={i.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold">{i.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Role: {cleanRole}
                      </div>
                    </div>

                    <span className={`badge ${badgeColor(cleanStatus)}`}>
                      {cleanStatus}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Invitation prepared for{" "}
                    <span className="font-medium">{company}</span>.
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    Invited: {new Date(i.invitedUtc).toLocaleString()}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    {inviteLink && (
                      <button
                        onClick={() => copyInviteLink(i.email, inviteLink)}
                        className="text-brand-500 hover:underline text-sm"
                      >
                        Copy Invite Link
                      </button>
                    )}

                    <button
                      onClick={() =>
                        resendInvite({
                          ...i,
                          role: cleanRole,
                        })
                      }
                      className="text-brand-500 hover:underline text-sm"
                    >
                      Resend Invite
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "Roles" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.roleSummary.length === 0 && (
            <div className="card text-sm text-gray-500">
              No roles are assigned yet.
            </div>
          )}

          {data.roleSummary.map((r) => (
            <div key={r.role} className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{r.role}</div>
                  <div className="text-sm text-gray-500">Assigned users</div>
                </div>

                <div className="text-3xl font-bold">{r.count}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Permissions" && (
        <div className="card">
          <h2 className="font-semibold mb-4">Permission Matrix</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2">Permission</th>
                  <th>Tenant Admin</th>
                  <th>Security Manager</th>
                  <th>Security Analyst</th>
                  <th>Auditor</th>
                  <th>Read Only</th>
                </tr>
              </thead>

              <tbody>
                {[
                  ["Manage Users", "Yes", "No", "No", "No", "No"],
                  ["Run Scans", "Yes", "Yes", "Yes", "No", "No"],
                  ["View Reports", "Yes", "Yes", "Yes", "Yes", "Yes"],
                  ["Manage Compliance", "Yes", "Yes", "No", "Yes", "No"],
                  ["Manage Billing", "Yes", "No", "No", "No", "No"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-gray-100 dark:border-gray-800">
                    {row.map((cell, index) => (
                      <td key={`${row[0]}-${index}`} className="py-3">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "Reports" && (
        <div className="card">
          <h2 className="font-semibold mb-4">User Access Reports</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="font-semibold">User Access Review</div>
              <div className="text-sm text-gray-500 mt-1">Active users, roles, and inactive accounts.</div>
              <button onClick={generateUserAccessReport} className="btn-primary mt-4">
                Generate Report
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="font-semibold">Invitation Report</div>
              <div className="text-sm text-gray-500 mt-1">Pending and accepted invitations.</div>
              <button onClick={generateInvitationReport} className="btn-primary mt-4">
                Generate Report
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="font-semibold">RBAC Report</div>
              <div className="text-sm text-gray-500 mt-1">Roles and permission mapping.</div>
              <button onClick={generateRbacReport} className="btn-primary mt-4">
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "Settings" && (
        <div className="card">
          <h2 className="font-semibold mb-4">User Management Settings</h2>

          {settingsMessage && (
            <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-500 p-3 text-sm mb-4">
              {settingsMessage}
            </div>
          )}

          <div className="space-y-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Invitation Expiry</div>
                <div className="text-sm text-gray-500">
                  Recommended: invitations expire after 7 days.
                </div>
              </div>

              <button
                onClick={() => saveSetting("Invitation Expiry")}
                className="btn-primary"
              >
                Save
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">MFA Policy</div>
                <div className="text-sm text-gray-500">
                  Require MFA for Tenant Admins and Security Managers.
                </div>
              </div>

              <button
                onClick={() => saveSetting("MFA Policy")}
                className="btn-primary"
              >
                Save
              </button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Role Governance</div>
                <div className="text-sm text-gray-500">
                  Review privileged access every 90 days.
                </div>
              </div>

              <button
                onClick={() => saveSetting("Role Governance")}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

