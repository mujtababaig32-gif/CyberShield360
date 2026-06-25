import { useEffect, useState } from "react";
import { MicrosoftAuthApi } from "../api/endpoints";

type Readiness = {
  item: string;
  status: string;
};

type MicrosoftAuthSummary = {
  generatedUtc: string;
  provider: string;
  configuration: {
    tenantId: string;
    clientId: string;
    redirectUri: string;
    status: string;
  };
  capabilities: string[];
  readiness: Readiness[];
  recommendations: string[];
};

function badgeColor(status: string) {
  if (status === "Configured" || status === "Enabled") return "bg-green-600";
  if (status === "Pending") return "bg-orange-500";
  return "bg-gray-600";
}

export default function MicrosoftAuth() {
  const [data, setData] = useState<MicrosoftAuthSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    MicrosoftAuthApi.summary()
      .then(setData)
      .catch(() => setError("Failed to load Microsoft login settings."));
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading Microsoft login settings...</div>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Microsoft Login</h1>
        <p className="text-sm text-gray-500">
          Configure Microsoft Entra ID / Microsoft 365 authentication for enterprise SSO.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">Provider</div>
          <div className="text-xl font-bold">{data.provider}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Status</div>
          <span className={`badge ${badgeColor(data.configuration.status)}`}>
            {data.configuration.status}
          </span>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Tenant ID</div>
          <div className="font-semibold truncate">{data.configuration.tenantId}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Client ID</div>
          <div className="font-semibold truncate">{data.configuration.clientId}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Configuration Readiness</h2>

          <div className="space-y-3">
            {data.readiness.map((r) => (
              <div
                key={r.item}
                className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-xl p-4"
              >
                <div className="font-medium">{r.item}</div>
                <span className={`badge ${badgeColor(r.status)}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Recommendations</h2>

          <div className="space-y-3">
            {data.recommendations.map((r, i) => (
              <div
                key={i}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
              >
                <div className="text-xs text-gray-500 mb-1">
                  Step #{i + 1}
                </div>
                <div className="font-medium">{r}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="font-semibold mb-4">Microsoft SSO Capabilities</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.capabilities.map((c) => (
            <div
              key={c}
              className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
            >
              <div className="font-medium">{c}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-4">Azure App Registration Setup</h2>

        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          <p>
            To enable real Microsoft login, create an Azure App Registration,
            configure the redirect URI, and store Client ID / Tenant ID in
            backend environment variables.
          </p>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="font-semibold mb-1">Recommended Redirect URI</div>
            <code className="text-xs">
              https://yourdomain.com/auth/microsoft/callback
            </code>
          </div>

          <div className="text-xs text-gray-500">
            Generated: {new Date(data.generatedUtc).toLocaleString()}
          </div>
        </div>
      </section>
    </div>
  );
}