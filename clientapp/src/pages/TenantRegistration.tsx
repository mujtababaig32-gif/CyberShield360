import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthApi, TenantRegistrationApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import SecurityMeshBackground from "../components/SecurityMeshBackground";

type Plan = {
  name: string;
  price: number;
  description: string;
  assets: number;
  users: number;
  scans: number;
};

type RegistrationSummary = {
  generatedUtc: string;
  signupStatus: string;
  tenantCreation: string;
  adminCreation: string;
  planSelection: string;
  paymentStatus: string;
  plans: Plan[];
  steps: { step: number; name: string; status: string }[];
  recommendations: string[];
};

const PASSWORD_MIN_LENGTH = 10;

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.co.jp", "yahoo.com.au",
  "yahoo.ca", "yahoo.fr", "yahoo.de", "ymail.com", "rocketmail.com",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.it",
  "outlook.com", "outlook.co.uk", "outlook.in", "outlook.fr", "outlook.de",
  "live.com", "live.co.uk", "live.fr", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "aim.com",
  "protonmail.com", "proton.me", "pm.me",
  "gmx.com", "gmx.net", "gmx.de", "mail.com", "web.de",
  "zoho.com",
  "yandex.com", "yandex.ru",
  "qq.com", "163.com", "126.com", "sina.com", "sohu.com",
  "naver.com", "hanmail.net", "daum.net",
  "rediffmail.com",
  "inbox.com", "fastmail.com", "tutanota.com",
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "yopmail.com",
]);

function isFreeEmailDomain(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  return !!domain && FREE_EMAIL_DOMAINS.has(domain);
}

function passwordIssues(password: string) {
  const issues: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) issues.push(`at least ${PASSWORD_MIN_LENGTH} characters`);
  if (!/[a-z]/.test(password)) issues.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) issues.push("an uppercase letter");
  if (!/[0-9]/.test(password)) issues.push("a digit");
  if (!/[^a-zA-Z0-9]/.test(password)) issues.push("a symbol");
  return issues;
}

function TenantRegistrationShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <SecurityMeshBackground intensity="subtle" className="absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-10">{children}</div>
    </div>
  );
}

export default function TenantRegistration() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [data, setData] = useState<RegistrationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [plan, setPlan] = useState("Professional");

  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    TenantRegistrationApi.summary()
      .then(setData)
      .catch(() => setError("Failed to load tenant registration."));
  }, []);

  const createWorkspace = async () => {
    const issues = passwordIssues(password);
    if (issues.length > 0) {
      setSubmitErrors([`Password needs ${issues.join(", ")}.`]);
      return;
    }
    if (password !== confirmPassword) {
      setSubmitErrors(["Those passwords don't match."]);
      return;
    }

    setSubmitting(true);
    setSubmitErrors([]);

    try {
      const result = await AuthApi.register(companyName, adminEmail, password, adminName, plan);
      login(result, true);
      setCreated(true);
      setStep(5);
    } catch (err: any) {
      const serverErrors: string[] | undefined = err?.response?.data?.errors;
      if (serverErrors?.length) {
        setSubmitErrors(serverErrors);
      } else if (err?.response?.status) {
        setSubmitErrors(["Could not create the workspace. Please check your details and try again."]);
      } else {
        setSubmitErrors(["Could not reach the server. Check your connection and try again."]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <TenantRegistrationShell>
        <div className="mx-auto max-w-lg rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm font-semibold text-red-300 shadow-2xl shadow-black/40">
          {error}
        </div>
      </TenantRegistrationShell>
    );
  }

  if (!data) {
    return (
      <TenantRegistrationShell>
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center text-sm text-slate-400 shadow-2xl shadow-black/40">
          Loading tenant registration...
        </div>
      </TenantRegistrationShell>
    );
  }

  return (
    <TenantRegistrationShell>
      <header className="mb-6">
        <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">Tenant Registration</h1>
        <p className="text-sm text-slate-400">
          Register a company workspace, create the first admin user, select a plan, and launch CyberShield360.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-6">
        {data.steps.map((s) => (
          <button
            key={s.step}
            onClick={() => !created && s.step <= step && setStep(s.step)}
            disabled={created || s.step > step}
            className={`border rounded-xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
              step === s.step
                ? "border-brand-500 bg-brand-500/10"
                : "border-white/10"
            }`}
          >
            <div className="text-xs text-slate-400">Step {s.step}</div>
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-slate-400">{s.status}</div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-slate-400">Signup Status</div>
          <div className="text-xl font-bold">{created ? "Workspace Created" : data.signupStatus}</div>
        </div>

        <div className="card">
          <div className="text-xs text-slate-400">Selected Plan</div>
          <div className="text-xl font-bold">{plan}</div>
        </div>

        <div className="card">
          <div className="text-xs text-slate-400">Trial</div>
          <div className="text-xl font-bold text-brand-500">{data.paymentStatus}</div>
        </div>
      </section>

      {step === 1 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Company Details</h2>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="text-sm text-slate-400">Company Name</label>
              <input
                className="input mt-1"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Security"
              />
            </div>

            <button
              className="btn-primary"
              disabled={!companyName.trim()}
              onClick={() => setStep(2)}
            >
              Continue to Admin User
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Admin User</h2>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="text-sm text-slate-400">Admin Name</label>
              <input
                className="input mt-1"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Jordan Lee"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Admin Email</label>
              <input
                className="input mt-1"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@yourcompany.com"
              />
              {adminEmail.trim() && isFreeEmailDomain(adminEmail) ? (
                <p className="mt-1 text-xs text-red-400">
                  Please use your company email address — free providers like Gmail, Yahoo, and Outlook aren't accepted for company signup.
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Use a company email address, not a personal Gmail/Yahoo/Outlook account.</p>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-400">Password</label>
              <div className="login-password-wrap">
                <input
                  className="input mt-1"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                At least {PASSWORD_MIN_LENGTH} characters, with uppercase, lowercase, a digit, and a symbol.
              </p>
            </div>

            <div>
              <label className="text-sm text-slate-400">Confirm Password</label>
              <input
                className="input mt-1"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the password"
                autoComplete="new-password"
              />
            </div>

            <button
              className="btn-primary"
              disabled={
                !adminName.trim() ||
                !adminEmail.trim() ||
                isFreeEmailDomain(adminEmail) ||
                !password ||
                !confirmPassword
              }
              onClick={() => setStep(3)}
            >
              Continue to Plan Selection
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {data.plans.map((p) => (
            <div
              key={p.name}
              className={`card border ${
                plan === p.name
                  ? "border-brand-500"
                  : "border-white/10"
              }`}
            >
              <div className="text-xl font-bold">{p.name}</div>
              <div className="text-3xl font-bold mt-2">${p.price}</div>
              <div className="text-xs text-slate-400 mb-4">per month after trial</div>

              <p className="text-sm text-slate-400 mb-4">{p.description}</p>

              <div className="space-y-2 text-sm">
                <div>Assets: <b>{p.assets}</b></div>
                <div>Users: <b>{p.users}</b></div>
                <div>Scans: <b>{p.scans}</b></div>
              </div>

              <button
                className="btn-primary mt-5 w-full"
                onClick={() => {
                  setPlan(p.name);
                  setStep(4);
                }}
              >
                Select {p.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Review & Create</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Company</div>
              <div className="font-semibold">{companyName}</div>
            </div>

            <div className="border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400">Admin</div>
              <div className="font-semibold">{adminName}</div>
              <div className="text-xs text-slate-400">{adminEmail}</div>
            </div>

            <div className="border border-white/10 rounded-xl p-4 md:col-span-2">
              <div className="text-xs text-slate-400">Plan</div>
              <div className="font-semibold">{plan} — 14-day free trial, no card required</div>
            </div>
          </div>

          {submitErrors.length > 0 && (
            <div className="login-error mt-4" role="alert" aria-live="assertive">
              {submitErrors.map((e) => (
                <div key={e}>{e}</div>
              ))}
            </div>
          )}

          <button className="btn-primary mt-5" disabled={submitting} onClick={createWorkspace}>
            {submitting ? "Creating workspace..." : "Create Workspace"}
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Workspace Launch</h2>

          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-6">
            <div className="mb-2 text-2xl font-black text-emerald-300">
              Workspace Ready
            </div>

            <p className="mb-4 text-sm text-slate-300">
              {companyName} is live on the {plan} trial. You're signed in as {adminEmail}.
            </p>

            <button className="btn-primary" onClick={() => navigate("/")}>
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      <section className="card mt-6">
        <h2 className="font-semibold mb-4">Registration Recommendations</h2>

        <div className="space-y-3">
          {data.recommendations.map((r, i) => (
            <div key={i} className="border border-white/10 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-1">Recommendation #{i + 1}</div>
              <div className="font-medium">{r}</div>
            </div>
          ))}
        </div>
      </section>
    </TenantRegistrationShell>
  );
}
