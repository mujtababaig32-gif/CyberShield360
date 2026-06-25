import { useEffect, useState } from "react";
import { ProfileApi } from "../api/endpoints";

type ProfileSummary = {
  generatedUtc: string;
  user: {
    id?: string;
    name: string;
    email?: string;
    role: string;
    mfaStatus: string;
    loginMethod: string;
  };
  tenant: {
    id?: string;
    name: string;
    status: string;
    plan: string;
  };
  security: {
    passwordLastChanged: string;
    activeSessions: number;
    lastLogin: string;
  };
  recommendations: string[];
};

function badgeColor(value: string) {
  if (value === "Active" || value === "Enabled") return "bg-green-600";
  if (value === "Not Enabled") return "bg-orange-500";
  return "bg-gray-600";
}

export default function Profile() {
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ProfileApi.summary()
      .then(setData)
      .catch(() => setError("Failed to load profile."));
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading profile...</div>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">My Profile</h1>
        <p className="text-sm text-gray-500">
          Manage account details, tenant information, login method, MFA status, and security recommendations.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-2xl font-bold">
              {data.user.name?.charAt(0) || "U"}
            </div>

            <div>
              <div className="text-2xl font-bold">{data.user.name}</div>
              <div className="text-sm text-gray-500">{data.user.email}</div>
              <div className="mt-2">
                <span className="badge bg-brand-600">{data.user.role}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Tenant Plan</div>
          <div className="text-3xl font-bold">{data.tenant.plan}</div>
          <div className="mt-2">
            <span className={`badge ${badgeColor(data.tenant.status)}`}>
              {data.tenant.status}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Account Information</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{data.user.name}</span>
            </div>

            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{data.user.email}</span>
            </div>

            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-500">Role</span>
              <span className="font-medium">{data.user.role}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Login Method</span>
              <span className="font-medium">{data.user.loginMethod}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Tenant Information</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-500">Tenant</span>
              <span className="font-medium">{data.tenant.name}</span>
            </div>

            <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span className="text-gray-500">Status</span>
              <span className={`badge ${badgeColor(data.tenant.status)}`}>
                {data.tenant.status}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="font-medium">{data.tenant.plan}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Security Overview</h2>

          <div className="space-y-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-semibold">MFA Status</div>
                  <div className="text-sm text-gray-500">Multi-factor authentication</div>
                </div>

                <span className={`badge ${badgeColor(data.user.mfaStatus)}`}>
                  {data.user.mfaStatus}
                </span>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="font-semibold">Active Sessions</div>
              <div className="text-sm text-gray-500">{data.security.activeSessions} active session(s)</div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="font-semibold">Password Last Changed</div>
              <div className="text-sm text-gray-500">{data.security.passwordLastChanged}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Recommendations</h2>

          <div className="space-y-3">
            {data.recommendations.map((r, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Recommendation #{i + 1}</div>
                <div className="font-medium">{r}</div>
              </div>
            ))}
          </div>

          <div className="pt-4 text-xs text-gray-500">
            Generated: {new Date(data.generatedUtc).toLocaleString()}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-4">Account Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="font-semibold">Change Password</div>
            <div className="text-sm text-gray-500 mt-1">Update your account password.</div>
          </button>

          <button className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="font-semibold">Enable MFA</div>
            <div className="text-sm text-gray-500 mt-1">Add an extra login protection layer.</div>
          </button>

          <button className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="font-semibold">View Audit Activity</div>
            <div className="text-sm text-gray-500 mt-1">Review your recent account activity.</div>
          </button>
        </div>
      </section>
    </div>
  );
}