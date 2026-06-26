import type { ReactNode } from "react";

type CyberChartCardProps = {
  title: string;
  description?: string;
  insight?: string;
  children: ReactNode;
};

export default function CyberChartCard({
  title,
  description,
  insight,
  children,
}: CyberChartCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/10">
      <div className="mb-5">
        <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>

        {description && (
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        )}
      </div>

      <div className="min-h-[260px] rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        {children}
      </div>

      {insight && (
        <div className="mt-4 rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-3 text-sm font-semibold text-brand-300">
          {insight}
        </div>
      )}
    </section>
  );
}