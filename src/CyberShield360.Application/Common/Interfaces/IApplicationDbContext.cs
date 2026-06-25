using CyberShield360.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Tenant> Tenants { get; }
    DbSet<Subscription> Subscriptions { get; }
    DbSet<MonitoredAsset> Assets { get; }
    DbSet<SecurityScan> Scans { get; }
    DbSet<ScanFinding> ScanFindings { get; }
    DbSet<SecurityScorecard> Scorecards { get; }
    DbSet<Vulnerability> Vulnerabilities { get; }
    DbSet<RemediationStep> RemediationSteps { get; }
    DbSet<Risk> Risks { get; }
    DbSet<BrandAlert> BrandAlerts { get; }
    DbSet<SocialAuditResult> SocialAudits { get; }
    DbSet<TrainingCourse> TrainingCourses { get; }
    DbSet<TrainingModule> TrainingModules { get; }
    DbSet<TrainingEnrollment> TrainingEnrollments { get; }
    DbSet<PhishingCampaign> PhishingCampaigns { get; }
    DbSet<PhishingTarget> PhishingTargets { get; }
    DbSet<NotificationLog> Notifications { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<ScheduledScan> ScheduledScans { get; }
    DbSet<ApiKey> ApiKeys { get; }
    DbSet<GeneratedReport> Reports { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
