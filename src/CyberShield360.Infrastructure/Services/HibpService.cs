using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using CyberShield360.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Services;

/// <summary>
/// Checks tenant employee email addresses against Have I Been Pwned's breach database.
/// If no API key is configured, reports that honestly instead of fabricating results.
/// </summary>
public class HibpService : IHibpService
{
    private const int MaxAccountsPerCheck = 10;
    private static readonly TimeSpan RequestSpacing = TimeSpan.FromMilliseconds(1700);

    private readonly HttpClient _http;
    private readonly ILogger<HibpService> _logger;
    private readonly string? _apiKey;

    public HibpService(HttpClient http, IConfiguration config, ILogger<HibpService> logger)
    {
        _http = http;
        _logger = logger;
        _apiKey = config["HaveIBeenPwned:ApiKey"];

        _http.BaseAddress = new Uri("https://haveibeenpwned.com/api/v3/");
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("CyberShield360-DarkWebMonitor/1.0");
    }

    private bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_apiKey) &&
        !_apiKey.Contains("your_", StringComparison.OrdinalIgnoreCase) &&
        !_apiKey.Contains("REPLACE_WITH", StringComparison.OrdinalIgnoreCase);

    public async Task<HibpCheckResultDto> CheckEmailsAsync(IEnumerable<string> emails, CancellationToken ct = default)
    {
        var distinctEmails = emails
            .Where(e => !string.IsNullOrWhiteSpace(e))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxAccountsPerCheck)
            .ToList();

        if (!IsConfigured)
        {
            return new HibpCheckResultDto(
                Configured: false,
                ProviderStatus: "Have I Been Pwned is not configured. Set HaveIBeenPwned:ApiKey to enable verified breach checks.",
                Accounts: Array.Empty<HibpAccountResultDto>());
        }

        if (distinctEmails.Count == 0)
        {
            return new HibpCheckResultDto(true, "Connected", Array.Empty<HibpAccountResultDto>());
        }

        var results = new List<HibpAccountResultDto>();
        var rateLimited = false;

        for (var i = 0; i < distinctEmails.Count; i++)
        {
            if (i > 0)
                await Task.Delay(RequestSpacing, ct);

            var email = distinctEmails[i];

            try
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"breachedaccount/{Uri.EscapeDataString(email)}?truncateResponse=false");
                request.Headers.Add("hibp-api-key", _apiKey);

                using var response = await _http.SendAsync(request, ct);

                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    results.Add(new HibpAccountResultDto(email, Array.Empty<HibpBreachDto>()));
                    continue;
                }

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    _logger.LogWarning("HIBP rate limit hit while checking breach exposure; stopping remaining checks for this request.");
                    rateLimited = true;
                    break;
                }

                if (response.StatusCode == HttpStatusCode.Unauthorized)
                {
                    _logger.LogWarning("HIBP API key was rejected as unauthorized.");
                    return new HibpCheckResultDto(
                        Configured: false,
                        ProviderStatus: "Have I Been Pwned rejected the configured API key. Verify HaveIBeenPwned:ApiKey.",
                        Accounts: Array.Empty<HibpAccountResultDto>());
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("HIBP returned unexpected status {Status} for a breach check.", response.StatusCode);
                    continue;
                }

                var stream = await response.Content.ReadAsStreamAsync(ct);
                var breaches = await JsonSerializer.DeserializeAsync<List<HibpBreachEntry>>(stream, JsonOpts, ct)
                    ?? new();

                var mapped = breaches
                    .Select(b => new HibpBreachDto(
                        b.Name ?? b.Title ?? "Unknown",
                        b.Domain ?? string.Empty,
                        DateOnly.TryParse(b.BreachDate, out var d) ? d : default,
                        (IReadOnlyList<string>?)b.DataClasses ?? Array.Empty<string>(),
                        b.IsSensitive))
                    .ToList();

                results.Add(new HibpAccountResultDto(email, mapped));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "HIBP breach check failed for one account.");
            }
        }

        var status = rateLimited
            ? "Connected (rate limited mid-check — some accounts not yet checked)"
            : "Connected";

        return new HibpCheckResultDto(true, status, results);
    }

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    private class HibpBreachEntry
    {
        public string? Name { get; set; }
        public string? Title { get; set; }
        public string? Domain { get; set; }
        public string? BreachDate { get; set; }

        [JsonPropertyName("DataClasses")]
        public List<string>? DataClasses { get; set; }
        public bool IsSensitive { get; set; }
    }
}
