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
    <div className={`min-w-0 rounded-2xl border p-4 shadow-xl shadow-black/10 sm:rounded-3xl sm:p-5 ${toneClass[tone]}`}>
      <div className="break-words text-[11px] font-black uppercase leading-5 tracking-wide opacity-80 sm:text-xs">
        {label}
      </div>

      <div className="mt-2 break-words text-2xl font-black tracking-tight text-white sm:mt-3 sm:text-3xl">
        {value}
      </div>

      {hint && <div className="mt-2 text-xs leading-5 opacity-80 sm:text-sm sm:leading-6">{hint}</div>}
    </div>
  );
}
