import { useEffect, useState } from "react";
import { SocApi } from "../api/endpoints";

type SocAlert = {
  title: string;
  severity: string;
  source: string;
  recommendation?: string;
  createdUtc: string;
};

type SocSummary = {
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  openIncidents: number;
  resolvedIncidents: number;
  mttrHours: number;
  alerts: SocAlert[];
};

function severityColor(severity: string) {
  if (severity === "Critical") return "bg-red-700";
  if (severity === "High") return "bg-red-600";
  if (severity === "Medium") return "bg-orange-500";
  return "bg-yellow-500";
}

export default function SocCenter() {
  const [data, setData] = useState<SocSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    SocApi.summary()
      .then(setData)
      .catch(() => setError("Failed to load SOC center."));
  }, []);

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading SOC center...</div>;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">SOC / Incident Response Center</h1>
        <p className="text-sm text-gray-500">
          Security operations view for alerts, incidents, severity triage, and analyst response.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">Critical Alerts</div>
          <div className="text-3xl font-bold text-red-700">{data.criticalAlerts}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">High Alerts</div>
          <div className="text-3xl font-bold text-red-600">{data.highAlerts}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Medium Alerts</div>
          <div className="text-3xl font-bold text-orange-500">{data.mediumAlerts}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Low Alerts</div>
          <div className="text-3xl font-bold text-yellow-500">{data.lowAlerts}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">Open Incidents</div>
          <div className="text-3xl font-bold">{data.openIncidents}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Resolved Signals</div>
          <div className="text-3xl font-bold text-green-600">{data.resolvedIncidents}</div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">MTTR</div>
          <div className="text-3xl font-bold">{data.mttrHours}h</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold mb-4">Alert Queue</h2>

          {data.alerts.length === 0 ? (
            <div className="text-sm text-gray-500">No active alerts.</div>
          ) : (
            <div className="space-y-3">
              {data.alerts.map((a, i) => (
                <div
                  key={`${a.source}-${i}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="font-semibold">{a.title}</div>
                    <span className={`badge ${severityColor(a.severity)}`}>
                      {a.severity}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-2">
                    Source: {a.source} · Created: {new Date(a.createdUtc).toLocaleString()}
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {a.recommendation ?? "Review and investigate this alert."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">MITRE ATT&CK Mapping</h2>

          <div className="space-y-3">
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="font-medium">Initial Access</div>
              <div className="text-xs text-gray-500">Public exposure and weak web controls</div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="font-medium">Discovery</div>
              <div className="text-xs text-gray-500">Technology fingerprinting and exposed services</div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="font-medium">Credential Access</div>
              <div className="text-xs text-gray-500">Email authentication and spoofing weaknesses</div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <div className="font-medium">Impact</div>
              <div className="text-xs text-gray-500">Weak posture increasing business risk</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}