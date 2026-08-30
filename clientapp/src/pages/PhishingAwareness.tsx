import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { IconCheck, IconFishHook } from "../components/icons";

const TIPS = [
  "Hover over links before clicking to see where they actually go.",
  "Check the sender's real email address, not just the display name.",
  "Be suspicious of urgency — \"act now\" language is a common pressure tactic.",
  "When in doubt, contact the sender through a separate, known channel.",
  "Use the Report Phishing option in your mail client instead of clicking.",
];

export default function PhishingAwareness() {
  const [params] = useSearchParams();

  const message = params.get("message") ?? "This was a simulated phishing test.";
  const reported = params.get("reported") === "true";

  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/40">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl ${
            reported ? "bg-emerald-500/15 text-emerald-300" : "bg-orange-500/15 text-orange-300"
          }`}
        >
          {reported ? <IconCheck className="h-7 w-7" /> : <IconFishHook className="h-7 w-7" />}
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-white">
          {reported ? "Nice catch!" : "This was a phishing simulation"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>

        {!reported && (
          <div className="mt-6 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-left text-sm leading-6 text-brand-100">
            <div className="text-xs font-black uppercase tracking-widest text-brand-300">Security tip</div>
            <p className="mt-1">{tip}</p>
          </div>
        )}

        <p className="mt-6 text-xs text-slate-500">
          No credentials were captured. This page is part of an authorized internal security-awareness
          exercise run by your organization.
        </p>
      </div>
    </div>
  );
}
