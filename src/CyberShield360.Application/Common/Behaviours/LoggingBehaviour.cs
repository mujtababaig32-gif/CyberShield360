using MediatR.Pipeline;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Application.Common.Behaviours;

public class LoggingBehaviour<TRequest> : IRequestPreProcessor<TRequest> where TRequest : notnull
{
    private readonly ILogger<TRequest> _logger;
    public LoggingBehaviour(ILogger<TRequest> logger) => _logger = logger;

    public Task Process(TRequest request, CancellationToken ct)
    {
        _logger.LogInformation("Handling {RequestName}", typeof(TRequest).Name);
        return Task.CompletedTask;
    }
}
