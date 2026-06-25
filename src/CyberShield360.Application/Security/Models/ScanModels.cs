using CyberShield360.Domain.Enums;

namespace CyberShield360.Application.Security.Models;

public record FindingDto(
    string CheckKey,
    string Title,
    Severity Severity,
    bool Passed,
    string? Detail,
    string? Recommendation);

public class ScanResultDto
{
    public string Domain { get; set; } = default!;
    public ScanType Type { get; set; }
    public int Score { get; set; }
    public SecurityGrade Grade { get; set; }
    public List<FindingDto> Findings { get; set; } = new();
    public string? RawJson { get; set; }
    public string? Error { get; set; }
}

public class ReportModel
{
    public string Title { get; set; } = "Executive Security Assessment Report";

    public string TenantName { get; set; } = default!;

    public string? AssetDomain { get; set; }

    public string? ScanId { get; set; }

    public string? ScanType { get; set; }

    public string? BrandName { get; set; }

    public string? LogoUrl { get; set; }

    public string? PrimaryColorHex { get; set; }

    public string? FooterText { get; set; }

    public int OverallScore { get; set; }

    public string Grade { get; set; } = "N/A";

    public List<FindingDto> Findings { get; set; } = new();

    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;

    public string DataSource { get; set; } =
        "CyberShield360 scanner results stored for this scan.";

    public string AccuracyNote { get; set; } =
        "This report reflects the scan findings available at generation time.";
}