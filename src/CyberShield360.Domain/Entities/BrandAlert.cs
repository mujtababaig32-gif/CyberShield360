using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class BrandAlert : AuditableTenantEntity
{
    public BrandAlertType Type { get; set; }
    public Severity Severity { get; set; }
    public AlertStatus Status { get; set; } = AlertStatus.New;
    public string Title { get; set; } = default!;
    public string? Detail { get; set; }
    public string? SourceUrl { get; set; }
    public string? RelatedDomain { get; set; }
    public DateTime DetectedAtUtc { get; set; } = DateTime.UtcNow;
}

public class SocialAuditResult : AuditableTenantEntity
{
    public string Platform { get; set; } = default!;     // e.g. "Twitter/X", "LinkedIn"
    public string Handle { get; set; } = default!;
    public bool IsVerified { get; set; }
    public bool MfaRecommended { get; set; }
    public int Score { get; set; }
    public string? FindingsJson { get; set; }
}
