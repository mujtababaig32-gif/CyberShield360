import { useEffect, useState } from "react";
import { TenantRegistrationApi } from "../api/endpoints";

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

export default function TenantRegistration() {
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

  const submitPreview = async () => {
    try {
      setMessage("Creating registration preview...");

      const result = await TenantRegistrationApi.preview({
        companyName,
        adminName,
        adminEmail,
        plan,
      });

      setPreview(result);
      setMessage("Registration preview created successfully.");
      setStep(4);
    } catch {
      setMessage("Failed to create registration preview.");
    }
  };

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading tenant registration...</div>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Tenant Registration</h1>
        <p className="text-sm text-gray-500">
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
                ? "border-brand-600 bg-brand-50 dark:bg-blue-950"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="text-xs text-gray-500">Step {s.step}</div>
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-gray-500">{s.status}</div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">Signup Status</div>
          <div className="text-xl font-bold">{data.signupStatus}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Selected Plan</div>
          <div className="text-xl font-bold">{plan}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Payment</div>
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
              <label className="text-sm text-gray-500">Company Name</label>
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
              <label className="text-sm text-gray-500">Admin Name</label>
              <input
                className="input mt-1"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Mujtaba Baig"
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">Admin Email</label>
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
                  ? "border-brand-600"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="text-xl font-bold">{p.name}</div>
              <div className="text-3xl font-bold mt-2">${p.price}</div>
              <div className="text-xs text-gray-500 mb-4">per month</div>

              <p className="text-sm text-gray-500 mb-4">{p.description}</p>

              <div className="space-y-2 text-sm">
                <div>Assets: <b>{p.assets}</b></div>
                <div>Users: <b>{p.users}</b></div>
                <div>Scans: <b>{p.scans}</b></div>
              </div>

              <button
                className="btn-primary mt-5 w-full"
                onClick={() => {
                  setPlan(p.name);
                  submitPreview();
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
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500">Company</div>
                <div className="font-semibold">{preview.company}</div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500">Admin</div>
                <div className="font-semibold">{preview.admin}</div>
                <div className="text-xs text-gray-500">{preview.email}</div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500">Plan</div>
                <div className="font-semibold">{preview.selectedPlan}</div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500">Preview Tenant ID</div>
                <div className="font-semibold break-all">{preview.previewTenantId}</div>
              </div>

              <div className="md:col-span-2 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-500">Next Step</div>
                <div className="font-medium">{preview.nextStep}</div>
              </div>

              <button className="btn-primary" onClick={() => setStep(5)}>
                Launch Workspace
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                No preview created yet.
              </p>

              <button className="btn-primary" onClick={submitPreview}>
                Create Preview
              </button>
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Workspace Launch</h2>

          <div className="border border-green-200 dark:border-green-800 rounded-xl p-6 bg-green-50 dark:bg-green-950">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
              Workspace Ready
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              In production, this final step will create the tenant, admin user,
              Stripe checkout session, onboarding records, and redirect the admin
              into CyberShield360.
            </p>

            <button className="btn-primary">
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      <section className="card mt-6">
        <h2 className="font-semibold mb-4">Registration Recommendations</h2>

        <div className="space-y-3">
          {data.recommendations.map((r, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Recommendation #{i + 1}</div>
              <div className="font-medium">{r}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}