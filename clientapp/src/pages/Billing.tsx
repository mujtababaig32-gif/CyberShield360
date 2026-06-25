import { useEffect, useState } from "react";
import { BillingApi } from "../api/endpoints";

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

  if (loading) {
    return <div className="card">Loading billing...</div>;
  }

  if (!data) {
    return (
      <div className="card">
        <div className="text-red-500">{error ?? "Billing data unavailable."}</div>
      </div>
    );
  }

  const isReady = data.configuration.status === "Ready";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Billing</h1>
          <p className="text-sm text-gray-500">
            Manage CyberShield360 subscription, checkout, and billing readiness.
          </p>
        </div>

        <button
          onClick={load}
          className="border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 p-4 text-sm dark:bg-red-950 dark:border-red-900">
          {error}
        </div>
      )}

      {new URLSearchParams(window.location.search).get("success") === "true" && (
        <div className="rounded-xl border border-green-200 bg-green-50 text-green-700 p-4 text-sm dark:bg-green-950 dark:border-green-900">
          Payment completed successfully. Subscription status will update after webhook processing.
        </div>
      )}

      {new URLSearchParams(window.location.search).get("cancelled") === "true" && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-700 p-4 text-sm dark:bg-yellow-950 dark:border-yellow-900">
          Checkout was cancelled. You can restart checkout anytime.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-500">Current Plan</div>
          <div className="text-2xl font-bold mt-1">{data.currentPlan.name}</div>
          <div className="text-sm mt-2">
            Status:{" "}
            <span className="font-semibold text-brand-500">
              {data.currentPlan.status}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-500">Billing Provider</div>
          <div className="text-2xl font-bold mt-1">{data.provider}</div>
          <div className="text-sm text-gray-500 mt-2">
            Checkout powered by Lemon Squeezy.
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-500">Configuration</div>
          <div
            className={`text-2xl font-bold mt-1 ${
              isReady ? "text-green-600" : "text-yellow-600"
            }`}
          >
            {data.configuration.status}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {isReady ? "Ready for checkout." : "Add Lemon Squeezy keys to enable checkout."}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Lemon Squeezy Checkout</h2>

        <p className="text-sm text-gray-500 mb-4">
          Start a hosted subscription checkout session for the current tenant.
        </p>

        <button
          onClick={startCheckout}
          disabled={!isReady || checkoutLoading}
          className="btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checkoutLoading ? "Starting checkout..." : "Upgrade Plan"}
        </button>

        {!isReady && (
          <div className="text-xs text-gray-400 mt-3">
            Checkout is disabled until API Key, Store ID, and Variant ID are configured.
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Billing Readiness</h2>

        <div className="space-y-3">
          {data.readiness.map((item) => (
            <div
              key={item.item}
              className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <span className="text-sm">{item.item}</span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  item.status === "Configured"
                    ? "bg-green-100 text-green-700 dark:bg-green-950"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950"
                }`}
              >
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Recommendations</h2>

        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          {data.recommendations.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}