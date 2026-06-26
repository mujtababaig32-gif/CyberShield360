import { useEffect, useState } from "react";
import { ProfileApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";

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

export default function Profile() {
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await ProfileApi.summary();
      setData(result);
    } catch {
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-500">Loading profile...</div>;
  }

  const initials = data.user.name
    ?.split(" ")
    .map((item) => item[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">My Profile</h1>
          <p className="text-sm text-gray-500">
            Manage account details, tenant information, login method, MFA status, and security recommendations.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} className="btn-ghost">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-2xl font-black text-white">
              {initials}
            </div>

            <div>
              <div className="text-2xl font-black text-white">{data.user.name}</div>
              <div className="mt-1 break-all text-sm text-slate-400">{data.user.email}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <CyberStatusBadge value={data.user.role} />
                <CyberStatusBadge value={data.user.loginMethod} />
                <CyberStatusBadge value={data.user.mfaStatus} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-5 py-4 text-center">
            <div className="text-xs font-black uppercase tracking-wide text-brand-300">Tenant</div>
            <div className="mt-1 font-black text-white">{data.tenant.name}</div>
            <div className="mt-2 flex justify-center gap-2">
              <CyberStatusBadge value={data.tenant.status} />
              <CyberStatusBadge value={data.tenant.plan} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Role" value={data.user.role} hint="Access level" tone="brand" />
        <CyberStatCard label="MFA" value={data.user.mfaStatus} hint="Account protection" tone={data.user.mfaStatus === "Enabled" ? "green" : "orange"} />
        <CyberStatCard label="Sessions" value={data.security.activeSessions} hint="Active sessions" tone="brand" />
        <CyberStatCard label="Plan" value={data.tenant.plan} hint={data.tenant.status} tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <h2 className="text-lg font-black tracking-tight text-white">Account Information</h2>

          <div className="mt-5 space-y-3 text-sm">
            {[
              ["Name", data.user.name],
              ["Email", data.user.email ?? "-"],
              ["Role", data.user.role],
              ["Login Method", data.user.loginMethod],
              ["Last Login", data.security.lastLogin],
              ["Password Last Changed", data.security.passwordLastChanged],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <span className="text-slate-500">{label}</span>
                <span className="break-all text-right font-semibold text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <h2 className="text-lg font-black tracking-tight text-white">Security Recommendations</h2>

          <div className="mt-5 space-y-3">
            {data.recommendations.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                No account recommendations available.
              </div>
            ) : (
              data.recommendations.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                >
                  <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                    Recommendation #{index + 1}
                  </div>
                  <div className="mt-2 text-sm font-medium leading-6 text-slate-300">{item}</div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 text-xs text-slate-500">
            Generated: {new Date(data.generatedUtc).toLocaleString()}
          </div>
        </section>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <h2 className="text-lg font-black tracking-tight text-white">Account Actions</h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["Change Password", "Update your account password."],
            ["Enable MFA", "Add an extra login protection layer."],
            ["View Audit Activity", "Review your recent account activity."],
          ].map(([title, text]) => (
            <button
              key={title}
              type="button"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center transition hover:border-brand-500/40 hover:bg-brand-500/10"
            >
              <div className="font-semibold text-white">{title}</div>
              <div className="mt-1 text-sm text-slate-500">{text}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
