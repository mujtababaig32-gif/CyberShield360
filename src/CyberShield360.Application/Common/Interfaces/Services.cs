using CyberShield360.Application.Security.Models;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Application.Common.Interfaces;

public interface ISecurityScannerService
{
    Task<ScanResultDto> RunScanAsync(string domain, ScanType type, CancellationToken ct = default);
}

public interface IScoreCalculator
{
    (int score, SecurityGrade grade) Calculate(IEnumerable<FindingDto> findings);
    SecurityGrade GradeFromScore(int score);
}

public interface IJwtTokenService
{
    (string accessToken, DateTime expiresUtc) CreateToken(Guid userId, string email, Guid tenantId, IEnumerable<string> roles);
    string CreateRefreshToken();
}

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
}

public interface IReportGenerator
{
    Task<byte[]> GeneratePdfAsync(ReportModel model, CancellationToken ct = default);
    Task<byte[]> GenerateExcelAsync(ReportModel model, CancellationToken ct = default);
}

public interface IAiRecommendationService
{
    Task<IReadOnlyList<string>> GetRecommendationsAsync(string context, CancellationToken ct = default);
}

public interface ILemonSqueezyService
{
    Task<string> CreateCheckoutSessionAsync(
        Guid tenantId,
        string successUrl,
        string cancelUrl,
        string? customerEmail = null,
        CancellationToken ct = default);

    Task HandleWebhookAsync(string payload, string signature, CancellationToken ct = default);
}
public interface IDateTime { DateTime UtcNow { get; } }
