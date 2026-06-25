using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class SecurityScan : AuditableTenantEntity
{
    public Guid AssetId { get; set; }
    public MonitoredAsset? Asset { get; set; }
    public ScanType Type { get; set; }
    public ScanStatus Status { get; set; } = ScanStatus.Queued;
    public DateTime? StartedUtc { get; set; }
    public DateTime? CompletedUtc { get; set; }
    public int Score { get; set; }                 // 0-100
    public SecurityGrade Grade { get; set; }
    public string? RawResultJson { get; set; }     // serialized scanner output
    public string? ErrorMessage { get; set; }

    public ICollection<ScanFinding> Findings { get; set; } = new List<ScanFinding>();
}

public class ScanFinding : AuditableTenantEntity
{
    public Guid ScanId { get; set; }
    public SecurityScan? Scan { get; set; }
    public string CheckKey { get; set; } = default!;   // e.g. "ssl.expiry", "headers.hsts"
    public string Title { get; set; } = default!;
    public Severity Severity { get; set; }
    public bool Passed { get; set; }
    public string? Detail { get; set; }
    public string? Recommendation { get; set; }
}
