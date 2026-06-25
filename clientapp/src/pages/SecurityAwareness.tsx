import { useEffect, useMemo, useState } from "react";
import { SecurityAwarenessApi } from "../api/endpoints";

type Learner = {
  userId: string;
  name: string;
  email: string;
  department: string;
  assignedCourses: number;
  completedCourses: number;
  completionPercent: number;
  quizScore: number;
  overdueCourses?: number;
  riskLevel: string;
  status: string;
  lastTrainingUtc?: string | null;
  recommendedAction: string;
};

type Course = {
  id: string;
  title: string;
  category: string;
  durationMinutes: number;
  difficulty: string;
  completionRate: number;
  assignedLearners?: number;
  status: string;
};

type Campaign = {
  name: string;
  audience: string;
  status: string;
  completionRate: number;
  dueDateUtc?: string | null;
};

type AwarenessSummary = {
  generatedUtc: string;
  totalLearners: number;
  averageCompletion: number;
  averageQuizScore: number;
  highRiskUsers: number;
  inProgressUsers: number;
  completedUsers: number;
  unassignedUsers?: number;
  learners: Learner[];
  courses: Course[];
  campaigns: Campaign[];
  recommendations: string[];
};

const TABS = ["Overview", "Learners", "Courses", "Campaigns", "Reports", "Settings"];

function badgeColor(value: string) {
  const v = value.toLowerCase();
  if (v.includes("critical") || v.includes("high") || v.includes("overdue")) return "bg-red-600";
  if (v.includes("medium") || v.includes("progress") || v.includes("draft")) return "bg-orange-500";
  if (v.includes("completed") || v.includes("published") || v.includes("low")) return "bg-green-600";
  return "bg-gray-600";
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

export default function SecurityAwareness() {
  const [data, setData] = useState<AwarenessSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const result = await SecurityAwarenessApi.summary();
      setData(result);
    } catch {
      setError("Failed to load security awareness.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLearners = useMemo(() => {
    if (!data) return [];
    return data.learners.filter((learner) => {
      const q = query.toLowerCase();
      const matchesQuery =
        learner.name.toLowerCase().includes(q) ||
        learner.email.toLowerCase().includes(q) ||
        learner.department.toLowerCase().includes(q);
      const matchesRisk = riskFilter === "All" || learner.riskLevel === riskFilter;
      return matchesQuery && matchesRisk;
    });
  }, [data, query, riskFilter]);

  const exportLearners = () => {
    if (!data) return;
    const rows = [
      ["Name", "Email", "Department", "Assigned", "Completed", "Completion", "Quiz Score", "Risk", "Status", "Last Training", "Recommended Action"],
      ...filteredLearners.map((l) => [
        l.name,
        l.email,
        l.department,
        l.assignedCourses,
        l.completedCourses,
        `${l.completionPercent}%`,
        `${l.quizScore}%`,
        l.riskLevel,
        l.status,
        l.lastTrainingUtc || "",
        l.recommendedAction,
      ]),
    ];
    downloadTextFile("cybershield360-awareness-learners.csv", rows.map((r) => r.map(csvSafe).join(",")).join("\n"));
    setMessage("Learner report downloaded.");
  };

  const saveSetting = (name: string) => {
    localStorage.setItem(`cs360_awareness_${name}`, "enabled");
    setMessage(`${name} setting saved locally.`);
  };

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return <div className="text-gray-500">Loading security awareness...</div>;

  return (
    <div>
      <header className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Security Awareness Training</h1>
          <p className="text-sm text-gray-500">
            Measure real training enrollment, course completion, quiz scores, and high-risk users.
          </p>
        </div>
        <button onClick={load} className="btn-ghost border border-gray-200 dark:border-gray-700">
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm border ${
              tab === t
                ? "bg-brand-600 text-white border-brand-600"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 text-brand-500 p-3 text-sm mb-4">
          {message}
        </div>
      )}

      {tab === "Overview" && (
        <div>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="card"><div className="text-xs text-gray-500">Total Learners</div><div className="text-3xl font-bold">{data.totalLearners}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Avg Completion</div><div className="text-3xl font-bold">{data.averageCompletion}%</div></div>
            <div className="card"><div className="text-xs text-gray-500">Avg Quiz Score</div><div className="text-3xl font-bold">{data.averageQuizScore}%</div></div>
            <div className="card"><div className="text-xs text-gray-500">High Risk Users</div><div className="text-3xl font-bold text-red-600">{data.highRiskUsers}</div></div>
            <div className="card"><div className="text-xs text-gray-500">Unassigned</div><div className="text-3xl font-bold text-orange-500">{data.unassignedUsers ?? 0}</div></div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="font-semibold mb-4">Priority Recommendations</h2>
              <div className="space-y-3">
                {data.recommendations.map((r, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs text-gray-500 mb-1">Action #{i + 1}</div>
                    <div className="font-medium">{r}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-4">Program Health</h2>
              <div className="space-y-4">
                {["Completed", "In Progress", "High Risk", "No Training Assigned"].map((label) => {
                  const value =
                    label === "Completed" ? data.completedUsers :
                    label === "In Progress" ? data.inProgressUsers :
                    label === "High Risk" ? data.highRiskUsers :
                    data.unassignedUsers ?? 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1"><span>{label}</span><span className="font-semibold">{value}</span></div>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-brand-600" style={{ width: `${data.totalLearners === 0 ? 0 : Math.min(100, Math.round(value * 100 / data.totalLearners))}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 text-xs text-gray-500">Generated: {formatDate(data.generatedUtc)}</div>
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "Learners" && (
        <div className="card">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-4">
            <h2 className="font-semibold">Learner Risk Register</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input className="input" placeholder="Search learner, email, job title..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <select className="input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option>All</option><option>High</option><option>Medium</option><option>Low</option><option>Unassigned</option>
              </select>
              <button onClick={exportLearners} className="btn-primary">Export CSV</button>
            </div>
          </div>

          {filteredLearners.length === 0 ? (
            <div className="text-sm text-gray-500">No learners match the selected filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800"><th className="py-2">Learner</th><th>Job Title</th><th>Progress</th><th>Quiz</th><th>Risk</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredLearners.map((l) => (
                    <tr key={l.userId} className="border-b border-gray-100 dark:border-gray-800 align-top">
                      <td className="py-3"><div className="font-semibold">{l.name}</div><div className="text-xs text-gray-500">{l.email}</div></td>
                      <td>{l.department}</td>
                      <td>{l.completionPercent}% · {l.completedCourses}/{l.assignedCourses}</td>
                      <td>{l.quizScore > 0 ? `${l.quizScore}%` : "Not scored"}</td>
                      <td><span className={`badge ${badgeColor(l.riskLevel)}`}>{l.riskLevel}</span></td>
                      <td>{l.status}<div className="text-xs text-gray-500">{formatDate(l.lastTrainingUtc)}</div></td>
                      <td className="max-w-xs text-xs text-gray-500">{l.recommendedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "Courses" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.courses.length === 0 ? <div className="card text-sm text-gray-500">No training courses configured yet.</div> : data.courses.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-3"><div><div className="font-semibold">{c.title}</div><div className="text-xs text-gray-500">{c.category} · {c.difficulty}</div></div><span className={`badge ${badgeColor(c.status)}`}>{c.status}</span></div>
              <div className="text-sm text-gray-500 mb-3">Duration: {c.durationMinutes} minutes · Assigned learners: {c.assignedLearners ?? 0}</div>
              <div className="flex justify-between text-sm mb-1"><span>Completion Rate</span><span>{Math.round(c.completionRate)}%</span></div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2"><div className="bg-brand-600 h-2 rounded-full" style={{ width: `${Math.min(100, Math.round(c.completionRate))}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      {tab === "Campaigns" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.campaigns.length === 0 ? <div className="card text-sm text-gray-500">No awareness campaigns detected from current enrollments.</div> : data.campaigns.map((c) => (
            <div key={c.name} className="card"><div className="flex justify-between gap-3 mb-2"><div><div className="font-semibold">{c.name}</div><div className="text-xs text-gray-500">{c.audience}</div></div><span className="badge bg-brand-600">{c.status}</span></div><div className="text-sm mb-2">Completion Rate: {c.completionRate}%</div><div className="text-xs text-gray-500">Next due: {formatDate(c.dueDateUtc)}</div></div>
          ))}
        </div>
      )}

      {tab === "Reports" && (
        <div className="card">
          <h2 className="font-semibold mb-4">Awareness Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Learner Register</div><div className="text-sm text-gray-500 mt-1">Filtered learner progress and risk data.</div><button onClick={exportLearners} className="btn-primary mt-4">Download CSV</button></div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">Course Summary</div><div className="text-sm text-gray-500 mt-1">Course completion and publishing status.</div><button onClick={() => setTab("Courses")} className="btn-primary mt-4">View Courses</button></div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"><div className="font-semibold">High Risk Users</div><div className="text-sm text-gray-500 mt-1">Learners needing follow-up.</div><button onClick={() => { setRiskFilter("High"); setTab("Learners"); }} className="btn-primary mt-4">Review Users</button></div>
          </div>
        </div>
      )}

      {tab === "Settings" && (
        <div className="card">
          <h2 className="font-semibold mb-4">Training Settings</h2>
          <div className="space-y-3">
            {["Quarterly Training Cycle", "Overdue User Follow-up", "Quiz Retake Policy"].map((item) => (
              <div key={item} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4"><div><div className="font-semibold">{item}</div><div className="text-sm text-gray-500">Saved locally until dedicated settings endpoints are connected.</div></div><button onClick={() => saveSetting(item)} className="btn-primary">Save</button></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
