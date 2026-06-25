import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const NAV_GROUPS = [
  {
    title: "Executive",
    items: [
      { to: "/", label: "Dashboard", icon: "📊", hint: "Command center" },
      { to: "/executive-scorecard", label: "Executive Scorecard", icon: "📈", hint: "Board view" },
      { to: "/ai-copilot", label: "AI Copilot", icon: "🤖", hint: "Assistant" },
    ],
  },
  {
    title: "Security Operations",
    items: [
      { to: "/soc", label: "SOC Center", icon: "🚨", hint: "Alerts" },
      { to: "/threat-intelligence", label: "Threat Intelligence", icon: "🎯", hint: "Intel" },
      { to: "/dark-web", label: "Dark Web", icon: "🕶️", hint: "Exposure" },
      { to: "/incident-playbooks", label: "Incident Playbooks", icon: "🧯", hint: "Response" },
      { to: "/ai-remediation", label: "AI Remediation", icon: "🛠️", hint: "Fixes" },
    ],
  },
  {
    title: "Exposure Management",
    items: [
      { to: "/assets", label: "Assets & Scans", icon: "🌐", hint: "ASM" },
      { to: "/asset-inventory", label: "Asset Inventory", icon: "🗂️", hint: "Inventory" },
      { to: "/scheduled-scans", label: "Scheduled Scans", icon: "⏰", hint: "Automation" },
      { to: "/vulnerabilities", label: "Vulnerabilities", icon: "🛡️", hint: "Findings" },
      { to: "/cloud-posture", label: "Cloud Posture", icon: "☁️", hint: "Cloud" },
      { to: "/attack-path", label: "Attack Path", icon: "🕸️", hint: "Paths" },
    ],
  },
  {
    title: "Risk & Compliance",
    items: [
      { to: "/risks", label: "Risk Register", icon: "⚠️", hint: "Risk" },
      { to: "/compliance", label: "Compliance Center", icon: "📋", hint: "GRC" },
      { to: "/policy-audit", label: "Policy & Audit", icon: "📑", hint: "Audit" },
      { to: "/framework-mapping", label: "Framework Mapping", icon: "🧩", hint: "Controls" },
      { to: "/vendor-risk", label: "Vendor Risk", icon: "🏢", hint: "Third party" },
    ],
  },
  {
    title: "Human Risk",
    items: [
      { to: "/security-awareness", label: "Security Awareness", icon: "🎓", hint: "Training" },
      { to: "/phishing-simulation", label: "Phishing Simulation", icon: "🎣", hint: "Testing" },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/saas-admin", label: "SaaS Admin", icon: "🏗️", hint: "Tenants" },
      { to: "/user-management", label: "User Management", icon: "👥", hint: "RBAC" },
      { to: "/rbac", label: "RBAC Engine", icon: "🔐", hint: "Access" },
      { to: "/audit-logs", label: "Audit Logs", icon: "🧾", hint: "Evidence" },
      { to: "/billing", label: "Billing", icon: "💳", hint: "Plans" },
    ],
  },
  {
    title: "Platform",
    items: [
      { to: "/profile", label: "My Profile", icon: "👤", hint: "Account" },
      { to: "/notifications", label: "Notifications", icon: "🔔", hint: "Updates" },
      { to: "/search", label: "Global Search", icon: "🔍", hint: "Find" },
      { to: "/settings", label: "Settings", icon: "⚙️", hint: "System" },
    ],
  },
];

function getAllItems() {
  return NAV_GROUPS.flatMap((group) => group.items);
}

function getPageTitle(pathname: string) {
  const exact = getAllItems().find((item) => item.to === pathname);
  if (exact) return exact.label;
  if (pathname === "/") return "Dashboard";
  return "Security Command Center";
}

function getPageHint(pathname: string) {
  const exact = getAllItems().find((item) => item.to === pathname);
  if (exact) return exact.hint;
  return "Unified visibility across risk, exposure, compliance, and operations";
}

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("cs360_theme") || "dark";
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div className="relative overflow-hidden border-b border-white/10 p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/10" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-brand-500/20 dark:bg-slate-950">
            <img src="/logo.svg" alt="CyberShield360 logo" className="h-8 w-8" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-black leading-tight tracking-tight">
              CyberShield<span className="text-brand-500">360</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
              By Mujtaba
            </div>
          </div>
        </div>

        <div className="relative mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-white shadow-inner dark:bg-black/20">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Workspace</div>
              <div className="text-sm font-bold">CyberShield360 Tenant</div>
            </div>
            <span className="rounded-full bg-brand-500/15 px-2 py-1 text-[10px] font-bold text-brand-300 ring-1 ring-brand-500/30">
              ACTIVE
            </span>
          </div>
          <div className="mt-2 truncate text-xs text-slate-400">{user?.email}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 text-sm">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-5">
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {group.title}
            </div>

            <div className="flex flex-col gap-1">
              {group.items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition duration-200 hover:translate-x-0.5 ${
                      isActive
                        ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/20"
                        : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm ${
                          isActive
                            ? "bg-white/20"
                            : "bg-slate-100 group-hover:bg-brand-50 dark:bg-slate-800 dark:group-hover:bg-slate-700"
                        }`}
                      >
                        {n.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{n.label}</span>
                        <span className={`block truncate text-[10px] ${isActive ? "text-white/75" : "text-slate-400"}`}>
                          {n.hint}
                        </span>
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200/80 p-4 dark:border-slate-800">
        <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800/70">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Signed in</div>
          <div className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
            {user?.email}
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-brand-400 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const navigate = useNavigate();
  const location = useLocation();

  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const hint = useMemo(() => getPageHint(location.pathname), [location.pathname]);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("cs360_theme", theme);
  }, [theme]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-slate-950 dark:text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-80">
        <div className="absolute left-[18rem] top-20 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" />
      </div>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 flex-col border-r border-slate-200/80 bg-white/80 shadow-2xl shadow-slate-300/30 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-black/20 lg:flex">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex justify-end px-4 pt-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="min-h-screen lg:pl-80">
        <header className="sticky top-0 z-30 border-b border-white/70 bg-white/75 px-4 py-3 shadow-sm shadow-slate-200/50 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/75 dark:shadow-black/10 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 lg:hidden"
              >
                ☰
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  CyberShield360
                </div>
                <div className="truncate text-lg font-black tracking-tight sm:text-xl">{title}</div>
                <div className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">{hint}</div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => navigate("/search")}
                className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800 sm:flex"
              >
                <span>🔍</span>
                <span>Search</span>
              </button>

              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800"
                title="Toggle theme"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              <button
                onClick={() => navigate("/notifications")}
                className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800"
              >
                🔔
              </button>

              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800"
              >
                <span>👤</span>
                <span className="hidden sm:inline">Profile</span>
              </button>
            </div>
          </div>
        </header>

        <div className="page-shell p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
