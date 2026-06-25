using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Dashboard.Queries;

public record GetPostureDashboardQuery() : IRequest<PostureDashboardDto>;

public record PostureDashboardDto(
    int OverallScore,
    string OverallGrade,
    int AssetCount,
    int OpenVulnerabilities,
    int CriticalVulnerabilities,
    int OpenRisks,
    int ActiveBrandAlerts,
    int TrainingCompletionPercent,
    IReadOnlyList<SeverityBucketDto> VulnerabilityBySeverity,
    IReadOnlyList<TrendPointDto> ScoreTrend);

public record SeverityBucketDto(string Severity, int Count);
public record TrendPointDto(DateTime Date, int Score);

public class GetPostureDashboardHandler : IRequestHandler<GetPostureDashboardQuery, PostureDashboardDto>
{
    private readonly IApplicationDbContext _db;
    public GetPostureDashboardHandler(IApplicationDbContext db) => _db = db;

    public async Task<PostureDashboardDto> Handle(GetPostureDashboardQuery request, CancellationToken ct)
    {
        var assetCount = await _db.Assets.CountAsync(ct);
        var openVulns = await _db.Vulnerabilities.CountAsync(v => v.Status == VulnerabilityStatus.Open, ct);
        var critical = await _db.Vulnerabilities.CountAsync(
            v => v.Severity == Severity.Critical && v.Status == VulnerabilityStatus.Open, ct);
        var openRisks = await _db.Risks.CountAsync(r => r.Status != RiskStatus.Closed, ct);
        var alerts = await _db.BrandAlerts.CountAsync(a => a.Status == AlertStatus.New || a.Status == AlertStatus.Investigating, ct);

        var bySeverity = await _db.Vulnerabilities
            .Where(v => v.Status == VulnerabilityStatus.Open)
            .GroupBy(v => v.Severity)
            .Select(g => new SeverityBucketDto(g.Key.ToString(), g.Count()))
            .ToListAsync(ct);

        var trend = await _db.Scans.Where(s => s.Status == ScanStatus.Completed)
            .OrderByDescending(s => s.CompletedUtc).Take(30)
            .Select(s => new TrendPointDto(s.CompletedUtc!.Value, s.Score))
            .ToListAsync(ct);

        var avgScore = trend.Count > 0 ? (int)trend.Average(t => t.Score) : 0;
        var grade = avgScore >= 90 ? "A" : avgScore >= 80 ? "B" : avgScore >= 70 ? "C" : avgScore >= 60 ? "D" : "F";

        var totalEnroll = await _db.TrainingEnrollments.CountAsync(ct);
        var completed = await _db.TrainingEnrollments.CountAsync(e => e.Status == TrainingStatus.Completed, ct);
        var trainingPct = totalEnroll > 0 ? completed * 100 / totalEnroll : 0;

        return new PostureDashboardDto(avgScore, grade, assetCount, openVulns, critical, openRisks,
            alerts, trainingPct, bySeverity, trend.OrderBy(t => t.Date).ToList());
    }
}
