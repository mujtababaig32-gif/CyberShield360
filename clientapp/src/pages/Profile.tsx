import { useEffect, useState, type FormEvent } from "react";
import { MfaApi, ProfileApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";

type MfaFlowStep = "idle" | "setup" | "recovery-codes" | "disable";
type MfaSetupData = { manualEntryKey: string; qrCodePngBase64: string; otpAuthUri: string };

type ProfileSummary = {
  generatedUtc: string;
  user: {
    id?: string;
    name: string;
    email?: string;
    role: string;
    mfaStatus: string;
    loginMethod: string;
    mfaAvailable?: boolean;
    mfaMessage?: string;
  };
  tenant: {
    id?: string;
    name: string;
    status: string;
    plan: string;
  };
  security: {
    passwordLastChangedUtc?: string | null;
    activeSessions: number;
    lastLoginUtc?: string | null;
    accountStatus?: string;
    loginTracking?: string;
    passwordTracking?: string;
  };
  recommendations: string[];
};

function formatDateTime(value?: string | null) {
  if (!value) return "Pending capture";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return (
    name
      ?.split(" ")
      .map((item) => item[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

function LoadingProfile() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex animate-pulse items-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-white/10" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-48 rounded-full bg-white/10" />
            <div className="h-4 w-72 rounded-full bg-white/10" />
            <div className="flex gap-2">
              <div className="h-7 w-24 rounded-full bg-white/10" />
              <div className="h-7 w-28 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["Role", "MFA", "Login", "Plan"].map((label) => (
          <div key={label} className="animate-pulse rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="mt-4 h-8 w-28 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-36 rounded-full bg-white/10" />
          </div>
        ))}
      </section>
    </div>
  );
}

export default function Profile() {
  const [data, setData] = useState<ProfileSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [mfaStep, setMfaStep] = useState<MfaFlowStep>("idle");
  const [mfaSetupData, setMfaSetupData] = useState<MfaSetupData | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await ProfileApi.summary();
      setData(result);
    } catch {
      setError("Failed to load profile security details. Please refresh or sign in again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const cancelMfaFlow = () => {
    setMfaStep("idle");
    setMfaSetupData(null);
    setMfaCode("");
    setMfaError(null);
    setDisablePassword("");
  };

  const startMfaSetup = async () => {
    setMfaBusy(true);
    setMfaError(null);

    try {
      const result = await MfaApi.setup();
      setMfaSetupData(result);
      setMfaStep("setup");
    } catch (err: any) {
      setMfaError(err?.response?.data?.message ?? "Could not start MFA setup.");
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmMfaSetup = async (e: FormEvent) => {
    e.preventDefault();
    setMfaBusy(true);
    setMfaError(null);

    try {
      const result = await MfaApi.verify(mfaCode.trim());
      setRecoveryCodes(result.recoveryCodes);
      setMfaStep("recovery-codes");
      setMfaCode("");
    } catch (err: any) {
      setMfaError(err?.response?.data?.message ?? "That code did not match. Try again.");
    } finally {
      setMfaBusy(false);
    }
  };

  const finishMfaSetup = () => {
    cancelMfaFlow();
    void load();
  };

  const submitDisableMfa = async (e: FormEvent) => {
    e.preventDefault();
    setMfaBusy(true);
    setMfaError(null);

    try {
      await MfaApi.disable(disablePassword.trim() || undefined);
      cancelMfaFlow();
      void load();
    } catch (err: any) {
      setMfaError(err?.response?.data?.message ?? "Could not disable MFA. Check your password.");
    } finally {
      setMfaBusy(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm font-semibold text-red-300">
        <div className="text-base font-black text-white">Profile could not be loaded</div>
        <p className="mt-2 leading-6">{error}</p>
        <button type="button" onClick={load} className="mt-4 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-bold text-red-200 transition hover:bg-red-500/10">
          Retry
        </button>
      </div>
    );
  }

  if (!data && loading) {
    return <LoadingProfile />;
  }

  if (!data) return null;

  const initials = getInitials(data.user.name);
  const mfaEnabled = data.user.mfaStatus === "Enabled";
  const passwordIsTracked = data.security.passwordTracking === "Active";
  const loginIsTracked = data.security.loginTracking === "Active";

  const accountRows: Array<[string, string]> = [
    ["Name", data.user.name],
    ["Email", data.user.email ?? "-"],
    ["Role", data.user.role],
    ["Login Method", data.user.loginMethod],
    ["Last Login", formatDateTime(data.security.lastLoginUtc)],
    ["Password Tracking", data.security.passwordTracking ?? "Pending"],
    ["Password Last Changed", formatDateTime(data.security.passwordLastChangedUtc)],
    ["Account Status", data.security.accountStatus ?? "Active"],
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">My Profile</h1>
          <p className="text-sm text-gray-500">
            Review account identity, login tracking, MFA readiness, and security recommendations.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} className="btn-ghost">
          {loading ? "Refreshing..." : "Refresh Security Details"}
        </button>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-2xl font-black text-white shadow-xl shadow-brand-500/20">
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
        <CyberStatCard
          label="MFA"
          value={data.user.mfaStatus}
          hint={mfaEnabled ? "Extra protection enabled" : "Not protected — enable it below"}
          tone={mfaEnabled ? "green" : "orange"}
        />
        <CyberStatCard
          label="Login Tracking"
          value={loginIsTracked ? "Active" : "Pending"}
          hint={formatDateTime(data.security.lastLoginUtc)}
          tone={loginIsTracked ? "green" : "orange"}
        />
        <CyberStatCard label="Plan" value={data.tenant.plan} hint={data.tenant.status} tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.85fr]">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <h2 className="text-lg font-black tracking-tight text-white">Account Information</h2>

          <div className="mt-5 space-y-3 text-sm">
            {accountRows.map(([label, value]) => (
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

        <section className="space-y-5">
          <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-5 shadow-2xl shadow-black/10">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-xl">🔐</div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">MFA Readiness</h2>
                <p className="mt-2 text-sm leading-6 text-orange-100/85">
                  {data.user.mfaMessage ?? "Multi-factor authentication is not enabled for this account."}
                </p>
              </div>
            </div>

            {mfaError && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {mfaError}
              </div>
            )}

            {mfaStep === "idle" && !mfaEnabled && (
              <button
                type="button"
                onClick={startMfaSetup}
                disabled={mfaBusy}
                className="btn-primary mt-4 w-full justify-center disabled:opacity-60"
              >
                {mfaBusy ? "Starting setup..." : "Enable MFA"}
              </button>
            )}

            {mfaStep === "idle" && mfaEnabled && (
              <button
                type="button"
                onClick={() => setMfaStep("disable")}
                className="mt-4 w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20"
              >
                Disable MFA
              </button>
            )}

            {mfaStep === "setup" && mfaSetupData && (
              <form onSubmit={confirmMfaSetup} className="mt-4 space-y-4">
                <p className="text-sm leading-6 text-orange-100/85">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), or enter the key manually.
                </p>

                <div className="flex justify-center rounded-2xl bg-white p-3">
                  <img
                    src={`data:image/png;base64,${mfaSetupData.qrCodePngBase64}`}
                    alt="MFA enrollment QR code"
                    className="h-40 w-40"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Manual entry key</div>
                  <div className="mt-1 break-all font-mono text-sm text-white">{mfaSetupData.manualEntryKey}</div>
                </div>

                <div>
                  <label htmlFor="mfa-setup-code" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Enter the 6-digit code
                  </label>
                  <input
                    id="mfa-setup-code"
                    className="input mt-2"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={cancelMfaFlow} className="btn-ghost flex-1 justify-center">
                    Cancel
                  </button>
                  <button type="submit" disabled={mfaBusy} className="btn-primary flex-1 justify-center disabled:opacity-60">
                    {mfaBusy ? "Verifying..." : "Confirm"}
                  </button>
                </div>
              </form>
            )}

            {mfaStep === "recovery-codes" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-3 text-sm leading-6 text-brand-100">
                  Save these recovery codes now. Each one can be used once to sign in if you lose access to your authenticator app. They will not be shown again.
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 font-mono text-sm text-white">
                  {recoveryCodes.map((code) => (
                    <div key={code} className="text-center">{code}</div>
                  ))}
                </div>

                <button type="button" onClick={finishMfaSetup} className="btn-primary w-full justify-center">
                  I've saved these codes
                </button>
              </div>
            )}

            {mfaStep === "disable" && (
              <form onSubmit={submitDisableMfa} className="mt-4 space-y-4">
                <p className="text-sm leading-6 text-orange-100/85">
                  {data.user.loginMethod === "Passwordless / OAuth"
                    ? "Confirm you want to disable MFA for this account."
                    : "Confirm your password to disable MFA."}
                </p>

                {data.user.loginMethod !== "Passwordless / OAuth" && (
                  <input
                    type="password"
                    className="input"
                    placeholder="Current password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    autoFocus
                    required
                  />
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={cancelMfaFlow} className="btn-ghost flex-1 justify-center">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mfaBusy}
                    className="flex-1 justify-center rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    {mfaBusy ? "Disabling..." : "Disable MFA"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
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
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
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
          </div>
        </section>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <h2 className="text-lg font-black tracking-tight text-white">Account Security Actions</h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            type="button"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center transition hover:border-brand-500/40 hover:bg-brand-500/10"
          >
            <div className="font-semibold text-white">Review Access</div>
            <div className="mt-1 text-sm text-slate-500">Check user roles and permissions.</div>
          </button>

          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center opacity-70"
          >
            <div className="font-semibold text-white">Change Password</div>
            <div className="mt-1 text-sm text-slate-500">
              Password change flow will be enabled in a later account-security batch.
            </div>
          </button>

          <button
            type="button"
            onClick={() => (mfaEnabled ? setMfaStep("disable") : void startMfaSetup())}
            disabled={mfaBusy}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center transition hover:border-brand-500/40 hover:bg-brand-500/10 disabled:opacity-60"
          >
            <div className="font-semibold text-white">{mfaEnabled ? "Disable MFA" : "Enable MFA"}</div>
            <div className="mt-1 text-sm text-slate-500">
              {mfaEnabled ? "Turn off multi-factor authentication." : "Protect this account with an authenticator app."}
            </div>
          </button>
        </div>

        {!passwordIsTracked && (
          <div className="mt-4 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-sm leading-6 text-slate-300">
            Password tracking has been added. Existing accounts will show a baseline after the next successful login or password update.
          </div>
        )}
      </section>
    </div>
  );
}
