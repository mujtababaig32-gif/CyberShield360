using CyberShield360.Application.Common.Interfaces;
using Hangfire;

namespace CyberShield360.Infrastructure.Services;

/// <summary>Registers the platform's recurring background jobs (idempotent — safe to call on every startup).</summary>
public static class RecurringJobRegistrar
{
    public static void Register(IRecurringJobManager recurring)
    {
        // Sweep for due scheduled scans every 5 minutes.
        recurring.AddOrUpdate<IScanJobRunner>(
            "scheduled-scan-sweep", r => r.RunDueScheduledScansAsync(CancellationToken.None), "*/5 * * * *");

        // Refresh brand/domain monitoring hourly.
        recurring.AddOrUpdate<IScanJobRunner>(
            "brand-monitoring-refresh", r => r.RefreshBrandMonitoringAsync(CancellationToken.None), "0 * * * *");

        // Daily digest emails at 07:00 UTC.
        recurring.AddOrUpdate<IScanJobRunner>(
            "daily-scan-digest", r => r.SendScanDigestEmailsAsync(CancellationToken.None), "0 7 * * *");
    }
}
