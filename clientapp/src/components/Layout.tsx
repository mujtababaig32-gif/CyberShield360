import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  hint: string;
};

type NavGroup = {
  title: string;
  badge: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Command Center",
    badge: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: "📊", hint: "Command center" },
      { to: "/executive-scorecard", label: "Executive Scorecard", icon: "📈", hint: "Board view" },
      { to: "/ai-copilot", label: "AI Copilot", icon: "🤖", hint: "Security assistant" },
      { to: "/search", label: "Global Search", icon: "🔍", hint: "Find anything" },
    ],
  },
  {
    title: "Client Success Hub",
    badge: "Customers",
    items: [
      { to: "/saas-admin", label: "SaaS Admin", icon: "🏗️", hint: "Tenants" },
      { to: "/user-management", label: "User Management", icon: "👥", hint: "Users" },
      { to: "/notifications", label: "Notifications", icon: "🔔", hint: "Updates" },
      { to: "/profile", label: "My Profile", icon: "👤", hint: "Account" },
    ],
  },
  {
    title: "Deal Desk",
    badge: "Business",
    items: [
      { to: "/billing", label: "Billing", icon: "💳", hint: "Plans" },
      { to: "/vendor-risk", label: "Vendor Risk", icon: "🏢", hint: "Third party" },
    ],
  },
  {
    title: "Attack Surface",
    badge: "Exposure",
    items: [
      { to: "/assets", label: "Assets & Scans", icon: "🌐", hint: "Attack surface" },
      { to: "/asset-inventory", label: "Asset Inventory", icon: "🗂️", hint: "Known assets" },
      { to: "/scheduled-scans", label: "Scheduled Scans", icon: "⏰", hint: "Automation" },
      { to: "/vulnerabilities", label: "Vulnerabilities", icon: "🛡️", hint: "Findings" },
      { to: "/cloud-posture", label: "Cloud Posture", icon: "☁️", hint: "Cloud risk" },
      { to: "/attack-path", label: "Attack Path Analysis", icon: "🕸️", hint: "Risk paths" },
    ],
  },
  {
    title: "Risk & Trust",
    badge: "GRC",
    items: [
      { to: "/risks", label: "Risk Register", icon: "⚠️", hint: "Risk tracking" },
      { to: "/compliance", label: "Compliance Center", icon: "📋", hint: "GRC" },
      { to: "/policy-audit", label: "Policy & Audit", icon: "📑", hint: "Evidence" },
      { to: "/framework-mapping", label: "Framework Mapping", icon: "🧩", hint: "Controls" },
      { to: "/security-awareness", label: "Security Awareness", icon: "🎓", hint: "Training" },
      { to: "/phishing-simulation", label: "Phishing Simulation", icon: "🎣", hint: "Testing" },
    ],
  },
  {
    title: "Threat Ops",
    badge: "SOC",
    items: [
      { to: "/soc", label: "SOC Center", icon: "🚨", hint: "Live alerts" },
      { to: "/threat-intelligence", label: "Threat Intelligence", icon: "🎯", hint: "Intel feed" },
      { to: "/dark-web", label: "Dark Web Monitoring", icon: "🕶️", hint: "Exposure watch" },
      { to: "/incident-playbooks", label: "Incident Playbooks", icon: "🧯", hint: "Response plans" },
      { to: "/ai-remediation", label: "AI Remediation", icon: "🛠️", hint: "Smart fixes" },
    ],
  },
  {
    title: "Control Room",
    badge: "Admin",
    items: [
      { to: "/rbac", label: "RBAC Engine", icon: "🔐", hint: "Access" },
      { to: "/audit-logs", label: "Audit Logs", icon: "🧾", hint: "Evidence" },
      { to: "/settings", label: "Settings", icon: "⚙️", hint: "System" },
    ],
  },
];

function getAllItems() {
  return NAV_GROUPS.flatMap((group) => group.items);
}

function isRouteActive(pathname: string, itemPath: string) {
  if (itemPath === "/") return pathname === "/";
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function getActiveGroup(pathname: string) {
  return NAV_GROUPS.find((group) =>
    group.items.some((item) => isRouteActive(pathname, item.to))
  );
}

function getPageTitle(pathname: string) {
  const exact = getAllItems().find((item) => isRouteActive(pathname, item.to));
  if (exact) return exact.label;
  if (pathname === "/") return "Dashboard";
  return "Security Command Center";
}

function getPageHint(pathname: string) {
  const exact = getAllItems().find((item) => isRouteActive(pathname, item.to));
  if (exact) return exact.hint;
  return "Unified visibility across risk, exposure, compliance, and operations";
}

function forceDarkMode() {
  document.documentElement.classList.add("dark");
  document.body.classList.add("dark");

  localStorage.setItem("cs360-theme", "dark");
  localStorage.removeItem("cs360_theme");
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeGroup = useMemo(
    () => getActiveGroup(location.pathname),
    [location.pathname]
  );

  const [openGroups, setOpenGroups] = useState<string[]>(() => [
    activeGroup?.title ?? "Command Center",
  ]);

  useEffect(() => {
    if (!activeGroup?.title) return;

    setOpenGroups((current) =>
      current.includes(activeGroup.title)
        ? current
        : [...current, activeGroup.title]
    );
  }, [activeGroup?.title]);

  function toggleGroup(title: string) {
    setOpenGroups((current) =>
      current.includes(title)
        ? current.filter((item) => item !== title)
        : [...current, title]
    );
  }

  return (
    <>
      <div className="relative overflow-hidden border-b border-white/10 p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/15 via-transparent to-cyan-500/10" />
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-teal-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-lg shadow-teal-500/20">
            <img src="/logo.svg" alt="CyberShield360 logo" className="h-8 w-8" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-black leading-tight tracking-tight text-white">
              CyberShield<span className="text-teal-400">360</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
              By Mujtaba
            </div>
          </div>
        </div>

        <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white shadow-inner backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Workspace
              </div>
              <div className="truncate text-sm font-bold">
                CyberShield360 Tenant
              </div>
            </div>

            <span className="rounded-full bg-teal-500/15 px-2 py-1 text-[10px] font-bold text-teal-300 ring-1 ring-teal-500/30">
              ACTIVE
            </span>
          </div>

          <div className="mt-2 truncate text-xs text-slate-400">
            {user?.email}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 text-sm">
        <div className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Navigation
        </div>

        <div className="space-y-2">
          {NAV_GROUPS.map((group) => {
            const isOpen = openGroups.includes(group.title);
            const isActiveGroup = activeGroup?.title === group.title;

            return (
              <div
                key={group.title}
                className={`rounded-3xl border transition duration-200 ${
                  isActiveGroup
                    ? "border-teal-500/30 bg-teal-500/[0.04]"
                    : "border-transparent bg-transparent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center justify-between gap-3 rounded-3xl px-3 py-3 text-left transition duration-200 ${
                    isActiveGroup
                      ? "text-white"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-black uppercase tracking-[0.14em]">
                      {group.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {group.badge}
                    </span>
                  </span>

                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border text-xs transition duration-200 ${
                      isActiveGroup
                        ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    } ${isOpen ? "rotate-180" : ""}`}
                  >
                    ⌄
                  </span>
                </button>

                <div
                  className={`grid transition-all duration-300 ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-1 px-2 pb-3">
                      {group.items.map((n) => (
                        <NavLink
                          key={n.to}
                          to={n.to}
                          end={n.to === "/"}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition duration-200 hover:translate-x-0.5 ${
                              isActive
                                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/20"
                                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm transition ${
                                  isActive
                                    ? "bg-white/20"
                                    : "bg-slate-900 group-hover:bg-slate-700"
                                }`}
                              >
                                {n.icon}
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">
                                  {n.label}
                                </span>
                                <span
                                  className={`block truncate text-[10px] ${
                                    isActive ? "text-white/75" : "text-slate-400"
                                  }`}
                                >
                                  {n.hint}
                                </span>
                              </span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-inner">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">
            Signed in
          </div>

          <div className="truncate text-xs font-semibold text-slate-200">
            {user?.email}
          </div>

          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-teal-300 transition hover:border-teal-500/40 hover:bg-slate-900"
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
  const navigate = useNavigate();
  const location = useLocation();

  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const hint = useMemo(() => getPageHint(location.pathname), [location.pathname]);

  useEffect(() => {
    forceDarkMode();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-80">
        <div className="absolute left-[18rem] top-20 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-slate-700/10 blur-3xl" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-80 flex-col border-r border-slate-800 bg-slate-950/90 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="relative z-10 flex h-full w-80 max-w-[88vw] flex-col border-r border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex justify-end px-4 pt-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <main className="min-h-screen lg:pl-80">
        <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 px-4 py-3 shadow-sm shadow-black/10 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-800 lg:hidden"
              >
                ☰
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shadow-sm shadow-teal-400/50" />
                  CyberShield360
                </div>

                <div className="truncate text-lg font-black tracking-tight sm:text-xl">
                  {title}
                </div>

                <div className="hidden truncate text-xs text-slate-400 sm:block">
                  {hint}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => navigate("/search")}
                className="hidden items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-teal-500/40 hover:bg-slate-800 sm:flex"
              >
                <span>🔍</span>
                <span>Search</span>
              </button>

              <button
                onClick={() => navigate("/notifications")}
                className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-teal-500/40 hover:bg-slate-800"
                title="Notifications"
                aria-label="Notifications"
              >
                🔔
              </button>

              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:border-teal-500/40 hover:bg-slate-800"
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