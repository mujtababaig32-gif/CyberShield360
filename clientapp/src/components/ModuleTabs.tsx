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
  return `inline-flex min-h-[56px] items-center justify-center rounded-2xl border px-7 py-3 text-base font-black tracking-tight transition duration-200 ${
    isActive
      ? "border-brand-500/40 bg-gradient-to-r from-brand-500 to-teal-400 text-white shadow-lg shadow-brand-500/20"
      : "border-slate-700/80 bg-slate-950/70 text-white hover:border-brand-500/40 hover:bg-slate-900 hover:text-brand-300"
  }`;
}

export default function ModuleTabs({ tabs, activeKey, onChange }: ModuleTabsProps) {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex min-w-max items-center gap-3 rounded-3xl">
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
