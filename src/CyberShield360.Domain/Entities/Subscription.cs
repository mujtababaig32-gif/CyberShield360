using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class Subscription : AuditableTenantEntity
{
    public SubscriptionPlan Plan { get; set; } = SubscriptionPlan.Free;
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trialing;
    public string? StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public string? StripePriceId { get; set; }
    public DateTime? CurrentPeriodEndUtc { get; set; }
    public DateTime? TrialEndsUtc { get; set; }

    // Plan limits
    public int MaxAssets { get; set; } = 1;
    public int MaxUsers { get; set; } = 3;
    public int MaxScansPerMonth { get; set; } = 10;
}
