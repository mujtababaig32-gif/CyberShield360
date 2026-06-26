import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SecurityAwarenessApi } from "../api/endpoints";
import CyberChartCard from "../components/CyberChartCard";
import CyberStatCard from "../components/CyberStatCard";
import CyberStatusBadge from "../components/CyberStatusBadge";
import CyberTable from "../components/CyberTable";
import ModuleTabs from "../components/ModuleTabs";

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

function scoreTone(score: number): "green" | "orange" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "orange";
  return "red";
}

function dateText(value?: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
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

export default function SecurityAwareness() {
  const [data, setData] = useState<AwarenessSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("Overview");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await SecurityAwarenessApi.summary();
      setData(result);
    } catch {
      setError("Failed to load security awareness.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredLearners = useMemo(() => {
    if (!data) return [];

    const q = query.toLowerCase();

    return data.learners.filter((learner) => {
      const matchesQuery =
        learner.name.toLowerCase().includes(q) ||
        learner.email.toLowerCase().includes(q) ||
        learner.department.toLowerCase().includes(q);
      const matchesRisk = riskFilter === "All" || learner.riskLevel === riskFilter;

      return matchesQuery && matchesRisk;
    });
  }, [data, query, riskFilter]);

  const programHealth = useMemo(() => {
    if (!data) return [];

    return [
      { label: "Completed", value: data.completedUsers },
      { label: "In Progress", value: data.inProgressUsers },
      { label: "High Risk", value: data.highRiskUsers },
      { label: "Unassigned", value: data.unassignedUsers ?? 0 },
    ];
  }, [data]);

  const exportLearners = () => {
    if (!data) return;

    const rows = [
      [
        "Name",
        "Email",
        "Department",
        "Assigned",
        "Completed",
        "Completion",
        "Quiz Score",
        "Risk",
        "Status",
        "Last Training",
        "Recommended Action",
      ],
      ...filteredLearners.map((learner) => [
        learner.name,
        learner.email,
        learner.department,
        learner.assignedCourses,
        learner.completedCourses,
        `${learner.completionPercent}%`,
        `${learner.quizScore}%`,
        learner.riskLevel,
        learner.status,
        learner.lastTrainingUtc || "",
        learner.recommendedAction,
      ]),
    ];

    downloadTextFile(
      "cybershield360-awareness-learners.csv",
      rows.map((row) => row.map(csvSafe).join(",")).join("\n")
    );

    setMessage("Learner report downloaded.");
  };

  const saveSetting = (name: string) => {
    localStorage.setItem(`cs360_awareness_${name}`, "enabled");
    setMessage(`${name} setting saved locally.`);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-500">Loading security awareness...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-500">
            Human Risk Training
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Security Awareness Training
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Measure training enrollment, course completion, quiz scores, overdue learning, and high-risk users.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading} className="btn-ghost">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <ModuleTabs
        tabs={TABS.map((item) => ({ key: item, label: item }))}
        activeKey={tab}
        onChange={setTab}
      />

      {message && (
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm font-medium text-brand-300">
          {message}
        </div>
      )}

      {tab === "Overview" && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <CyberStatCard label="Total Learners" value={data.totalLearners} hint="Users in scope" tone="brand" />
            <CyberStatCard label="Avg Completion" value={`${data.averageCompletion}%`} hint="Training progress" tone={scoreTone(data.averageCompletion)} />
            <CyberStatCard label="Avg Quiz Score" value={`${data.averageQuizScore}%`} hint="Knowledge score" tone={scoreTone(data.averageQuizScore)} />
            <CyberStatCard label="High Risk Users" value={data.highRiskUsers} hint="Needs coaching" tone={data.highRiskUsers > 0 ? "red" : "green"} />
            <CyberStatCard label="Unassigned" value={data.unassignedUsers ?? 0} hint="No training assigned" tone={(data.unassignedUsers ?? 0) > 0 ? "orange" : "green"} />
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CyberChartCard
                title="Program Health"
                description="Learner training status across the current workspace."
                insight={
                  data.highRiskUsers > 0
                    ? `${data.highRiskUsers} high-risk learner(s) need focused coaching.`
                    : "Training risk is currently under control."
                }
              >
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={programHealth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(20, 184, 166, 0.08)" }}
                      contentStyle={{
                        background: "#020617",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "14px",
                        color: "#e2e8f0",
                        boxShadow: "0 18px 40px rgba(0, 0, 0, 0.35)",
                      }}
                      labelStyle={{ color: "#99f6e4", fontWeight: 800 }}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#10B5A6" />
                  </BarChart>
                </ResponsiveContainer>
              </CyberChartCard>
            </div>

            <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
              <div className="mb-5 text-center">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Priority Recommendations
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Actions to improve staff readiness.
                </p>
              </div>

              <div className="space-y-3">
                {data.recommendations.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-slate-500">
                    No training recommendations available.
                  </div>
                ) : (
                  data.recommendations.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    >
                      <div className="text-xs font-black uppercase tracking-widest text-brand-300">
                        Action #{index + 1}
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-slate-300">
                        {item}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      )}

      {tab === "Learners" && (
        <div className="space-y-6">
          <section className="card grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              className="input"
              placeholder="Search learner, email, department..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="input"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
            >
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
              <option>Unassigned</option>
            </select>
            <button type="button" onClick={exportLearners} className="btn-primary">
              Export CSV
            </button>
          </section>

          <CyberTable
            title="Learner Risk Register"
            description="Learner training progress, quiz score, risk level, and recommended coaching action."
            data={filteredLearners}
            emptyText="No learners match the selected filters."
            columns={[
              {
                key: "learner",
                label: "Learner",
                render: (learner) => (
                  <div className="mx-auto min-w-72 text-center">
                    <div className="font-semibold text-white">{learner.name}</div>
                    <div className="mt-1 break-all text-xs text-slate-500">{learner.email}</div>
                  </div>
                ),
              },
              {
                key: "department",
                label: "Department",
                render: (learner) => <div className="min-w-40 text-slate-300">{learner.department}</div>,
              },
              {
                key: "progress",
                label: "Progress",
                render: (learner) => (
                  <div>
                    <div className="font-black text-white">{learner.completionPercent}%</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {learner.completedCourses}/{learner.assignedCourses} completed
                    </div>
                  </div>
                ),
              },
              {
                key: "quiz",
                label: "Quiz",
                render: (learner) => (
                  <div className="font-black text-white">
                    {learner.quizScore > 0 ? `${learner.quizScore}%` : "Not scored"}
                  </div>
                ),
              },
              {
                key: "risk",
                label: "Risk",
                render: (learner) => <CyberStatusBadge value={learner.riskLevel} />,
              },
              {
                key: "status",
                label: "Status",
                render: (learner) => <CyberStatusBadge value={learner.status} />,
              },
              {
                key: "action",
                label: "Recommended Action",
                render: (learner) => (
                  <div className="mx-auto min-w-96 text-center text-sm leading-6 text-slate-400">
                    {learner.recommendedAction}
                  </div>
                ),
              },
              {
                key: "last",
                label: "Last Training",
                render: (learner) => (
                  <div className="whitespace-nowrap text-slate-400">
                    {dateText(learner.lastTrainingUtc)}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {tab === "Courses" && (
        <CyberTable
          title="Course Catalog"
          description="Course status, category, duration, difficulty, assigned learners, and completion rate."
          data={data.courses}
          emptyText="No courses available."
          columns={[
            {
              key: "course",
              label: "Course",
              render: (course) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{course.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{course.category}</div>
                </div>
              ),
            },
            {
              key: "difficulty",
              label: "Difficulty",
              render: (course) => <CyberStatusBadge value={course.difficulty} />,
            },
            {
              key: "duration",
              label: "Duration",
              render: (course) => <div className="font-black text-white">{course.durationMinutes}m</div>,
            },
            {
              key: "completion",
              label: "Completion",
              render: (course) => <div className="font-black text-white">{course.completionRate}%</div>,
            },
            {
              key: "assigned",
              label: "Assigned",
              render: (course) => <div className="font-black text-white">{course.assignedLearners ?? 0}</div>,
            },
            {
              key: "status",
              label: "Status",
              render: (course) => <CyberStatusBadge value={course.status} />,
            },
          ]}
        />
      )}

      {tab === "Campaigns" && (
        <CyberTable
          title="Training Campaigns"
          description="Training campaign audience, status, completion rate, and due dates."
          data={data.campaigns}
          emptyText="No training campaigns available."
          columns={[
            {
              key: "campaign",
              label: "Campaign",
              render: (campaign) => (
                <div className="mx-auto min-w-72 text-center">
                  <div className="font-semibold text-white">{campaign.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{campaign.audience}</div>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (campaign) => <CyberStatusBadge value={campaign.status} />,
            },
            {
              key: "completion",
              label: "Completion",
              render: (campaign) => <div className="font-black text-white">{campaign.completionRate}%</div>,
            },
            {
              key: "due",
              label: "Due Date",
              render: (campaign) => (
                <div className="whitespace-nowrap text-slate-400">
                  {dateText(campaign.dueDateUtc)}
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "Reports" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 text-center shadow-2xl shadow-black/10">
          <h2 className="font-black text-white">Learner Report Export</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Export learner progress, quiz score, risk level, status, and recommended action.
          </p>
          <button type="button" onClick={exportLearners} className="btn-primary mt-4">
            Download CSV
          </button>
        </section>
      )}

      {tab === "Settings" && (
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
          <div className="mb-5 text-center">
            <h2 className="text-lg font-black tracking-tight text-white">
              Awareness Settings
            </h2>
            <p className="mx-auto mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Local settings for stronger training governance until dedicated settings endpoints are connected.
            </p>
          </div>

          <div className="space-y-3">
            {["Monthly refresher assignments", "High-risk learner coaching", "Manager completion reminders"].map((setting) => (
              <div
                key={setting}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-center sm:text-left">
                  <div className="font-semibold text-white">{setting}</div>
                  <div className="text-sm text-slate-500">
                    Recommended control for stronger training readiness.
                  </div>
                </div>

                <button type="button" onClick={() => saveSetting(setting)} className="btn-primary">
                  Save
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="text-xs text-slate-400">
        Generated: {dateText(data.generatedUtc)}
      </div>
    </div>
  );
}
