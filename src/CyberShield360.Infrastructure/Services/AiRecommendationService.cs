using CyberShield360.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Services;

/// <summary>
/// Generates prioritized, plain-language remediation guidance.
/// This deterministic rules engine keeps the product useful even when a paid LLM provider
/// is not configured or API quota is unavailable. A real LLM can be connected later.
/// </summary>
public class AiRecommendationService : IAiRecommendationService
{
    private readonly ILogger<AiRecommendationService> _logger;
    private readonly string? _apiKey;

    public AiRecommendationService(IConfiguration config, ILogger<AiRecommendationService> logger)
    {
        _logger = logger;
        _apiKey = config["OpenAI:ApiKey"];
    }

    public Task<IReadOnlyList<string>> GetRecommendationsAsync(
        string context,
        CancellationToken ct = default)
    {
        var recommendations = new List<string>();
        var c = (context ?? string.Empty).ToLowerInvariant();

        AddIf(c.Contains("strict-transport-security") || c.Contains("hsts"),
            "Enable Strict-Transport-Security with max-age >= 31536000 and includeSubDomains after confirming all subdomains support HTTPS.");

        AddIf(c.Contains("content-security-policy") || c.Contains("csp"),
            "Deploy a Content-Security-Policy. Start in report-only mode, review violations, then enforce a restrictive policy to reduce XSS exposure.");

        AddIf(c.Contains("x-content-type-options"),
            "Add X-Content-Type-Options: nosniff to reduce MIME-sniffing risk.");

        AddIf(c.Contains("x-frame-options") || c.Contains("frame-ancestors"),
            "Add X-Frame-Options or CSP frame-ancestors to reduce clickjacking exposure.");

        AddIf(c.Contains("referrer-policy"),
            "Set a privacy-conscious Referrer-Policy such as strict-origin-when-cross-origin or no-referrer.");

        AddIf(c.Contains("permissions-policy"),
            "Add a Permissions-Policy header to restrict browser features that are not required by the application.");

        AddIf(c.Contains("server header") || c.Contains("x-powered-by") || c.Contains("fingerprinting"),
            "Minimize Server and X-Powered-By headers to reduce technology fingerprinting.");

        AddIf(c.Contains("http redirects to https") || c.Contains("redirect all http"),
            "Force HTTP to HTTPS redirects at the load balancer, CDN, or web server layer.");

        AddIf(c.Contains("tls") || c.Contains("ssl") || c.Contains("certificate"),
            "Verify TLS certificate chain, renewal automation, and TLS 1.2+ support. Remove legacy TLS protocols if present.");

        AddIf(c.Contains("spf"),
            "Publish or tighten SPF so it includes all legitimate sending sources and ends with a hard fail when ready.");

        AddIf(c.Contains("dmarc"),
            "Move DMARC toward quarantine or reject after monitoring reports and confirming legitimate senders pass authentication.");

        AddIf(c.Contains("dkim"),
            "Verify DKIM using known production selectors and ensure outbound mail is signed for all approved sending platforms.");

        AddIf(c.Contains("caa"),
            "Add CAA records to restrict which certificate authorities can issue certificates for the domain.");

        AddIf(c.Contains("port exposure") || c.Contains("publicly reachable"),
            "Review public port exposure and restrict administrative or database ports with firewall rules, VPN, or private networking.");

        AddIf(c.Contains("a record") || c.Contains("dns") || c.Contains("name servers"),
            "Review DNS resolution, authoritative name servers, and records for stale or misconfigured entries.");

        if (recommendations.Count == 0)
        {
            recommendations.Add("No urgent remediation action was detected from the current context. Continue recurring full posture scans and review new findings as they appear.");
        }

        _logger.LogDebug("Generated {Count} deterministic remediation recommendations. OpenAI configured: {Configured}",
            recommendations.Count,
            !string.IsNullOrWhiteSpace(_apiKey));

        return Task.FromResult<IReadOnlyList<string>>(recommendations.Distinct().Take(10).ToList());

        void AddIf(bool condition, string recommendation)
        {
            if (condition)
                recommendations.Add(recommendation);
        }
    }
}
