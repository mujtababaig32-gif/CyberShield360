using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class AiRemediationGuidance : AuditableTenantEntity
{
    public Guid ScanId { get; set; }
    public SecurityScan? Scan { get; set; }

    public Guid AssetId { get; set; }
    public MonitoredAsset? Asset { get; set; }

    public string Domain { get; set; } = default!;
    public int Score { get; set; }
    public SecurityGrade Grade { get; set; }
    public int FailedFindings { get; set; }
    public int HighCriticalFindings { get; set; }

    public string Provider { get; set; } = "Rules Engine";
    public string Status { get; set; } = "Generated";
    public string ExecutiveSummary { get; set; } = default!;
    public string BusinessImpact { get; set; } = default!;
    public string PrioritizedActionsJson { get; set; } = "[]";
    public string VerificationStepsJson { get; set; } = "[]";
    public string? RawModelJson { get; set; }
    public DateTime GeneratedUtc { get; set; } = DateTime.UtcNow;
}
