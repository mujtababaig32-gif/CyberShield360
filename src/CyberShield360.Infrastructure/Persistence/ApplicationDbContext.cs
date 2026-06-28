using System.Linq.Expressions;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Common;
using CyberShield360.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Infrastructure.Persistence;

public class ApplicationDbContext
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>, IApplicationDbContext
{
    private readonly ITenantProvider _tenantProvider;
    private readonly ICurrentUser _currentUser;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options,
        ITenantProvider tenantProvider, ICurrentUser currentUser) : base(options)
    {
        _tenantProvider = tenantProvider;
        _currentUser = currentUser;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<MonitoredAsset> Assets => Set<MonitoredAsset>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<SecurityScan> Scans => Set<SecurityScan>();
    public DbSet<ScanFinding> ScanFindings => Set<ScanFinding>();
    public DbSet<SecurityScorecard> Scorecards => Set<SecurityScorecard>();
    public DbSet<Vulnerability> Vulnerabilities => Set<Vulnerability>();
    public DbSet<RemediationStep> RemediationSteps => Set<RemediationStep>();
    public DbSet<Risk> Risks => Set<Risk>();
    public DbSet<BrandAlert> BrandAlerts => Set<BrandAlert>();
    public DbSet<SocialAuditResult> SocialAudits => Set<SocialAuditResult>();
    public DbSet<TrainingCourse> TrainingCourses => Set<TrainingCourse>();
    public DbSet<TrainingModule> TrainingModules => Set<TrainingModule>();
    public DbSet<TrainingEnrollment> TrainingEnrollments => Set<TrainingEnrollment>();
    public DbSet<PhishingCampaign> PhishingCampaigns => Set<PhishingCampaign>();
    public DbSet<PhishingTarget> PhishingTargets => Set<PhishingTarget>();
    public DbSet<NotificationLog> Notifications => Set<NotificationLog>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ScheduledScan> ScheduledScans => Set<ScheduledScan>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<GeneratedReport> Reports => Set<GeneratedReport>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Global query filters: tenant isolation + soft delete
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            if (typeof(ITenantScoped).IsAssignableFrom(clrType) && typeof(ISoftDelete).IsAssignableFrom(clrType))
            {
                var method = typeof(ApplicationDbContext)
                    .GetMethod(nameof(BuildTenantSoftDeleteFilter),
                        System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!
                    .MakeGenericMethod(clrType);
                builder.Entity(clrType).HasQueryFilter((LambdaExpression)method.Invoke(this, null)!);
            }
        }
    }

    private LambdaExpression BuildTenantSoftDeleteFilter<TEntity>()
        where TEntity : class, ITenantScoped, ISoftDelete
    {
        Expression<Func<TEntity, bool>> filter = e =>
            !e.IsDeleted &&
            (_tenantProvider.GetTenantId() == null || e.TenantId == _tenantProvider.GetTenantId());
        return filter;
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAtUtc = now;
                    entry.Entity.CreatedBy = _currentUser.Email;
                    if (entry.Entity is ITenantScoped ts && ts.TenantId == Guid.Empty
                        && _tenantProvider.GetTenantId() is Guid tid)
                        ts.TenantId = tid;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAtUtc = now;
                    entry.Entity.UpdatedBy = _currentUser.Email;
                    break;
            }
            // Convert hard deletes to soft deletes
            if (entry.State == EntityState.Deleted && entry.Entity is ISoftDelete sd)
            {
                entry.State = EntityState.Modified;
                sd.IsDeleted = true;
                sd.DeletedAtUtc = now;
            }
        }
        return await base.SaveChangesAsync(cancellationToken);
    }
}
