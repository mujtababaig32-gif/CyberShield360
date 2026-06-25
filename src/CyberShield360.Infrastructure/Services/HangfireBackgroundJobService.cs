using System.Linq.Expressions;
using CyberShield360.Application.Common.Interfaces;
using Hangfire;

namespace CyberShield360.Infrastructure.Services;

public class HangfireBackgroundJobService : IBackgroundJobService
{
    private readonly IBackgroundJobClient _client;
    private readonly IRecurringJobManager _recurring;
    public HangfireBackgroundJobService(IBackgroundJobClient client, IRecurringJobManager recurring)
    { _client = client; _recurring = recurring; }

    public string Enqueue(Expression<Func<Task>> methodCall) => _client.Enqueue(methodCall);

    public string Schedule(Expression<Func<Task>> methodCall, TimeSpan delay)
        => _client.Schedule(methodCall, delay);

    public void AddOrUpdateRecurring(string recurringJobId, Expression<Func<Task>> methodCall, string cronExpression)
        => _recurring.AddOrUpdate(recurringJobId, methodCall, cronExpression, new RecurringJobOptions());

    public void RemoveRecurring(string recurringJobId) => _recurring.RemoveIfExists(recurringJobId);
}
