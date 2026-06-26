type CyberStatusBadgeProps = {
  value: string;
};

function getBadgeClass(value: string) {
  const v = value.toLowerCase();

  if (
    v.includes("critical") ||
    v.includes("failed") ||
    v.includes("expired") ||
    v.includes("exposed") ||
    v.includes("high risk")
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (
    v.includes("high") ||
    v.includes("warning") ||
    v.includes("needs") ||
    v.includes("missing") ||
    v.includes("pending")
  ) {
    return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  }

  if (
    v.includes("medium") ||
    v.includes("review") ||
    v.includes("planned") ||
    v.includes("in progress")
  ) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (
    v.includes("low") ||
    v.includes("ready") ||
    v.includes("active") ||
    v.includes("fixed") ||
    v.includes("verified") ||
    v.includes("passed") ||
    v.includes("enabled")
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  return "border-brand-500/30 bg-brand-500/10 text-brand-300";
}

export default function CyberStatusBadge({ value }: CyberStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-wide ${getBadgeClass(
        value
      )}`}
    >
      {value}
    </span>
  );
}