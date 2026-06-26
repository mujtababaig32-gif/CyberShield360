import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";

const PACKAGES = [
  {
    name: "Website Security Assessment",
    tag: "Starter",
    fit: "Small business websites",
    description: "For small business websites that need a professional security review.",
    items: [
      "Website posture scan",
      "SSL, DNS, headers, and email security checks",
      "Risk report",
      "Executive summary",
      "Fix recommendations",
      "One review call",
    ],
  },
  {
    name: "Assessment + Fixing",
    tag: "Best Value",
    fit: "Clients who want help fixing common issues",
    description: "For clients who want CyberShield360 to identify and help fix common issues.",
    items: [
      "Everything in Website Security Assessment",
      "Common security header fixes",
      "DNS/email security guidance",
      "Admin panel hardening guidance",
      "Before/after score comparison",
      "Final improved report",
    ],
  },
  {
    name: "Business Security Readiness",
    tag: "Advanced",
    fit: "Larger clients and teams",
    description: "For larger clients that need assessment, remediation, training, and support.",
    items: [
      "Website/app posture scan",
      "Asset inventory",
      "Vulnerability and risk report",
      "Compliance readiness check",
      "Team training session",
      "30-day support window",
    ],
  },
];

const PRICING_MODEL = [
  ["Assessment Fee", "Fixed starting scope based on number of assets and report depth."],
  ["Optional Fixing Fee", "Quoted after findings are confirmed and remediation scope is approved."],
  ["Optional Training Fee", "Added when the client wants team awareness or report handover training."],
];

export default function ClientPackages() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
        <div className="mb-3 inline-flex rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-brand-300">
          Client Success Hub
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white">
          Client Packages
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
          CyberShield360 can be sold as a one-time assessment, assessment plus fixing,
          or full business readiness package. This is easier for non-technical clients
          to understand than a monthly SaaS subscription.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CyberStatCard label="Packages" value="3" hint="Simple buying options" tone="brand" />
        <CyberStatCard label="Best Offer" value="Fixing" hint="Assessment + remediation" tone="green" />
        <CyberStatCard label="Pricing" value="Scoped" hint="Depends on assets/issues" tone="orange" />
        <CyberStatCard label="Training" value="Optional" hint="Add-on value" tone="brand" />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.name}
            className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-center shadow-xl shadow-black/10"
          >
            <div className="mb-4 flex justify-center">
              <CyberStatusBadge value={pkg.tag} />
            </div>

            <h2 className="text-xl font-black text-white">{pkg.name}</h2>
            <p className="mt-2 text-sm font-semibold text-brand-300">{pkg.fit}</p>
            <p className="mt-2 min-h-16 text-sm leading-6 text-slate-400">{pkg.description}</p>

            <div className="mt-5 space-y-3 text-left">
              {pkg.items.map((item) => (
                <div key={item} className="flex gap-3 text-sm text-slate-300">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/10">
        <h2 className="text-xl font-black text-white">Recommended Pricing Model</h2>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PRICING_MODEL.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
              <div className="font-black text-white">{title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-400">{text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
