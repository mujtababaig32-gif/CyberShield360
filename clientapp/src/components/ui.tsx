import type { ReactNode } from "react";

export const SEV_COLOR: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#ca8a04",
  Low: "#16a34a",
  Info: "#6b7280",
};

export const GRADE_COLOR: Record<string, string> = {
  A: "#16a34a",
  B: "#65a30d",
  C: "#ca8a04",
  D: "#ea580c",
  F: "#dc2626",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className="badge shadow-lg shadow-black/10"
      style={{ background: SEV_COLOR[severity] ?? "#6b7280" }}
    >
      {severity}
    </span>
  );
}

export function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="card card-3d hover-lift overflow-hidden">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-500/10 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div
            className="text-3xl font-black tracking-tight"
            style={accent ? { color: accent } : undefined}
          >
            {value}
          </div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </div>
        </div>

        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/40 bg-white/60 text-lg shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
