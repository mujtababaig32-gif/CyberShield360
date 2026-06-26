import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  hint: string;
};

type NavSection = {
  title: string;
  icon: string;
  description: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Command Center",
    icon: "⌘",
    description: "Executive visibility",
    items: [
      { to: "/", label: "Dashboard", icon: "📊", hint: "Command center" },
      { to: "/executive-scorecard", label: "Executive Scorecard", icon: "📈", hint: "Board view" },
      { to: "/ai-copilot", label: "AI Copilot", icon: "🤖", hint: "Security advisor" },
      { to: "/search", label: "Global Search", icon: "🔍", hint: "Find anything" },
    ],
  },
  {
    title: "Client Success Hub",
    icon: "◆",
    description: "Assess, explain, fix",
    items: [
      { to: "/service-overview", label: "Service Overview", icon: "🧭", hint: "Service model" },
      { to: "/client-onboarding", label: "Client Onboarding", icon: "🤝", hint: "Client intake" },
      { to: "/client-packages", label: "Client Packages", icon: "📦", hint: "One-time offers" },
      { to: "/fix-plan", label: "Fix Plan", icon: "🛠️", hint: "Remediation" },
    ],
  },
  {
    title: "Deal Desk",
    icon: "◇",
    description: "Quote, report, close",
    items: [
      { to: "/client-quotation", label: "Client Quotation", icon: "💼", hint: "Proposal" },
      { to: "/report-builder", label: "Report Builder", icon: "📄", hint: "Client report" },
      { to: "/billing", label: "Billing", icon: "💳", hint: "Payment" },
    ],
  },
  {
    title: "Attack Surface",
    icon: "◈",
    description: "Assets, scans, exposure",
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
    title: "Risk & Trust",
    icon: "◒",
    description: "GRC and business risk",
    items: [
      { to: "/risks", label: "Risk Register", icon: "⚠️", hint: "Business risk" },
      { to: "/compliance", label: "Compliance Center", icon: "📋", hint: "GRC" },
      { to: "/policy-audit", label: "Policy & Audit", icon: "📑", hint: "Audit" },
      { to: "/framework-mapping", label: "Framework Mapping", icon: "🧩", hint: "Controls" },
      { to: "/vendor-risk", label: "Vendor Risk", icon: "🏢", hint: "Third party" },
    ],
  },
  {
    title: "Human Defense",
    icon: "◐",
    description: "Training and awareness",
    items: [
      { to: "/security-awareness", label: "Security Awareness", icon: "🎓", hint: "Awareness" },
      { to: "/phishing-simulation", label: "Phishing Simulation", icon: "🎣", hint: "Testing" },
      { to: "/client-training", label: "Client Training", icon: "🧑‍🏫", hint: "Client education" },
    ],
  },
  {
    title: "Threat Ops",
    icon: "✦",
    description: "Monitor and respond",
    items: [
      { to: "/soc", label: "SOC Center", icon: "🚨", hint: "Alerts" },
      { to: "/threat-intelligence", label: "Threat Intelligence", icon: "🎯", hint: "Intel" },
      { to: "/dark-web", label: "Dark Web", icon: "🕶️", hint: "Exposure" },
      { to: "/incident-playbooks", label: "Incident Playbooks", icon: "🧯", hint: "Response" },
      { to: "/ai-remediation", label: "AI Remediation", icon: "🛠️", hint: "Fix guidance" },
      { to: "/audit-logs", label: "Audit Logs", icon: "🧾", hint: "Evidence" },
    ],
  },
  {
    title: "Control Room",
    icon: "⚙",
    description: "Platform administration",
    items: [
      { to: "/saas-admin", label: "SaaS Admin", icon: "🏗️", hint: "Tenants" },
      { to: "/user-management", label: "User Management", icon: "👥", hint: "Users" },
      { to: "/rbac", label: "RBAC Engine", icon: "🔐", hint: "Access" },
      { to: "/notifications", label: "Notifications", icon: "🔔", hint: "Updates" },
      { to: "/profile", label: "My Profile", icon: "👤", hint: "Account" },
      { to: "/settings", label: "Settings", icon: "⚙️", hint: "System" },
    ],
  },
];

function getAllItems() {
  return NAV_SECTIONS.flatMap((section) => section.items);
}

function getActiveSection(pathname: string) {
  return NAV_SECTIONS.find((section) =>
    section.items.some((item) =>
      item.to === "/" ? pathname === "/" : pathname === item.to || pathname.startsWith(`${item.to}/`)
    )
  );
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
  return "Identify, explain, report, fix, and train clients with CyberShield360";
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

  const activeSection = useMemo(
    () => getActiveSection(location.pathname),
    [location.pathname]
  );

  const [openSection, setOpenSection] = useState<string>(
    activeSection?.title ?? "Command Center"
  );

  useEffect(() => {
    if (activeSection?.title) {
      setOpenSection(activeSection.title);
    }
  }, [activeSection?.title]);

  function toggleSection(title: string) {
    setOpenSection((current) => {
      if (current === title) {
        return activeSection?.title === title ? title : "";
      }

      return title;
    });
  }

  return (
    <>
      <div className="relative overflow-hidden border-b border-white/10 p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-accent-500/10" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg shadow-brand-500/20">
            <img src="/logo.svg" alt="CyberShield360 logo" className="h-8 w-8" />
          </div>

          <div className="min-w-0">
            <div className="text-base font-black leading-tight tracking-tight text-white">
              CyberShield<span className="text-brand-500">360</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
              By Mujtaba
            </div>
          </div>
        </div>

        <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/25 p-3 text-white shadow-inner">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">
                Service Model
              </div>
              <div className="text-sm font-bold">Assessment + Remediation</div>
            </div>

            <span className="rounded-full bg-brand-500/15 px-2 py-1 text-[10px] font-bold text-brand-300 ring-1 ring-brand-500/30">
              ACTIVE
            </span>
          </div>

          <div className="mt-2 truncate text-xs text-slate-400">
            {user?.email}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 text-sm">
        <div className="mb-3 px-3">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            CyberShield Workflow
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Assess → Explain → Fix → Report → Train
          </div>
        </div>

        <div className="space-y-2">
          {NAV_SECTIONS.map((section) => {
            const isOpen = openSection === section.title;
            const isActiveSection = activeSection?.title === section.title;

            return (
              <div
                key={section.title}
                className={`rounded-2xl border transition duration-200 ${
                  isActiveSection
                    ? "border-brand-500/30 bg-brand-500/10 shadow-lg shadow-brand-500/10"
                    : "border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.05]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      isActiveSection
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {section.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-black ${
                        isActiveSection ? "text-white" : "text-slate-200"
                      }`}
                    >
                      {section.title}
                    </span>
                    <span className="block truncate text-[10px] font-medium text-slate-400">
                      {section.description}
                    </span>
                  </span>

                  <span
                    className={`rounded-lg px-2 py-1 text-[10px] font-black transition ${
                      isOpen
                        ? "rotate-180 bg-brand-500/15 text-brand-300"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    ▾
                  </span>
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-1 px-2 pb-3">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === "/"}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `group flex items-center gap-3 rounded-xl px-3 py-2.5 transition duration-200 hover:translate-x-0.5 ${
                              isActive
                                ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-600/20"
                                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm ${
                                  isActive
                                    ? "bg-white/20"
                                    : "bg-slate-900 group-hover:bg-slate-700"
                                }`}
                              >
                                {item.icon}
                              </span>

                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">
                                  {item.label}
                                </span>
                                <span
                                  className={`block truncate text-[10px] ${
                                    isActive ? "text-white/75" : "text-slate-400"
                                  }`}
                                >
                                  {item.hint}
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
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 shadow-inner">
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
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-brand-400 transition hover:bg-slate-800 hover:text-brand-300"
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
  const section = useMemo(() => getActiveSection(location.pathname), [location.pathname]);

  useEffect(() => {
    forceDarkMode();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-80">
        <div className="absolute left-[18rem] top-20 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/5 blur-3xl" />
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
                aria-label="Open navigation"
              >
                ☰
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {section?.title ?? "CyberShield360"}
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
                className="hidden items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-800 sm:flex"
              >
                <span>🔍</span>
                <span>Search</span>
              </button>

              <button
                onClick={() => navigate("/notifications")}
                className="rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-800"
                title="Notifications"
                aria-label="Notifications"
              >
                🔔
              </button>

              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-800"
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