import { useEffect, useMemo, useState } from "react";
import { BillingApi } from "../api/endpoints";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";

type BillingSummary = {
  generatedUtc: string;
  provider: string;
  currentPlan: {
    name: string;
    status: string;
    trialEndsUtc: string;
    billingProvider: string;
  };
  configuration: {
    apiKey: string;
    storeId: string;
    variantId: string;
    webhookSecret: string;
    status: string;
  };
  readiness: {
    item: string;
    status: string;
  }[];
  recommendations: string[];
};

export default function Billing() {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);

    BillingApi.summary()
      .then(setData)
      .catch(() => setError("Unable to load billing summary."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const startCheckout = async () => {
    try {
      setCheckoutLoading(true);
      setError(null);

      const result = await BillingApi.checkout({
        successUrl: `${window.location.origin}/billing?success=true`,
        cancelUrl: `${window.location.origin}/billing?cancelled=true`,
      });

      if (!result?.url) {
        setError("Checkout URL was not returned.");
        return;
      }

      window.location.href = result.url;
    } catch {
      setError("Unable to start Lemon Squeezy checkout. Check billing configuration.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const statusMessage = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      return {
        type: "success",
        text: "Payment completed successfully. Subscription status will update after webhook processing.",
      };
    }
    if (params.get("cancelled") === "true") {
      return {
        type: "warning",
        text: "Checkout was cancelled. You can restart checkout anytime.",
      };
    }
    return null;
  }, []);

  if (loading) {
    return <div className="card">Loading billing...</div>;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error ?? "Billing data unavailable."}
      </div>
    );
  }

  const isReady = data.configuration.status === "Ready";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Billing</h1>
          <p className="text-sm text-gray-500">
            Manage CyberShield360 subscription, checkout, and billing readiness.
          </p>
        </div>

        <button type="button" onClick={load} className="btn-ghost">
          Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      {statusMessage && (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            statusMessage.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CyberStatCard label="Current Plan" value={data.currentPlan.name} hint={data.currentPlan.status} tone="brand" />
        <CyberStatCard label="Provider" value={data.provider} hint={data.currentPlan.billingProvider} tone="green" />
        <CyberStatCard label="Configuration" value={data.configuration.status} hint={isReady ? "Ready for checkout" : "Add billing keys"} tone={isReady ? "green" : "orange"} />
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">Lemon Squeezy Checkout</h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Start a hosted subscription checkout session for the current tenant.
            </p>
            {!isReady && (
              <div className="mt-3 text-xs text-slate-500">
                Checkout is disabled until API Key, Store ID, and Variant ID are configured.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={startCheckout}
            disabled={!isReady || checkoutLoading}
            className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutLoading ? "Starting checkout..." : "Upgrade Plan"}
          </button>
        </div>
      </section>

      <CyberTable
        title="Billing Readiness"
        description="Billing configuration items required before accepting live payments."
        data={data.readiness}
        emptyText="No billing readiness items available."
        columns={[
          {
            key: "item",
            label: "Item",
            render: (item) => (
              <div className="mx-auto min-w-80 text-center font-semibold text-white">{item.item}</div>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (item) => <CyberStatusBadge value={item.status} />,
          },
        ]}
      />

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
        <h2 className="text-lg font-black tracking-tight text-white">Recommendations</h2>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {data.recommendations.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
            >
              <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                Recommendation #{index + 1}
              </div>
              <div className="mt-2 text-sm font-medium leading-6 text-slate-300">{item}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 text-xs text-slate-500">
          Generated: {new Date(data.generatedUtc).toLocaleString()}
        </div>
      </section>
    </div>
  );
}
