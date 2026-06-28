using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Cronos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Services;

/// <summary>
/// Executes scheduled/recurring work outside the HTTP pipeline. Each unit of work runs in its own
/// DI scope and sets the tenant context explicitly so multi-tenant query filters are honoured.
/// </summary>
public class ScanJobRunner : IScanJobRunner
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScanJobRunner> _logger;

    public ScanJobRunner(IServiceScopeFactory scopeFactory, ILogger<ScanJobRunner> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <summary>Recurring sweep: finds every enabled schedule whose NextRunUtc has passed and runs it.</summary>
    public async Task RunDueScheduledScansAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;

        // Tenant provider has no tenant here -> global filter allows all tenants (system sweep).
        var due = await db.ScheduledScans
            .Where(s => s.Enabled && (s.NextRunUtc == null || s.NextRunUtc <= now))
            .OrderBy(s => s.NextRunUtc)
            .Select(s => s.Id)
            .Take(50)
            .ToListAsync(ct);

        _logger.LogInformation("ScheduledScan sweep: {Count} due", due.Count);

        foreach (var id in due)
        {
            try
            {
                await RunSingleScheduledScanAsync(id, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Scheduled scan {ScheduledScanId} failed during sweep", id);
            }
        }
    }

    /// <summary>Runs one scheduled scan within its tenant context and computes the next occurrence.</summary>
    public async Task RunSingleScheduledScanAsync(Guid scheduledScanId, CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<ApplicationDbContext>();
        var tenantProvider = sp.GetRequiredService<ITenantProvider>();
        var scanner = sp.GetRequiredService<ISecurityScannerService>();
        var emailSender = sp.GetRequiredService<IEmailSender>();

        var schedule = await db.ScheduledScans.IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == scheduledScanId, ct);

        if (schedule is null)
            return;

        tenantProvider.SetTenantId(schedule.TenantId);

        var asset = await db.Assets.FirstOrDefaultAsync(a => a.Id == schedule.AssetId, ct);
        if (asset is null)
        {
            _logger.LogWarning("Asset {AssetId} missing for schedule {ScheduledScanId}", schedule.AssetId, scheduledScanId);
            schedule.LastRunUtc = DateTime.UtcNow;
            schedule.NextRunUtc = ComputeNextRun(schedule.CronExpression, DateTime.UtcNow);
            await db.SaveChangesAsync(ct);
            return;
        }

        var startedAtUtc = DateTime.UtcNow;

        // Claim the schedule before the scan begins so a slow scan is not picked up again by the next sweep.
        schedule.LastRunUtc = startedAtUtc;
        schedule.NextRunUtc = ComputeNextRun(schedule.CronExpression, startedAtUtc) ?? startedAtUtc.AddDays(1);
        await db.SaveChangesAsync(ct);

        var scan = new SecurityScan
        {
            TenantId = schedule.TenantId,
            AssetId = asset.Id,
            Type = schedule.Type,
            Status = ScanStatus.Running,
            StartedUtc = startedAtUtc
        };

        db.Scans.Add(scan);
        await db.SaveChangesAsync(ct);

        try
        {
            var result = await scanner.RunScanAsync(asset.Domain, schedule.Type, ct);

            scan.Score = result.Score;
            scan.Grade = result.Grade;
            scan.Status = ScanStatus.Completed;
            scan.CompletedUtc = DateTime.UtcNow;
            scan.RawResultJson = result.RawJson;

            foreach (var finding in result.Findings)
            {
                db.ScanFindings.Add(new ScanFinding
                {
                    ScanId = scan.Id,
                    TenantId = schedule.TenantId,
                    CheckKey = finding.CheckKey,
                    Title = finding.Title,
                    Severity = finding.Severity,
                    Passed = finding.Passed,
                    Detail = finding.Detail,
                    Recommendation = finding.Recommendation
                });
            }

            asset.LastScannedUtc = scan.CompletedUtc;

            foreach (var finding in result.Findings.Where(x => !x.Passed && x.Severity >= Severity.High))
            {
                var exists = await db.Vulnerabilities.AnyAsync(
                    vulnerability =>
                        vulnerability.AssetId == asset.Id &&
                        vulnerability.Title == finding.Title &&
                        vulnerability.Status == VulnerabilityStatus.Open,
                    ct);

                if (!exists)
                {
                    db.Vulnerabilities.Add(new Vulnerability
                    {
                        TenantId = schedule.TenantId,
                        AssetId = asset.Id,
                        Title = finding.Title,
                        Description = finding.Detail,
                        Severity = finding.Severity,
                        Status = VulnerabilityStatus.Open,
                        DueDateUtc = DateTime.UtcNow.AddDays(finding.Severity == Severity.Critical ? 7 : 30)
                    });
                }
            }

            await NotifyAsync(db, emailSender, schedule.TenantId, asset.Domain, scan, ct);
        }
        catch (Exception ex)
        {
            scan.Status = ScanStatus.Failed;
            scan.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Scheduled scan failed for {Domain}", asset.Domain);
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task RefreshBrandMonitoringAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var assets = await db.Assets.IgnoreQueryFilters()
            .Where(a => a.MonitoringEnabled)
            .ToListAsync(ct);

        // Placeholder for typosquat/cert-transparency/leaked-credential providers.
        _logger.LogInformation("Brand monitoring refresh across {Count} assets", assets.Count);
        await Task.CompletedTask;
    }

    public async Task SendScanDigestEmailsAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var since = DateTime.UtcNow.AddDays(-1);
        var tenants = await db.Tenants.IgnoreQueryFilters().Where(t => t.IsActive).ToListAsync(ct);
        _logger.LogInformation("Preparing daily digests for {Count} tenants since {Since}", tenants.Count, since);
        await Task.CompletedTask;
    }

    private static async Task NotifyAsync(
        ApplicationDbContext db,
        IEmailSender email,
        Guid tenantId,
        string domain,
        SecurityScan scan,
        CancellationToken ct)
    {
        var admins = await db.Users.IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId && u.IsActive && u.Email != null)
            .Select(u => u.Email!)
            .ToListAsync(ct);

        var subject = $"[CyberShield360] Scheduled scan complete for {domain} — Grade {scan.Grade} ({scan.Score}/100)";
        var body = $"<p>A scheduled <b>{scan.Type}</b> scan for <b>{domain}</b> finished with grade " +
                   $"<b>{scan.Grade}</b> and a score of <b>{scan.Score}/100</b>.</p>";

        foreach (var to in admins)
        {
            var log = new NotificationLog
            {
                TenantId = tenantId,
                Channel = NotificationChannel.Email,
                Recipient = to,
                Subject = subject,
                Body = body
            };

            try
            {
                await email.SendAsync(to, subject, body, ct);
                log.Sent = true;
                log.SentAtUtc = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                log.Sent = false;
                log.Error = ex.Message;
            }

            db.Notifications.Add(log);
        }
    }

    public static DateTime? ComputeNextRun(string cron, DateTime fromUtc)
    {
        try
        {
            var expr = CronExpression.Parse(cron, CronFormat.Standard);
            return expr.GetNextOccurrence(fromUtc, TimeZoneInfo.Utc);
        }
        catch
        {
            return fromUtc.AddDays(1);
        }
    }
}
