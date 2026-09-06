using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class BillingController : ApiControllerBase
{
    private readonly ICurrentUser _user;
    private readonly IConfiguration _config;
    private readonly ApplicationDbContext _db;

    public BillingController(ICurrentUser user, IConfiguration config, ApplicationDbContext db)
    {
        _user = user;
        _config = config;
        _db = db;
    }

    private static readonly string[] PlanNames = ["Starter", "Professional", "Enterprise", "Agency"];

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var subscription = await _db.Subscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TenantId == tid, ct);

        var apiKeyConfigured = !string.IsNullOrWhiteSpace(_config["LemonSqueezy:ApiKey"]);
        var storeConfigured = !string.IsNullOrWhiteSpace(_config["LemonSqueezy:StoreId"]);
        var webhookConfigured = !string.IsNullOrWhiteSpace(_config["LemonSqueezy:WebhookSecret"]);
        var configuredVariants = PlanNames
            .Where(p => !string.IsNullOrWhiteSpace(_config[$"LemonSqueezy:VariantIds:{p}"]))
            .ToArray();
        var allVariantsConfigured = configuredVariants.Length == PlanNames.Length;

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,

            provider = "Lemon Squeezy",

            currentPlan = new
            {
                name = subscription?.Plan.ToString() ?? "Free",
                status = subscription?.Status.ToString() ?? "Trialing",
                trialEndsUtc = subscription?.TrialEndsUtc,
                currentPeriodEndUtc = subscription?.CurrentPeriodEndUtc,
                billingProvider = "Lemon Squeezy"
            },

            configuration = new
            {
                apiKey = apiKeyConfigured ? "Configured" : "Not Configured",
                storeId = storeConfigured ? "Configured" : "Not Configured",
                variantIds = $"{configuredVariants.Length} of {PlanNames.Length} configured",
                webhookSecret = webhookConfigured ? "Configured" : "Not Configured",
                status = apiKeyConfigured && storeConfigured && allVariantsConfigured
                    ? "Ready"
                    : "Pending"
            },

            readiness = new[]
            {
                new { item = "Lemon Squeezy API Key", status = apiKeyConfigured ? "Configured" : "Pending" },
                new { item = "Store ID", status = storeConfigured ? "Configured" : "Pending" },
                new { item = "Plan Variant IDs (Starter/Professional/Enterprise/Agency)", status = allVariantsConfigured ? "Configured" : "Pending" },
                new { item = "Webhook Secret", status = webhookConfigured ? "Configured" : "Pending" },
                new { item = "Checkout Endpoint", status = "Configured" }
            },

            recommendations = new[]
            {
                "Create a Lemon Squeezy store.",
                "Create one subscription variant per plan tier (Starter, Professional, Enterprise, Agency).",
                "Add the API key, Store ID, and all four Variant IDs to backend configuration.",
                "Configure the webhook endpoint for subscription events (created, updated, cancelled, payment failed).",
                "Test checkout end-to-end in Lemon Squeezy's test mode before going live."
            }
        });
    }
}
