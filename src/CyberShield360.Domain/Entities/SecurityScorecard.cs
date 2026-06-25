using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class SecurityScorecard : AuditableTenantEntity
{
    public Guid AssetId { get; set; }
    public int OverallScore { get; set; }            // 0-100
    public SecurityGrade OverallGrade { get; set; }
    public int NetworkSecurityScore { get; set; }
    public int ApplicationSecurityScore { get; set; }
    public int DnsHealthScore { get; set; }
    public int EmailSecurityScore { get; set; }
    public int PatchingScore { get; set; }
    public int BrandReputationScore { get; set; }
    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
}
