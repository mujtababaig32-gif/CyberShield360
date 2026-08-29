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
    string HashRefreshToken(string refreshToken);
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

    Task<AiRemediationPlanDto> GenerateRemediationPlanAsync(
        AiRemediationContextDto context,
        CancellationToken ct = default);
}

public record AiRemediationFindingContextDto(
    string CheckKey,
    string Title,
    string Severity,
    string Detail,
    string Recommendation);

public record AiRemediationContextDto(
    Guid ScanId,
    string Domain,
    int Score,
    string Grade,
    IReadOnlyList<AiRemediationFindingContextDto> FailedFindings);

public record AiRemediationActionDto(
    string FindingTitle,
    string Severity,
    string Priority,
    string PlainEnglishIssue,
    string BusinessImpact,
    string RecommendedFix,
    string Owner,
    string Difficulty,
    string VerificationStep,
    int EstimatedEffortHours);

public record AiRemediationPlanDto(
    Guid ScanId,
    string Domain,
    int Score,
    string Grade,
    int FailedFindings,
    int HighCriticalFindings,
    string Provider,
    string ExecutiveSummary,
    string BusinessImpact,
    IReadOnlyList<AiRemediationActionDto> Actions,
    IReadOnlyList<string> VerificationSteps,
    DateTime GeneratedUtc);

public interface ILemonSqueezyService
{
    Task<string> CreateCheckoutSessionAsync(
        Guid tenantId,
        string successUrl,
        string cancelUrl,
        string? customerEmail = null,
        CancellationToken ct = default);

    /// <summary>Verifies the webhook's HMAC signature before processing it. Returns false (and does not process) on an invalid or missing signature.</summary>
    Task<bool> HandleWebhookAsync(string payload, string signature, CancellationToken ct = default);
}
public interface IDateTime { DateTime UtcNow { get; } }
