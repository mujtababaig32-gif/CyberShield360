export const PACKAGE_NAMES = [
  "Website Security Assessment",
  "Assessment + Fixing",
  "Business Security Readiness",
] as const;

export type PackageName = (typeof PACKAGE_NAMES)[number];

export type CommercialWorkflowDraft = {
  clientName: string;
  contactName: string;
  website: string;
  industry: string;
  packageName: PackageName;
  assetCount: number;
  projectName: string;
  assessmentFee: number;
  fixingFee: number;
  trainingFee: number;
  validDays: number;
  timeline: string;
  commercialApproved: boolean;
  scanScope: string;
  authorizationConfirmed: boolean;
  authorizedBy: string;
  authorizationDate: string;
  assetAdded: boolean;
  updatedAt: string;
};

const STORAGE_KEY = "cybershield360.commercialWorkflow.v1";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function defaultCommercialWorkflow(): CommercialWorkflowDraft {
  return {
    clientName: "Acme Corp",
    contactName: "Client Contact",
    website: "example.com",
    industry: "E-commerce",
    packageName: "Assessment + Fixing",
    assetCount: 1,
    projectName: "Website Security Assessment & Remediation",
    assessmentFee: 25000,
    fixingFee: 30000,
    trainingFee: 0,
    validDays: 7,
    timeline: "3-5 business days",
    commercialApproved: false,
    scanScope: "Non-destructive external posture assessment of the approved public domain and related public-facing services.",
    authorizationConfirmed: false,
    authorizedBy: "",
    authorizationDate: todayIso(),
    assetAdded: false,
    updatedAt: new Date().toISOString(),
  };
}

export function loadCommercialWorkflow(): CommercialWorkflowDraft {
  const defaults = defaultCommercialWorkflow();

  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<CommercialWorkflowDraft>;

    return {
      ...defaults,
      ...parsed,
      packageName: PACKAGE_NAMES.includes(parsed.packageName as PackageName)
        ? (parsed.packageName as PackageName)
        : defaults.packageName,
      assetCount: Number.isFinite(Number(parsed.assetCount))
        ? Math.max(1, Number(parsed.assetCount))
        : defaults.assetCount,
      validDays: Number.isFinite(Number(parsed.validDays))
        ? Math.max(1, Number(parsed.validDays))
        : defaults.validDays,
    };
  } catch {
    return defaults;
  }
}

export function saveCommercialWorkflow(
  patch: Partial<CommercialWorkflowDraft>
): CommercialWorkflowDraft {
  const next: CommercialWorkflowDraft = {
    ...loadCommercialWorkflow(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("cybershield360:commercial-workflow", { detail: next }));
  }

  return next;
}

export function clearCommercialWorkflow() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function normalizeDomainInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .replace(/\.$/, "");
}
