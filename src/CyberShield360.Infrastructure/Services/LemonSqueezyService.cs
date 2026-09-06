using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CyberShield360.Application.Common;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Services;

public class LemonSqueezyService : ILemonSqueezyService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly IApplicationDbContext _db;
    private readonly ILogger<LemonSqueezyService> _logger;

    public LemonSqueezyService(
        HttpClient http,
        IConfiguration config,
        IApplicationDbContext db,
        ILogger<LemonSqueezyService> logger)
    {
        _http = http;
        _config = config;
        _db = db;
        _logger = logger;
    }

    public async Task<string> CreateCheckoutSessionAsync(
        Guid tenantId,
        string plan,
        string successUrl,
        string cancelUrl,
        string? customerEmail = null,
        CancellationToken ct = default)
    {
        var apiKey = _config["LemonSqueezy:ApiKey"];
        var storeId = _config["LemonSqueezy:StoreId"];
        var variantId = _config[$"LemonSqueezy:VariantIds:{plan}"];

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Lemon Squeezy API key is not configured.");

        if (string.IsNullOrWhiteSpace(storeId))
            throw new InvalidOperationException("Lemon Squeezy Store ID is not configured.");

        if (string.IsNullOrWhiteSpace(variantId))
            throw new InvalidOperationException($"No Lemon Squeezy variant is configured for plan '{plan}'.");

        var payload = new
        {
            data = new
            {
                type = "checkouts",
                attributes = new
                {
                    product_options = new
                    {
                        redirect_url = successUrl,
                        enabled_variants = new[] { int.Parse(variantId) }
                    },
                    checkout_options = new
                    {
                        embed = false,
                        media = true,
                        logo = true,
                        desc = true,
                        discount = true,
                        subscription_preview = true
                    },
                    checkout_data = new
                    {
                        email = customerEmail,
                        custom = new
                        {
                            tenant_id = tenantId.ToString(),
                            plan,
                            cancel_url = cancelUrl
                        }
                    }
                },
                relationships = new
                {
                    store = new
                    {
                        data = new
                        {
                            type = "stores",
                            id = storeId
                        }
                    },
                    variant = new
                    {
                        data = new
                        {
                            type = "variants",
                            id = variantId
                        }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(payload);

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "https://api.lemonsqueezy.com/v1/checkouts");

        request.Headers.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/vnd.api+json"));

        request.Headers.Authorization =
            new AuthenticationHeaderValue("Bearer", apiKey);

        request.Content = new StringContent(
            json,
            Encoding.UTF8,
            "application/vnd.api+json");

        using var response = await _http.SendAsync(request, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError(
                "Lemon Squeezy checkout failed: {Status} {Body}",
                response.StatusCode,
                responseBody);

            throw new InvalidOperationException("Could not create Lemon Squeezy checkout session.");
        }

        using var doc = JsonDocument.Parse(responseBody);

        var url = doc.RootElement
            .GetProperty("data")
            .GetProperty("attributes")
            .GetProperty("url")
            .GetString();

        if (string.IsNullOrWhiteSpace(url))
            throw new InvalidOperationException("Lemon Squeezy did not return a checkout URL.");

        return url;
    }

    public async Task<bool> HandleWebhookAsync(string payload, string signature, CancellationToken ct = default)
    {
        var webhookSecret = _config["LemonSqueezy:WebhookSecret"];

        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            _logger.LogWarning("Lemon Squeezy webhook rejected: no webhook secret configured.");
            return false;
        }

        if (string.IsNullOrWhiteSpace(signature) || !IsSignatureValid(payload, signature, webhookSecret))
        {
            _logger.LogWarning("Lemon Squeezy webhook rejected: signature missing or invalid.");
            return false;
        }

        try
        {
            await ApplyEventAsync(payload, ct);
        }
        catch (Exception ex)
        {
            // The signature is already trusted at this point — a malformed or
            // unexpected event shape shouldn't make us tell Lemon Squeezy to
            // keep retrying forever, just log it for manual follow-up.
            _logger.LogError(ex, "Lemon Squeezy webhook signature verified but event processing failed.");
        }

        return true;
    }

    private async Task ApplyEventAsync(string payload, CancellationToken ct)
    {
        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;

        var eventName = root.GetProperty("meta").GetProperty("event_name").GetString();
        if (!root.GetProperty("meta").TryGetProperty("custom_data", out var customData) ||
            !customData.TryGetProperty("tenant_id", out var tenantIdProp) ||
            !Guid.TryParse(tenantIdProp.GetString(), out var tenantId))
        {
            _logger.LogWarning("Lemon Squeezy webhook {Event}: no tenant_id in custom_data, ignoring.", eventName);
            return;
        }

        var subscription = await _db.Subscriptions.FirstOrDefaultAsync(s => s.TenantId == tenantId, ct);
        if (subscription is null)
        {
            _logger.LogWarning("Lemon Squeezy webhook {Event}: no subscription found for tenant {TenantId}.", eventName, tenantId);
            return;
        }

        var attributes = root.GetProperty("data").GetProperty("attributes");
        var lemonSqueezySubscriptionId = root.GetProperty("data").GetProperty("id").GetString();
        var customerId = attributes.TryGetProperty("customer_id", out var c) ? c.ToString() : null;
        var status = attributes.TryGetProperty("status", out var s) ? s.GetString() : null;
        var renewsAt = attributes.TryGetProperty("renews_at", out var r) && r.ValueKind == JsonValueKind.String
            ? DateTime.Parse(r.GetString()!).ToUniversalTime()
            : (DateTime?)null;
        var endsAt = attributes.TryGetProperty("ends_at", out var e) && e.ValueKind == JsonValueKind.String
            ? DateTime.Parse(e.GetString()!).ToUniversalTime()
            : (DateTime?)null;

        subscription.StripeSubscriptionId = lemonSqueezySubscriptionId;
        if (!string.IsNullOrWhiteSpace(customerId))
            subscription.StripeCustomerId = customerId;

        switch (eventName)
        {
            case "subscription_created":
            case "subscription_updated":
            case "subscription_resumed":
            case "subscription_unpaused":
                var planName = customData.TryGetProperty("plan", out var p) ? p.GetString() : null;
                var tier = PlanCatalog.Resolve(planName);

                subscription.Plan = tier.Plan;
                subscription.MaxAssets = tier.MaxAssets;
                subscription.MaxUsers = tier.MaxUsers;
                subscription.MaxScansPerMonth = tier.MaxScansPerMonth;
                subscription.Status = MapStatus(status);
                subscription.CurrentPeriodEndUtc = renewsAt ?? endsAt;
                break;

            case "subscription_cancelled":
            case "subscription_expired":
                subscription.Status = SubscriptionStatus.Canceled;
                subscription.CurrentPeriodEndUtc = endsAt ?? subscription.CurrentPeriodEndUtc;
                break;

            case "subscription_payment_failed":
                subscription.Status = SubscriptionStatus.PastDue;
                break;

            case "subscription_payment_success":
                // Confirms an already-active subscription's renewal charge went through —
                // status/plan are kept in sync by subscription_updated, nothing else to do.
                break;

            default:
                _logger.LogInformation("Lemon Squeezy webhook {Event}: no handling needed for this event type.", eventName);
                break;
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Lemon Squeezy webhook {Event} applied to tenant {TenantId}.", eventName, tenantId);
    }

    private static SubscriptionStatus MapStatus(string? lemonSqueezyStatus) => lemonSqueezyStatus switch
    {
        "on_trial" => SubscriptionStatus.Trialing,
        "active" => SubscriptionStatus.Active,
        "past_due" or "unpaid" => SubscriptionStatus.PastDue,
        "paused" => SubscriptionStatus.PastDue,
        "cancelled" or "expired" => SubscriptionStatus.Canceled,
        _ => SubscriptionStatus.Incomplete,
    };

    private static bool IsSignatureValid(string payload, string signature, string webhookSecret)
    {
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(webhookSecret), Encoding.UTF8.GetBytes(payload));

        return TryParseHex(signature, out var provided) &&
            CryptographicOperations.FixedTimeEquals(provided, expected);
    }

    private static bool TryParseHex(string value, out byte[] bytes)
    {
        try
        {
            bytes = Convert.FromHexString(PadEvenHex(value));
            return true;
        }
        catch (FormatException)
        {
            bytes = [];
            return false;
        }
    }

    private static string PadEvenHex(string value) => value.Length % 2 == 0 ? value : "0" + value;
}
