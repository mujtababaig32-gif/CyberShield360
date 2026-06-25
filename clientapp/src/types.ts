export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresUtc: string;
  tenantId: string;
  email: string;
  roles: string[];
}

export interface DashboardTrendPoint {
  date: string;
  score: number;
  domain?: string;
}

export interface SeverityBucket {
  severity: string;
  count: number;
}

export interface DashboardAssetSummary {
  assetId?: string;
  domain: string;
  score: number;
  grade: string;
  failedFindings?: number;
  highCriticalFindings?: number;
  lastScanUtc?: string;
}

export interface DashboardLatestScan {
  scanId: string;
  assetId: string;
  domain: string;
  score: number;
  grade: string;
  failedFindings: number;
  completedUtc?: string;
}

export interface PostureDashboard {
  generatedUtc?: string;
  overallScore: number;
  overallGrade: string;
  postureStatus?: string;
  assetCount: number;
  monitoredAssetCount?: number;
  fullPostureAssets?: number;
  openVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities?: number;
  openRisks: number;
  activeBrandAlerts: number;
  trainingCompletionPercent: number;
  totalChecks?: number;
  passedFindings?: number;
  failedFindings?: number;
  highCriticalFindings?: number;
  latestScanUtc?: string;
  vulnerabilityBySeverity: SeverityBucket[];
  findingBySeverity?: SeverityBucket[];
  scoreTrend: DashboardTrendPoint[];
  weakestAssets?: DashboardAssetSummary[];
  latestScans?: DashboardLatestScan[];
  executiveActions?: string[];
}


export interface Vulnerability {
  id: string;
  title: string;
  description?: string;
  cveId?: string;
  cvssScore?: number;
  severity: string | number;
  status: string | number;
  assignedToUserId?: string;
  dueDateUtc?: string;
}

export interface Paginated<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
}

export interface Asset {
  id: string;
  domain: string;
  displayName?: string;
  isPrimary: boolean;
  monitoringEnabled?: boolean;
  lastScannedUtc?: string;
  latestScanId?: string;
  latestScore?: number;
  latestGrade?: string;
  latestFullPostureScanId?: string;
  latestFullPostureScore?: number;
  latestFullPostureGrade?: string;
  failedFindings?: number;
  highCriticalFindings?: number;
}

export interface Risk {
  id: string;
  title: string;
  description?: string;
  category?: string;
  likelihood?: string | number;
  impact?: string | number;
  inherentScore: number;
  residualScore?: number | null;
  status: string | number;
  owner?: string;
  mitigationPlan?: string;
}

export interface ScheduledScan {
  id: string;
  assetId: string;
  assetDomain?: string;
  type: number | string;
  typeName?: string;
  cronExpression: string;
  enabled: boolean;
  lastRunUtc?: string;
  nextRunUtc?: string;
}

export interface ScanRecommendation {
  scanId: string;
  domain: string;
  score: number;
  grade: string;
  failedFindings: number;
  recommendations: string[];
}
