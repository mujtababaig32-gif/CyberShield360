using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Application.Common.Behaviours;

public class PerformanceBehaviour<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly Stopwatch _timer = new();
    private readonly ILogger<TRequest> _logger;
    public PerformanceBehaviour(ILogger<TRequest> logger) => _logger = logger;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        _timer.Start();
        var response = await next();
        _timer.Stop();
        if (_timer.ElapsedMilliseconds > 500)
            _logger.LogWarning("Long running request {Name} ({Elapsed}ms)", typeof(TRequest).Name, _timer.ElapsedMilliseconds);
        return response;
    }
}
