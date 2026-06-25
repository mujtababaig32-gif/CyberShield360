using CyberShield360.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

[Authorize]
public class BillingController : ApiControllerBase
{
    private readonly ICurrentUser _user;
    private readonly IConfiguration _config;

    public BillingController(ICurrentUser user, IConfiguration config)
    {
        _user = user;
        _config = config;
    }

    [HttpGet("summary")]
    public IActionResult Summary()
    {
        if (_user.TenantId is not Guid)
            return Unauthorized();

        var apiKeyConfigured = !string.IsNullOrWhiteSpace(_config["LemonSqueezy:ApiKey"]);
        var storeConfigured = !string.IsNullOrWhiteSpace(_config["LemonSqueezy:StoreId"]);
        var variantConfigured = !string.IsNullOrWhiteSpace(_config["LemonSqueezy:VariantId"]);
        var webhookConfigured = !string.IsNullOrWhiteSpace(_config["LemonSqueezy:WebhookSecret"]);

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,

            provider = "Lemon Squeezy",

            currentPlan = new
            {
                name = "Free Trial",
                status = "Trialing",
                trialEndsUtc = DateTime.UtcNow.AddDays(14),
                billingProvider = "Lemon Squeezy"
            },

            configuration = new
            {
                apiKey = apiKeyConfigured ? "Configured" : "Not Configured",
                storeId = storeConfigured ? "Configured" : "Not Configured",
                variantId = variantConfigured ? "Configured" : "Not Configured",
                webhookSecret = webhookConfigured ? "Configured" : "Not Configured",
                status = apiKeyConfigured && storeConfigured && variantConfigured
                    ? "Ready"
                    : "Pending"
            },

            readiness = new[]
            {
                new { item = "Lemon Squeezy API Key", status = apiKeyConfigured ? "Configured" : "Pending" },
                new { item = "Store ID", status = storeConfigured ? "Configured" : "Pending" },
                new { item = "Variant ID", status = variantConfigured ? "Configured" : "Pending" },
                new { item = "Webhook Secret", status = webhookConfigured ? "Configured" : "Pending" },
                new { item = "Checkout Endpoint", status = "Configured" }
            },

            recommendations = new[]
            {
                "Create a Lemon Squeezy store.",
                "Create a subscription product and variant.",
                "Add API key, Store ID, and Variant ID to backend configuration.",
                "Configure webhook endpoint for subscription events.",
                "Test checkout in development mode first."
            }
        });
    }
}