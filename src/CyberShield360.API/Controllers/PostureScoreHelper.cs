using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;

namespace CyberShield360.API.Controllers;

internal static class PostureScoreHelper
{
    public static bool IsCompletedFullPosture(SecurityScan scan) =>
        scan.Status == ScanStatus.Completed && scan.Type == ScanType.FullPosture;

    public static DateTime SortUtc(SecurityScan scan) =>
        scan.CompletedUtc ?? scan.StartedUtc ?? scan.CreatedAtUtc;

    public static int NormalizeScore(int score) => Math.Clamp(score, 0, 100);

    // Keep this aligned with Infrastructure.Services.ScoreCalculator.
    public static SecurityGrade GradeFromScore(int score) => NormalizeScore(score) switch
    {
        >= 95 => SecurityGrade.A,
        >= 85 => SecurityGrade.B,
        >= 75 => SecurityGrade.C,
        >= 60 => SecurityGrade.D,
        _ => SecurityGrade.F
    };

    public static string GradeLabel(SecurityScan scan)
    {
        if (Enum.IsDefined(typeof(SecurityGrade), scan.Grade))
            return scan.Grade.ToString();

        return GradeFromScore(scan.Score).ToString();
    }

    public static string GradeLabel(int score) => GradeFromScore(score).ToString();

    public static string PostureStatus(int score) => NormalizeScore(score) switch
    {
        >= 85 => "Strong",
        >= 70 => "Moderate",
        >= 50 => "Elevated Risk",
        _ => "High Risk"
    };

    public static string RiskLevel(int score, int highCriticalFindings, int criticalFindings, int failedFindings) =>
        criticalFindings > 0 ? "Critical" :
        highCriticalFindings > 5 ? "High" :
        score < 50 || failedFindings > 5 ? "Medium" :
        "Low";
}
