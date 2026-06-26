import { NavLink } from "react-router-dom";

export type ModuleTab = {
  key: string;
  label: string;
  to?: string;
};

type ModuleTabsProps = {
  tabs: ModuleTab[];
  activeKey?: string;
  onChange?: (key: string) => void;
};

function tabClass(isActive: boolean) {
  return [
    "inline-flex min-h-[64px] min-w-[150px] items-center justify-center rounded-2xl border px-7 py-4 text-center text-base font-extrabold tracking-tight transition-all duration-200",
    isActive
      ? "border-teal-400/50 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-400 text-white shadow-xl shadow-teal-500/25 ring-1 ring-teal-300/30"
      : "border-slate-700/80 bg-slate-950/90 text-slate-100 shadow-inner shadow-white/5 hover:-translate-y-0.5 hover:border-teal-400/50 hover:bg-slate-900 hover:text-teal-200 hover:shadow-lg hover:shadow-teal-500/10",
  ].join(" ");
}

export default function ModuleTabs({ tabs, activeKey, onChange }: ModuleTabsProps) {
  return (
    <div className="mb-8 w-full overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/60 p-2 shadow-2xl shadow-black/20">
      <div className="flex min-w-max items-center gap-3">
        {tabs.map((tab) => {
          if (tab.to) {
            return (
              <NavLink
                key={tab.key}
                to={tab.to}
                end
                className={({ isActive }) => tabClass(isActive)}
              >
                {tab.label}
              </NavLink>
            );
          }

          const isActive = activeKey === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange?.(tab.key)}
              className={tabClass(isActive)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}