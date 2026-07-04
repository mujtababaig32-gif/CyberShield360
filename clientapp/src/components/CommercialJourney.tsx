import { Link } from "react-router-dom";

export type CommercialJourneyStep =
  | "service"
  | "package"
  | "quotation"
  | "onboarding"
  | "assess"
  | "report";

const STEPS: Array<{
  id: CommercialJourneyStep;
  label: string;
  path: string;
  short: string;
}> = [
  { id: "service", label: "Service", path: "/service-overview", short: "1" },
  { id: "package", label: "Package", path: "/client-packages", short: "2" },
  { id: "quotation", label: "Quotation", path: "/client-quotation", short: "3" },
  { id: "onboarding", label: "Onboarding", path: "/client-onboarding", short: "4" },
  { id: "assess", label: "Assess", path: "/assets", short: "5" },
  { id: "report", label: "Report", path: "/report-builder", short: "6" },
];

export default function CommercialJourney({
  current,
}: {
  current: CommercialJourneyStep;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/10 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-brand-300">
            Commercial Journey
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Service → package → quotation → authorized onboarding → assessment → client report.
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Step {currentIndex + 1} of {STEPS.length}
        </div>
      </div>

      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
        {STEPS.map((step, index) => {
          const isCurrent = step.id === current;
          const isPast = index < currentIndex;

          return (
            <Link
              key={step.id}
              to={step.path}
              className={`min-w-[132px] snap-start rounded-2xl border px-3 py-3 text-center transition sm:min-w-0 sm:flex-1 ${
                isCurrent
                  ? "border-brand-500/50 bg-brand-500/15 text-white"
                  : isPast
                    ? "border-green-500/20 bg-green-500/5 text-slate-300 hover:border-green-500/40"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-brand-500/30 hover:text-white"
              }`}
            >
              <div
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black ${
                  isCurrent
                    ? "bg-brand-500 text-slate-950"
                    : isPast
                      ? "bg-green-500/15 text-green-300"
                      : "bg-white/5 text-slate-500"
                }`}
              >
                {isPast ? "✓" : step.short}
              </div>
              <div className="mt-2 text-xs font-black uppercase tracking-wide">
                {step.label}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
