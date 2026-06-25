# Database Schema

Generated via EF Core Code-First migrations. Core tables (multi-tenant tables carry `TenantId`,
`IsDeleted`, `DeletedAtUtc`, plus audit columns `CreatedAtUtc/By`, `UpdatedAtUtc/By`).

## Identity & Tenancy
- **Tenants** (Id, Name, Slug *unique*, PrimaryDomain, WhiteLabelEnabled, BrandName, LogoUrl, PrimaryColorHex, CustomReportFooter, IsActive)
- **Subscriptions** (Id, TenantId *FK 1:1*, Plan, Status, StripeCustomerId, StripeSubscriptionId, CurrentPeriodEndUtc, MaxAssets, MaxUsers, MaxScansPerMonth)
- **AspNetUsers** (extended: TenantId, FullName, JobTitle, IsActive, LastLoginUtc, AvatarUrl)
- **AspNetRoles / AspNetUserRoles / AspNetUserClaims** (ASP.NET Identity)

## Assets & Scanning
- **MonitoredAssets** (Id, TenantId, Domain, DisplayName, IsPrimary, MonitoringEnabled, LastScannedUtc) — *unique (TenantId, Domain)*
- **SecurityScans** (Id, TenantId, AssetId *FK*, Type, Status, StartedUtc, CompletedUtc, Score, Grade, RawResultJson, ErrorMessage) — *index (TenantId, AssetId, CreatedAtUtc)*
- **ScanFindings** (Id, TenantId, ScanId *FK*, CheckKey, Title, Severity, Passed, Detail, Recommendation)
- **SecurityScorecards** (Id, TenantId, AssetId, OverallScore, OverallGrade, Network/App/Dns/Email/Patching/BrandReputation scores, GeneratedAtUtc)
- **ScheduledScans** (Id, TenantId, AssetId, Type, CronExpression, Enabled, LastRunUtc, NextRunUtc)

## Vulnerabilities & Risk
- **Vulnerabilities** (Id, TenantId, AssetId, Title, Description, CveId, CvssScore, Severity, Status, AssignedToUserId, DueDateUtc, RemediatedAtUtc, RemediationNotes) — *index (TenantId, Status, Severity)*
- **RemediationSteps** (Id, TenantId, VulnerabilityId *FK*, Description, IsDone, CompletedBy, CompletedAtUtc)
- **Risks** (Id, TenantId, Title, Category, Likelihood, Impact, InherentScore [computed], Status, Owner, MitigationPlan, ResidualScore)

## Monitoring
- **BrandAlerts** (Id, TenantId, Type, Severity, Status, Title, Detail, SourceUrl, RelatedDomain, DetectedAtUtc)
- **SocialAuditResults** (Id, TenantId, Platform, Handle, IsVerified, MfaRecommended, Score, FindingsJson)

## Training & Phishing
- **TrainingCourses** (Id, TenantId, Title, DurationMinutes, ContentUrl, IsPublished)
- **TrainingModules** (Id, TenantId, CourseId *FK*, Title, Order, ContentMarkdown, QuizPassPercent)
- **TrainingEnrollments** (Id, TenantId, CourseId, UserId, Status, ProgressPercent, QuizScore, CompletedAtUtc, DueDateUtc)
- **PhishingCampaigns** (Id, TenantId, Name, TemplateName, Status, ScheduledForUtc, AuthorizationConfirmed, LandingPageMessage)
- **PhishingTargets** (Id, TenantId, CampaignId *FK*, UserId, Result, Delivered/Opened/Clicked/ReportedUtc)

## Platform
- **NotificationLogs** (Id, TenantId, Channel, Recipient, Subject, Body, Sent, SentAtUtc, Error)
- **AuditLogs** (Id, TenantId, UserId, UserEmail, Action, EntityType, EntityId, Description, IpAddress, UserAgent) — *index (TenantId, CreatedAtUtc)*
- **ApiKeys** (Id, TenantId, Name, KeyHash *unique*, Prefix, ExpiresAtUtc, LastUsedUtc, Revoked)
- **GeneratedReports** (Id, TenantId, Title, Format, StoragePath, AssetId, WhiteLabeled)

### ER overview
```
Tenant 1───* MonitoredAsset 1───* SecurityScan 1───* ScanFinding
Tenant 1───1 Subscription
Tenant 1───* ApplicationUser *───* Role
Tenant 1───* Vulnerability 1───* RemediationStep
Tenant 1───* Risk / BrandAlert / SocialAuditResult
Tenant 1───* TrainingCourse 1───* TrainingModule ;  TrainingEnrollment (User × Course)
Tenant 1───* PhishingCampaign 1───* PhishingTarget
```
