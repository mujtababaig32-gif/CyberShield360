using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

/// <summary>Authorized internal phishing-simulation campaign for employee security training only.</summary>
public class PhishingCampaign : AuditableTenantEntity
{
    public string Name { get; set; } = default!;
    public string? TemplateName { get; set; }
    public PhishingCampaignStatus Status { get; set; } = PhishingCampaignStatus.Draft;
    public DateTime? ScheduledForUtc { get; set; }
    public DateTime? CompletedUtc { get; set; }
    public string? LandingPageMessage { get; set; }   // educational message shown after a click
    public bool AuthorizationConfirmed { get; set; }  // admin must confirm authorization
    public ICollection<PhishingTarget> Targets { get; set; } = new List<PhishingTarget>();
}

public class PhishingTarget : AuditableTenantEntity
{
    public Guid CampaignId { get; set; }
    public Guid UserId { get; set; }
    public PhishingResult Result { get; set; } = PhishingResult.NotSent;
    public DateTime? DeliveredUtc { get; set; }
    public DateTime? OpenedUtc { get; set; }
    public DateTime? ClickedUtc { get; set; }
    public DateTime? ReportedUtc { get; set; }
}
