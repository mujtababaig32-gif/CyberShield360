using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class Risk : AuditableTenantEntity
{
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public RiskLikelihood Likelihood { get; set; }
    public RiskImpact Impact { get; set; }
    public int InherentScore => (int)Likelihood * (int)Impact;   // 1..25
    public RiskStatus Status { get; set; } = RiskStatus.Identified;
    public string? Owner { get; set; }
    public string? MitigationPlan { get; set; }
    public int? ResidualScore { get; set; }
}
