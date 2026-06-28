import { api } from "./client";
import type {
  AuthResponse,
  PostureDashboard,
  Vulnerability,
  Paginated,
  Asset,
  Risk,
  ScheduledScan,
  ScanRecommendation,
} from "../types";

const VULN_STATUS_TO_VALUE: Record<string, number> = {
  Open: 0,
  InProgress: 1,
  Remediated: 2,
  Accepted: 3,
  FalsePositive: 4,
};

const SEVERITY_TO_VALUE: Record<string, number> = {
  Info: 0,
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

export const AuthApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }).then((r) => r.data),

  register: (
    tenantName: string,
    email: string,
    password: string,
    fullName: string
  ) =>
    api
      .post<AuthResponse>("/auth/register", {
        tenantName,
        email,
        password,
        fullName,
      })
      .then((r) => r.data),
};

export const DashboardApi = {
  posture: () =>
    api.get<PostureDashboard>("/dashboard/posture").then((r) => r.data),
};

export const VulnApi = {
  list: (params: {
    status?: string;
    severity?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<Paginated<Vulnerability>>("/vulnerabilities", { params })
      .then((r) => r.data),

  create: (data: {
    title: string;
    description?: string;
    cveId?: string;
    cvssScore?: number | null;
    severity: string;
    assetId?: string | null;
    dueDateUtc?: string | null;
  }) =>
    api
      .post("/vulnerabilities", {
        title: data.title,
        description: data.description || null,
        cveId: data.cveId || null,
        cvssScore: data.cvssScore ?? null,
        severity: SEVERITY_TO_VALUE[data.severity] ?? data.severity,
        assetId: data.assetId || null,
        dueDateUtc: data.dueDateUtc || null,
      })
      .then((r) => r.data),

  updateStatus: (id: string, status: string, notes?: string) =>
    api
      .put(`/vulnerabilities/${id}/status`, {
        status: VULN_STATUS_TO_VALUE[status] ?? status,
        notes: notes || null,
      })
      .then((r) => r.data),

  summary: () =>
    api.get("/vulnerabilities/summary").then((r) => r.data),
};

export const AssetApi = {
  list: () =>
    api.get<Asset[]>("/assets").then((r) => r.data),

  create: (domain: string) =>
    api.post("/assets", { domain }).then((r) => r.data),

  runScan: (assetId: string, type: number) =>
    api.post("/scans/run", { assetId, type }).then((r) => r.data),

  scanAll: () =>
    api.post("/assets/scan-all").then((r) => r.data),

  discoverSubdomains: (assetId: string) =>
    api.post(`/assets/${assetId}/discover-subdomains`).then((r) => r.data),

  downloadReport: async (assetId: string, format: "pdf" | "xlsx") => {
    const response = await api.get(`/reports/assets/${assetId}/latest-full/${format}`, {
      responseType: "blob",
    });

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `cybershield360-full-posture-report.${format}`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};

export const RecommendationApi = {
  getByScan: (scanId: string) =>
    api
      .get<ScanRecommendation>(`/scans/${scanId}/recommendations`)
      .then((r) => r.data),
};

export const SettingsApi = {
  summary: () =>
    api.get("/settings/summary").then((r) => r.data),

  getBranding: () =>
    api.get("/settings/branding").then((r) => r.data),

  updateBranding: (data: {
    brandName?: string;
    logoUrl?: string;
    primaryColorHex?: string;
    customReportFooter?: string;
    whiteLabelEnabled: boolean;
  }) =>
    api.put("/settings/branding", data).then((r) => r.data),
};

export const ScheduledScanApi = {
  list: () =>
    api.get<ScheduledScan[]>("/scheduledscans").then((r) => r.data),

  create: (assetId: string, type: number, cronExpression: string) =>
    api
      .post("/scheduledscans", {
        assetId,
        type,
        cronExpression,
      })
      .then((r) => r.data),

  toggle: (id: string, enabled: boolean) =>
    api.put(`/scheduledscans/${id}/toggle`, { enabled }).then((r) => r.data),

  runNow: (id: string) =>
    api.post(`/scheduledscans/${id}/run-now`).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/scheduledscans/${id}`).then((r) => r.data),
};

export const ComplianceApi = {
  summary: () =>
    api.get("/compliance/summary").then((r) => r.data),
};

export const ExecutiveScorecardApi = {
  summary: () =>
    api.get("/executivescorecard/summary").then((r) => r.data),
};

export const ThreatIntelligenceApi = {
  summary: () =>
    api.get("/threatintelligence/summary").then((r) => r.data),
};

export const SocApi = {
  summary: () =>
    api.get("/soc/summary").then((r) => r.data),
};

export const AssetInventoryApi = {
  summary: () =>
    api.get("/assetinventory/summary").then((r) => r.data),
};

export const VendorRiskApi = {
  summary: () =>
    api.get("/vendorrisk/summary").then((r) => r.data),

  create: (data: {
    vendorName: string;
    website: string;
    businessCriticality?: string;
    serviceType?: string;
    contactEmail?: string;
    notes?: string;
  }) =>
    api
      .post("/vendorrisk", {
        vendorName: data.vendorName,
        website: data.website,
        businessCriticality: data.businessCriticality || "Medium",
        serviceType: data.serviceType || null,
        contactEmail: data.contactEmail || null,
        notes: data.notes || null,
      })
      .then((r) => r.data),

  assess: (id: string) =>
    api.post(`/vendorrisk/${id}/assess`).then((r) => r.data),

  updateStatus: (
    id: string,
    data: { reviewStatus?: string; businessCriticality?: string; notes?: string }
  ) =>
    api
      .put(`/vendorrisk/${id}/status`, {
        reviewStatus: data.reviewStatus || null,
        businessCriticality: data.businessCriticality || null,
        notes: data.notes || null,
      })
      .then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/vendorrisk/${id}`).then((r) => r.data),
};

export const DarkWebApi = {
  summary: () =>
    api.get("/darkweb/summary").then((r) => r.data),
};

export const SecurityAwarenessApi = {
  summary: () =>
    api.get("/securityawareness/summary").then((r) => r.data),
};

export const PhishingSimulationApi = {
  summary: () =>
    api.get("/phishingsimulation/summary").then((r) => r.data),
};

export const PolicyAuditApi = {
  summary: () =>
    api.get("/policyaudit/summary").then((r) => r.data),
};

export const FrameworkMappingApi = {
  summary: () =>
    api.get("/frameworkmapping/summary").then((r) => r.data),
};

export const CloudPostureApi = {
  summary: () =>
    api.get("/cloudposture/summary").then((r) => r.data),
};

export const AttackPathApi = {
  summary: () =>
    api.get("/attackpath/summary").then((r) => r.data),
};

export const IncidentPlaybookApi = {
  summary: () =>
    api.get("/incidentplaybook/summary").then((r) => r.data),
};

export const SaasAdminApi = {
  summary: () =>
    api.get("/saasadmin/summary").then((r) => r.data),
};

export const UserManagementApi = {
  summary: () =>
    api.get("/usermanagement/summary").then((r) => r.data),
};

export const AuditLogsApi = {
  summary: () =>
    api.get("/auditlogs/summary").then((r) => r.data),
};

export const MicrosoftAuthApi = {
  summary: () =>
    api.get("/microsoftauth/summary").then((r) => r.data),
};

export const GoogleAuthApi = {
  summary: () =>
    api.get("/googleauth/summary").then((r) => r.data),
};

export const UserInvitationsApi = {
  send: (email: string, role: string) =>
    api.post("/userinvitations/send", { email, role }).then((r) => r.data),
};

export const RbacApi = {
  summary: () =>
    api.get("/rbac/summary").then((r) => r.data),
};

export const BillingApi = {
  summary: () =>
    api.get("/billing/summary").then((r) => r.data),

  checkout: (data: { successUrl: string; cancelUrl: string }) =>
    api.post("/subscriptions/checkout", data).then((r) => r.data),
};

export const TenantRegistrationApi = {
  summary: () =>
    api.get("/tenantregistration/summary").then((r) => r.data),

  preview: (data: {
    companyName: string;
    adminName: string;
    adminEmail: string;
    plan: string;
  }) =>
    api.post("/tenantregistration/preview", data).then((r) => r.data),
};

export const AiCopilotApi = {
  summary: () =>
    api.get("/aicopilot/summary").then((r) => r.data),

  ask: (question: string) =>
    api.post("/aicopilot/ask", { question }).then((r) => r.data),
};

export const NotificationsApi = {
  summary: () =>
    api.get("/notifications/summary").then((r) => r.data),
};

export const GlobalSearchApi = {
  search: (q: string) =>
    api.get(`/globalsearch?q=${encodeURIComponent(q)}`).then((r) => r.data),
};

export const ProfileApi = {
  summary: () =>
    api.get("/profile/summary").then((r) => r.data),
};

export const RiskApi = {
  list: (params?: { status?: string | number; page?: number; pageSize?: number }) =>
    api
      .get<Paginated<Risk>>("/risks", {
        params: {
          status: params?.status === "All" ? undefined : params?.status,
          page: params?.page ?? 1,
          pageSize: params?.pageSize ?? 50,
        },
      })
      .then((r) => r.data),

  heatmap: () =>
    api
      .get<{ likelihood: number; impact: number; count: number }[]>(
        "/risks/heatmap"
      )
      .then((r) => r.data),

  create: (data: {
    title: string;
    description?: string;
    category?: string;
    likelihood: number;
    impact: number;
    owner?: string;
    mitigationPlan?: string;
  }) =>
    api
      .post("/risks", {
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        likelihood: data.likelihood,
        impact: data.impact,
        owner: data.owner || null,
        mitigationPlan: data.mitigationPlan || null,
      })
      .then((r) => r.data),

  update: (id: string, data: { status: number; mitigationPlan?: string; residualScore?: number | null }) =>
    api
      .put(`/risks/${id}`, {
        status: data.status,
        mitigationPlan: data.mitigationPlan || null,
        residualScore: data.residualScore ?? null,
      })
      .then((r) => r.data),
};
