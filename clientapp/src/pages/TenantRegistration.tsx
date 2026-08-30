import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { TenantRegistrationApi } from "../api/endpoints";
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

type PreviewResult = {
  message: string;
  company: string;
  admin: string;
  email: string;
  selectedPlan: string;
  nextStep: string;
  previewTenantId: string;
  createdUtc: string;
};

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
  const [data, setData] = useState<RegistrationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("CyberShield360");
  const [adminName, setAdminName] = useState("Mujtaba Baig");
  const [adminEmail, setAdminEmail] = useState("admin@cybershield360.com");
  const [plan, setPlan] = useState("Growth");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    TenantRegistrationApi.summary()
      .then(setData)
      .catch(() => setError("Failed to load tenant registration."));
  }, []);

  const submitPreview = async (planOverride?: string) => {
    try {
      setMessage("Creating registration preview...");

      const result = await TenantRegistrationApi.preview({
        companyName,
        adminName,
        adminEmail,
        plan: planOverride ?? plan,
      });

      setPreview(result);
      setMessage("Registration preview created successfully.");
      setStep(4);
    } catch {
      setMessage("Failed to create registration preview.");
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
            onClick={() => setStep(s.step)}
            className={`border rounded-xl p-4 text-left ${
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
          <div className="text-xl font-bold">{data.signupStatus}</div>
        </div>

        <div className="card">
          <div className="text-xs text-slate-400">Selected Plan</div>
          <div className="text-xl font-bold">{plan}</div>
        </div>

        <div className="card">
          <div className="text-xs text-slate-400">Payment</div>
          <div className="text-xl font-bold text-orange-500">{data.paymentStatus}</div>
        </div>
      </section>

      {message && (
        <div className="card mb-6 text-sm text-brand-500">
          {message}
        </div>
      )}

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

            <button className="btn-primary" onClick={() => setStep(2)}>
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
                placeholder="Mujtaba Baig"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400">Admin Email</label>
              <input
                className="input mt-1"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@cybershield360.com"
              />
            </div>

            <button className="btn-primary" onClick={() => setStep(3)}>
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
              <div className="text-xs text-slate-400 mb-4">per month</div>

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
                  submitPreview(p.name);
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
          <h2 className="font-semibold mb-4">Registration Preview</h2>

          {preview ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-xs text-slate-400">Company</div>
                <div className="font-semibold">{preview.company}</div>
              </div>

              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-xs text-slate-400">Admin</div>
                <div className="font-semibold">{preview.admin}</div>
                <div className="text-xs text-slate-400">{preview.email}</div>
              </div>

              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-xs text-slate-400">Plan</div>
                <div className="font-semibold">{preview.selectedPlan}</div>
              </div>

              <div className="border border-white/10 rounded-xl p-4">
                <div className="text-xs text-slate-400">Preview Tenant ID</div>
                <div className="font-semibold break-all">{preview.previewTenantId}</div>
              </div>

              <div className="md:col-span-2 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-slate-400">Next Step</div>
                <div className="font-medium">{preview.nextStep}</div>
              </div>

              <button className="btn-primary" onClick={() => setStep(5)}>
                Launch Workspace
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-400 mb-4">
                No preview created yet.
              </p>

              <button className="btn-primary" onClick={() => submitPreview()}>
                Create Preview
              </button>
            </div>
          )}
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
              In production, this final step will create the tenant, admin user,
              Stripe checkout session, onboarding records, and redirect the admin
              into CyberShield360.
            </p>

            <button className="btn-primary" onClick={() => navigate("/login")}>
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