using System.Linq.Expressions;

namespace CyberShield360.Application.Common.Interfaces;

/// <summary>Abstraction over the background job scheduler (Hangfire) so the Application layer stays infra-agnostic.</summary>
public interface IBackgroundJobService
{
    string Enqueue(Expression<Func<Task>> methodCall);
    string Schedule(Expression<Func<Task>> methodCall, TimeSpan delay);
    void AddOrUpdateRecurring(string recurringJobId, Expression<Func<Task>> methodCall, string cronExpression);
    void RemoveRecurring(string recurringJobId);
}

/// <summary>Worker entry points invoked by the scheduler. Implemented in Infrastructure.</summary>
public interface IScanJobRunner
{
    Task RunDueScheduledScansAsync(CancellationToken ct = default);
    Task RunSingleScheduledScanAsync(Guid scheduledScanId, CancellationToken ct = default);
    Task RefreshBrandMonitoringAsync(CancellationToken ct = default);
    Task SendScanDigestEmailsAsync(CancellationToken ct = default);
}
