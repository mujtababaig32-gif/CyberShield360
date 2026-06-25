using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class AiCopilotController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    public AiCopilotController(
        ApplicationDbContext db,
        ICurrentUser user,
        IConfiguration config,
        IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _user = user;
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    public record AskCopilotRequest(string Question);

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var assets = await _db.Assets.AsNoTracking().Where(a => a.TenantId == tid).CountAsync(ct);
        var risks = await _db.Risks.AsNoTracking().Where(r => r.TenantId == tid).CountAsync(ct);
        var scans = await _db.Scans.AsNoTracking().Where(s => s.TenantId == tid).CountAsync(ct);

        var openAiConfigured = !string.IsNullOrWhiteSpace(_config["OpenAI:ApiKey"]);

        return Ok(new
{
    generatedUtc = DateTime.UtcNow,
    status = openAiConfigured ? "AI Copilot Active" : "Rule-Based Copilot Active",
    aiProvider = openAiConfigured ? "OpenAI" : "Not Connected",
    mode = openAiConfigured ? "LLM-Powered" : "Rule-Based Fallback",

    contextSources = new[]
    {
        "Assets",
        "Scans",
        "Vulnerabilities",
        "Risks",
        "Compliance",
        "Threat Intelligence",
        "SOC Alerts",
        "Vendor Risk",
        "Cloud Posture",
        "Audit Logs"
    },

    tenantContext = new
    {
        assets,
        risks,
        scans
    },

    suggestedQuestions = new[]
    {
        "What should I fix first?",
        "Why is my risk score high?",
        "Summarize my security posture.",
        "Show my highest risk assets.",
        "Create an executive summary.",
        "Explain my compliance gaps.",
        "Which modules need attention?"
    },

    recommendations = openAiConfigured
        ? new[]
        {
            "AI Copilot is connected to OpenAI.",
            "Use Copilot to prioritize remediation.",
            "Ask for executive summaries.",
            "Ask for compliance gap explanations."
        }
        : new[]
        {
            "Add OpenAI API key to enable real AI responses.",
            "Keep API key only in backend configuration.",
            "Use rule-based fallback until OpenAI is configured.",
            "Add tenant-aware context retrieval next."
        }
});
    }

    [HttpPost("ask")]
    public async Task<IActionResult> Ask([FromBody] AskCopilotRequest request, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Question))
            return BadRequest(new { message = "Question is required." });

        var assets = await _db.Assets.AsNoTracking().Where(a => a.TenantId == tid).CountAsync(ct);
        var risks = await _db.Risks.AsNoTracking().Where(r => r.TenantId == tid).CountAsync(ct);
        var scans = await _db.Scans.AsNoTracking().Where(s => s.TenantId == tid).CountAsync(ct);

        var openAiConfigured = !string.IsNullOrWhiteSpace(_config["OpenAI:ApiKey"]);

        string answer;
        string mode;
        string provider;

        if (openAiConfigured)
        {
            answer = await AskOpenAiAsync(request.Question, assets, risks, scans, tid, ct) ?? "";

            if (string.IsNullOrWhiteSpace(answer))
            {
                answer = "OpenAI returned an empty response.";
                mode = "OpenAI Error";
                provider = "OpenAI";
            }
            else if (answer.StartsWith("OpenAI API error:"))
            {
                mode = "OpenAI Error";
                provider = "OpenAI";
            }
            else
            {
                mode = "LLM-Powered Copilot";
                provider = "OpenAI";
            }
        }
        else
        {
            answer = BuildRuleBasedAnswer(request.Question, assets, risks, scans);
            mode = "Rule-Based Copilot";
            provider = "Not Connected";
        }

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            question = request.Question,
            answer,
            mode,
            aiProvider = provider,
            tenantContext = new { assets, risks, scans }
        });
    }

    private async Task<string?> AskOpenAiAsync(
        string question,
        int assets,
        int risks,
        int scans,
        Guid tenantId,
        CancellationToken ct)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        var model = _config["OpenAI:Model"];

        if (string.IsNullOrWhiteSpace(apiKey))
            return null;

        if (string.IsNullOrWhiteSpace(model))
            model = "gpt-4.1-mini";

        var systemPrompt = """
        You are CyberShield360 AI Copilot.

        You help security teams understand cyber risk, exposure management, vulnerabilities,
        compliance posture, audit logs, notifications, cloud posture, attack paths, and executive reporting.

        Rules:
        - Reply naturally to greetings.
        - Give practical, professional cybersecurity guidance.
        - Be concise but useful.
        - Use the tenant context provided.
        - Do not invent exact findings that are not in the context.
        - If data is missing, say what data is needed.
        - Prioritize remediation by risk, exposure, exploitability, and business impact.
        """;

        var input = $"""
        Tenant context:
        - Assets in scope: {assets}
        - Risks recorded: {risks}
        - Scans performed: {scans}
        - Tenant ID: {tenantId}

        User question:
        {question}
        """;

        var payload = new
        {
            model,
            instructions = systemPrompt,
            input,
            max_output_tokens = 700
        };

        var json = JsonSerializer.Serialize(payload);

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/responses");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        using var client = _httpClientFactory.CreateClient();
        using var response = await client.SendAsync(request, ct);

        var responseText = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            return $"OpenAI API error: {(int)response.StatusCode} {response.ReasonPhrase}. Details: {responseText}";

        using var doc = JsonDocument.Parse(responseText);

        if (doc.RootElement.TryGetProperty("output_text", out var outputText))
            return outputText.GetString();

        return null;
    }

    private static string BuildRuleBasedAnswer(string question, int assets, int risks, int scans)
    {
        var q = question.ToLowerInvariant().Trim();

        if (q is "hi" or "hello" or "hey" or "salam" or "assalamualaikum")
            return "Hello! I m CyberShield Copilot. I can help you understand risks, vulnerabilities, compliance gaps, audit logs, assets, scans, and executive security summaries.";

        if (q.Contains("fix first") || q.Contains("priority"))
            return $"Start with critical risks and internet-facing assets. Your workspace currently has {assets} assets, {risks} risks, and {scans} scans.";

        if (q.Contains("executive"))
            return "Executive summary: CyberShield360 has visibility across assets, vulnerabilities, risks, compliance, threat intelligence, cloud posture, and SaaS controls.";

        if (q.Contains("assets"))
            return $"There are currently {assets} assets in scope. Review Asset Inventory, Assets & Scans, Cloud Posture, and Attack Path Analysis.";

        return "I can help summarize risks, prioritize remediation, explain findings, generate executive summaries, and guide module-level security decisions.";
    }
}
