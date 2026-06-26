type CyberStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "brand" | "green" | "orange" | "red" | "slate";
};

const toneClass = {
  brand: "text-brand-300 bg-brand-500/10 border-brand-500/20",
  green: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  orange: "text-orange-300 bg-orange-500/10 border-orange-500/20",
  red: "text-red-300 bg-red-500/10 border-red-500/20",
  slate: "text-slate-300 bg-white/[0.03] border-white/10",
};

export default function CyberStatCard({
  label,
  value,
  hint,
  tone = "brand",
}: CyberStatCardProps) {
  return (
    <div className={`rounded-3xl border p-5 shadow-xl shadow-black/10 ${toneClass[tone]}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-80">
        {label}
      </div>

      <div className="mt-3 text-3xl font-black tracking-tight text-white">
        {value}
      </div>

      {hint && <div className="mt-2 text-sm leading-6 opacity-80">{hint}</div>}
    </div>
  );
}