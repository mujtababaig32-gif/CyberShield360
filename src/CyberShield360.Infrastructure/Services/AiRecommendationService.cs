using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using CyberShield360.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Services;

/// <summary>
/// Generates prioritized remediation guidance from real scan findings.
/// If OpenAI is configured, it uses the Responses API. If not, or if the model call fails,
/// it falls back to a deterministic rules engine so the product remains usable.
/// </summary>
public class AiRecommendationService : IAiRecommendationService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false
    };

    private readonly ILogger<AiRecommendationService> _logger;
    private readonly string? _apiKey;
    private readonly string _model;

    public AiRecommendationService(IConfiguration config, ILogger<AiRecommendationService> logger)
    {
        _logger = logger;
        _apiKey = config["OpenAI:ApiKey"];
        _model = string.IsNullOrWhiteSpace(config["OpenAI:Model"])
            ? "gpt-4.1-mini"
            : config["OpenAI:Model"]!;
    }

    public Task<IReadOnlyList<string>> GetRecommendationsAsync(
        string context,
        CancellationToken ct = default)
    {
        var recommendations = BuildRuleBasedRecommendations(context ?? string.Empty);

        _logger.LogDebug(
            "Generated {Count} deterministic remediation recommendations. OpenAI configured: {Configured}",
            recommendations.Count,
            !string.IsNullOrWhiteSpace(_apiKey));

        return Task.FromResult<IReadOnlyList<string>>(recommendations.Distinct().Take(10).ToList());
    }

    public async Task<AiRemediationPlanDto> GenerateRemediationPlanAsync(
        AiRemediationContextDto context,
        CancellationToken ct = default)
    {
        var fallback = BuildRuleBasedPlan(context, "Rules Engine");

        if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey.Contains("your_", StringComparison.OrdinalIgnoreCase))
        {
            return fallback;
        }

        try
        {
            var prompt = BuildPrompt(context);
            using var http = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(45)
            };

            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            var request = new
            {
                model = _model,
                input = prompt,
                max_output_tokens = 1800
            };

            using var content = new StringContent(
                JsonSerializer.Serialize(request, JsonOptions),
                Encoding.UTF8,
                "application/json");

            using var response = await http.PostAsync("https://api.openai.com/v1/responses", content, ct);
            var responseText = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenAI remediation request failed with status {Status}: {Body}",
                    (int)response.StatusCode,
                    Truncate(responseText, 600));
                return fallback;
            }

            var outputText = ExtractOutputText(responseText);
            var plan = TryParseModelPlan(context, outputText, responseText);
            return plan ?? fallback;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenAI remediation generation failed. Falling back to deterministic plan.");
            return fallback;
        }
    }

    private static string BuildPrompt(AiRemediationContextDto context)
    {
        var findingsJson = JsonSerializer.Serialize(context.FailedFindings, JsonOptions);

        return $$"""
You are CyberShield360's defensive remediation advisor.
Use only the scan findings provided. Do not invent vulnerabilities, do not recommend offensive exploitation, and do not provide attack instructions.
Return JSON only. No markdown. No surrounding explanation.

Asset context:
Domain: {{context.Domain}}
Score: {{context.Score}}
Grade: {{context.Grade}}
Failed findings JSON:
{{findingsJson}}

Return this exact JSON shape:
{
  "executiveSummary": "1-2 sentence plain-English summary for a business owner.",
  "businessImpact": "Business impact in simple terms.",
  "actions": [
    {
      "findingTitle": "Finding title",
      "severity": "Critical|High|Medium|Low",
      "priority": "Immediate|High|Medium|Planned",
      "plainEnglishIssue": "What this means without jargon.",
      "businessImpact": "Why the client should care.",
      "recommendedFix": "Clear defensive fix steps.",
      "owner": "Web Developer|Domain / DNS Admin|IT Admin|Security Owner|Hosting Provider",
      "difficulty": "Low|Medium|High",
      "verificationStep": "How to verify after fixing, usually rescan or specific check.",
      "estimatedEffortHours": 1
    }
  ],
  "verificationSteps": ["Overall verification step 1", "Overall verification step 2"]
}
""";
    }

    private static AiRemediationPlanDto? TryParseModelPlan(
        AiRemediationContextDto context,
        string outputText,
        string rawResponse)
    {
        if (string.IsNullOrWhiteSpace(outputText))
            return null;

        var json = ExtractJsonObject(outputText);
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            var root = JsonNode.Parse(json)?.AsObject();
            if (root is null)
                return null;

            var actions = root["actions"]?.AsArray()
                .Select(x => x?.AsObject())
                .Where(x => x is not null)
                .Select(x => new AiRemediationActionDto(
                    ReadString(x!, "findingTitle", "Review finding"),
                    ReadString(x!, "severity", "Medium"),
                    ReadString(x!, "priority", "Planned"),
                    ReadString(x!, "plainEnglishIssue", "Review the failed finding and confirm the affected control."),
                    ReadString(x!, "businessImpact", "This may increase exposure or reduce trust if left unresolved."),
                    ReadString(x!, "recommendedFix", "Review and remediate the failed control, then rescan."),
                    ReadString(x!, "owner", "Security / IT Owner"),
                    ReadString(x!, "difficulty", "Medium"),
                    ReadString(x!, "verificationStep", "Run a new Full Posture scan after remediation."),
                    ReadInt(x!, "estimatedEffortHours", 2)))
                .Take(12)
                .ToList() ?? new List<AiRemediationActionDto>();

            if (actions.Count == 0)
                return null;

            var verificationSteps = root["verificationSteps"]?.AsArray()
                .Select(x => x?.GetValue<string>() ?? string.Empty)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Take(8)
                .ToList() ?? new List<string> { "Run a new Full Posture scan after remediation." };

            return new AiRemediationPlanDto(
                context.ScanId,
                context.Domain,
                context.Score,
                context.Grade,
                context.FailedFindings.Count,
                context.FailedFindings.Count(f => f.Severity is "High" or "Critical"),
                "OpenAI",
                ReadString(root, "executiveSummary", "CyberShield360 generated remediation guidance from the latest failed scan findings."),
                ReadString(root, "businessImpact", "Unresolved findings may increase exposure, reduce customer trust, or create compliance readiness gaps."),
                actions,
                verificationSteps,
                DateTime.UtcNow);
        }
        catch
        {
            return null;
        }

        static string ReadString(JsonObject obj, string key, string fallback)
            => obj[key]?.GetValue<string>() is { Length: > 0 } value ? value : fallback;

        static int ReadInt(JsonObject obj, string key, int fallback)
        {
            try { return obj[key]?.GetValue<int>() ?? fallback; }
            catch { return fallback; }
        }
    }

    private static AiRemediationPlanDto BuildRuleBasedPlan(AiRemediationContextDto context, string provider)
    {
        var actions = context.FailedFindings
            .OrderByDescending(f => SeverityRank(f.Severity))
            .Take(12)
            .Select(f => BuildAction(f))
            .ToList();

        if (actions.Count == 0)
        {
            actions.Add(new AiRemediationActionDto(
                "No failed findings",
                "Info",
                "Monitor",
                "No failed findings were available for this scan.",
                "The current posture does not show urgent remediation items from this scan.",
                "Keep recurring scans enabled and review posture drift weekly.",
                "Security / IT Owner",
                "Low",
                "Run the next scheduled Full Posture scan.",
                1));
        }

        var highCritical = context.FailedFindings.Count(f => f.Severity is "High" or "Critical");
        var executiveSummary = highCritical > 0
            ? $"CyberShield360 found {context.FailedFindings.Count} failed control(s), including {highCritical} high-priority issue(s), on {context.Domain}. Prioritize the high-impact fixes first and rescan after remediation."
            : $"CyberShield360 found {context.FailedFindings.Count} failed control(s) on {context.Domain}. The issues should be addressed through a planned remediation cycle and verified with a rescan.";

        var businessImpact = highCritical > 0
            ? "High-priority findings may increase exposure, weaken customer trust, affect email/domain integrity, or create audit-readiness gaps."
            : "Open findings can still reduce security posture over time and should be tracked until verified as resolved.";

        return new AiRemediationPlanDto(
            context.ScanId,
            context.Domain,
            context.Score,
            context.Grade,
            context.FailedFindings.Count,
            highCritical,
            provider,
            executiveSummary,
            businessImpact,
            actions,
            new[]
            {
                "Apply the recommended fixes through the responsible owner.",
                "Run a new CyberShield360 Full Posture scan after remediation.",
                "Confirm the score, grade, and failed finding count improved.",
                "Attach the updated PDF/Excel report to the client remediation record."
            },
            DateTime.UtcNow);
    }

    private static AiRemediationActionDto BuildAction(AiRemediationFindingContextDto finding)
    {
        var text = $"{finding.CheckKey} {finding.Title} {finding.Detail} {finding.Recommendation}".ToLowerInvariant();
        var owner = "Security / IT Owner";
        var difficulty = "Medium";
        var hours = 2;
        var issue = string.IsNullOrWhiteSpace(finding.Detail)
            ? $"{finding.Title} failed during the latest security assessment."
            : finding.Detail;
        var fix = string.IsNullOrWhiteSpace(finding.Recommendation)
            ? "Review the failed control, apply the recommended security configuration, then rescan."
            : finding.Recommendation;

        if (text.Contains("dmarc") || text.Contains("spf") || text.Contains("dkim") || text.Contains("dns") || text.Contains("caa"))
        {
            owner = "Domain / DNS Admin";
            difficulty = text.Contains("dmarc") ? "Medium" : "Low";
            hours = text.Contains("dmarc") ? 3 : 1;
        }
        else if (text.Contains("header") || text.Contains("hsts") || text.Contains("csp") || text.Contains("frame") || text.Contains("x-content") || text.Contains("permissions-policy"))
        {
            owner = "Web Developer";
            difficulty = text.Contains("content-security-policy") || text.Contains("csp") ? "Medium" : "Low";
            hours = text.Contains("content-security-policy") || text.Contains("csp") ? 4 : 1;
        }
        else if (text.Contains("port") || text.Contains("publicly reachable") || text.Contains("admin"))
        {
            owner = "IT Admin";
            difficulty = "High";
            hours = 6;
        }
        else if (text.Contains("tls") || text.Contains("ssl") || text.Contains("certificate") || text.Contains("https"))
        {
            owner = "Hosting Provider / Web Developer";
            difficulty = "Medium";
            hours = 3;
        }

        return new AiRemediationActionDto(
            finding.Title,
            finding.Severity,
            PriorityFromSeverity(finding.Severity),
            issue,
            BusinessImpactFor(finding, text),
            fix,
            owner,
            difficulty,
            VerificationFor(finding, text),
            hours);
    }

    private static string BusinessImpactFor(AiRemediationFindingContextDto finding, string text)
    {
        if (text.Contains("dmarc") || text.Contains("spf") || text.Contains("dkim"))
            return "Email authentication gaps can increase spoofing, impersonation, and customer-trust risk.";
        if (text.Contains("header") || text.Contains("hsts") || text.Contains("csp") || text.Contains("frame"))
            return "Missing browser protections can leave users exposed to common web attack patterns and weaken security posture.";
        if (text.Contains("port") || text.Contains("publicly reachable"))
            return "Unnecessary public exposure can increase attack surface and operational risk.";
        if (text.Contains("tls") || text.Contains("ssl") || text.Contains("certificate") || text.Contains("https"))
            return "Transport security issues can reduce trust, create browser warnings, or weaken secure communication.";

        return finding.Severity is "Critical" or "High"
            ? "This high-priority finding can increase exposure and should be handled before client or audit reporting."
            : "This finding should be tracked and remediated to improve overall posture.";
    }

    private static string VerificationFor(AiRemediationFindingContextDto finding, string text)
    {
        if (text.Contains("dns") || text.Contains("dmarc") || text.Contains("spf") || text.Contains("dkim") || text.Contains("caa"))
            return "Verify DNS propagation, then run a new Full Posture scan to confirm the finding is resolved.";
        if (text.Contains("header") || text.Contains("hsts") || text.Contains("csp") || text.Contains("frame"))
            return "Confirm the HTTP response header is present, then run a new Full Posture scan.";
        if (text.Contains("port") || text.Contains("publicly reachable"))
            return "Confirm the exposed service is restricted or intentionally approved, then rescan.";
        return "Run a new CyberShield360 Full Posture scan and confirm the finding no longer fails.";
    }

    private static List<string> BuildRuleBasedRecommendations(string context)
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

        return recommendations;

        void AddIf(bool condition, string recommendation)
        {
            if (condition)
                recommendations.Add(recommendation);
        }
    }

    private static string ExtractOutputText(string responseText)
    {
        try
        {
            var root = JsonNode.Parse(responseText)?.AsObject();
            var outputText = root?["output_text"]?.GetValue<string>();
            if (!string.IsNullOrWhiteSpace(outputText))
                return outputText;

            var output = root?["output"]?.AsArray();
            if (output is null)
                return string.Empty;

            var parts = new List<string>();
            foreach (var item in output)
            {
                var content = item?["content"]?.AsArray();
                if (content is null) continue;

                foreach (var contentItem in content)
                {
                    var text = contentItem?["text"]?.GetValue<string>();
                    if (!string.IsNullOrWhiteSpace(text))
                        parts.Add(text);
                }
            }

            return string.Join("\n", parts);
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string ExtractJsonObject(string text)
    {
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        return start >= 0 && end > start ? text[start..(end + 1)] : string.Empty;
    }

    private static int SeverityRank(string severity) => severity switch
    {
        "Critical" => 4,
        "High" => 3,
        "Medium" => 2,
        "Low" => 1,
        _ => 0
    };

    private static string PriorityFromSeverity(string severity) => severity switch
    {
        "Critical" => "Immediate",
        "High" => "High",
        "Medium" => "Medium",
        _ => "Planned"
    };

    private static string Truncate(string value, int length)
        => string.IsNullOrEmpty(value) || value.Length <= length ? value : value[..length];
}
