import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export default function LegalPageShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8">
        <Link to="/login" className="text-sm font-semibold text-brand-400 hover:text-brand-300">
          &larr; Back to CyberShield360
        </Link>

        <h1 className="mt-6 text-3xl font-black tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Effective date: {effectiveDate}</p>

        <div className="legal-prose mt-8 space-y-6 text-sm leading-7 text-slate-300">
          {children}
        </div>
      </div>
    </div>
  );
}
