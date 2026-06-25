using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CyberShield360.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Services;

public class LemonSqueezyService : ILemonSqueezyService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<LemonSqueezyService> _logger;

    public LemonSqueezyService(
        HttpClient http,
        IConfiguration config,
        ILogger<LemonSqueezyService> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<string> CreateCheckoutSessionAsync(
        Guid tenantId,
        string successUrl,
        string cancelUrl,
        string? customerEmail = null,
        CancellationToken ct = default)
    {
        var apiKey = _config["LemonSqueezy:ApiKey"];
        var storeId = _config["LemonSqueezy:StoreId"];
        var variantId = _config["LemonSqueezy:VariantId"];

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Lemon Squeezy API key is not configured.");

        if (string.IsNullOrWhiteSpace(storeId))
            throw new InvalidOperationException("Lemon Squeezy Store ID is not configured.");

        if (string.IsNullOrWhiteSpace(variantId))
            throw new InvalidOperationException("Lemon Squeezy Variant ID is not configured.");

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

    public Task HandleWebhookAsync(string payload, string signature, CancellationToken ct = default)
    {
        _logger.LogInformation("Lemon Squeezy webhook received.");
        return Task.CompletedTask;
    }
}