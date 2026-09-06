using CyberShield360.Domain.Enums;

namespace CyberShield360.Application.Common;

// Single source of truth for what each plan tier grants, used by both self-service
// signup (AuthController.Register) and paid-checkout activation (the Lemon Squeezy
// webhook) so the two paths can never drift out of sync with each other.
public static class PlanCatalog
{
    public record PlanTier(SubscriptionPlan Plan, int MaxAssets, int MaxUsers, int MaxScansPerMonth);

    public static readonly IReadOnlyDictionary<string, PlanTier> Tiers = new Dictionary<string, PlanTier>(StringComparer.OrdinalIgnoreCase)
    {
        ["Starter"] = new(SubscriptionPlan.Starter, 25, 3, 50),
        ["Professional"] = new(SubscriptionPlan.Professional, 100, 10, 250),
        ["Enterprise"] = new(SubscriptionPlan.Enterprise, 500, 25, 1000),
        ["Agency"] = new(SubscriptionPlan.Agency, 5000, 100, 10000),
    };

    private static readonly PlanTier FreeTier = new(SubscriptionPlan.Free, 1, 3, 10);

    public static PlanTier Resolve(string? planName) =>
        planName is not null && Tiers.TryGetValue(planName, out var tier) ? tier : FreeTier;
}
