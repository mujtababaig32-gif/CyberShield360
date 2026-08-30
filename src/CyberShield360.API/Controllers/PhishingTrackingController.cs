using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

/// <summary>
/// Public, unauthenticated endpoints embedded in simulated phishing emails. A real
/// employee clicking a link in their inbox has no CyberShield360 session, so these
/// cannot require [Authorize] — they identify the event purely by the opaque
/// per-recipient target id already baked into the link at send time.
/// </summary>
[AllowAnonymous]
public class PhishingTrackingController : ApiControllerBase
{
    // A minimal, valid 1x1 transparent PNG, served for every open-tracking request.
    private static readonly byte[] TransparentPixel = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");

    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public PhishingTrackingController(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet("open/{targetId:guid}")]
    public async Task<IActionResult> Open(Guid targetId, CancellationToken ct)
    {
        var target = await _db.PhishingTargets.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == targetId, ct);

        if (target is not null && target.Result < PhishingResult.Opened)
        {
            target.Result = PhishingResult.Opened;
            target.OpenedUtc ??= DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return File(TransparentPixel, "image/png");
    }

    [HttpGet("click/{targetId:guid}")]
    public async Task<IActionResult> Click(Guid targetId, CancellationToken ct)
    {
        var target = await _db.PhishingTargets.IgnoreQueryFilters()
            .Include(t => t.Campaign)
            .FirstOrDefaultAsync(t => t.Id == targetId, ct);

        if (target is not null && target.Result < PhishingResult.Clicked)
        {
            target.Result = PhishingResult.Clicked;
            target.ClickedUtc ??= DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        var message = target?.Campaign?.LandingPageMessage
            ?? "This was a simulated phishing test. Please review your security training.";

        return Redirect(BuildLandingUrl(targetId, message, reported: false));
    }

    [HttpGet("report/{targetId:guid}")]
    public async Task<IActionResult> Report(Guid targetId, CancellationToken ct)
    {
        var target = await _db.PhishingTargets.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == targetId, ct);

        if (target is not null)
        {
            target.Result = PhishingResult.Reported;
            target.ReportedUtc ??= DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return Redirect(BuildLandingUrl(
            targetId, "Thanks for reporting this email — that's exactly the right move.", reported: true));
    }

    private string BuildLandingUrl(Guid targetId, string message, bool reported)
    {
        var frontendBaseUrl = ResolveFrontendBaseUrl().TrimEnd('/');
        var query = $"target={targetId}&message={Uri.EscapeDataString(message)}&reported={(reported ? "true" : "false")}";
        return $"{frontendBaseUrl}/phishing-awareness?{query}";
    }

    private string ResolveFrontendBaseUrl()
    {
        var configured = _config["App:FrontendBaseUrl"];
        if (!string.IsNullOrWhiteSpace(configured)) return configured;

        var origins = _config.GetSection("Cors:Origins").Get<string[]>() ?? [];
        var preferred = origins.FirstOrDefault(o => !o.Contains("localhost", StringComparison.OrdinalIgnoreCase))
            ?? origins.FirstOrDefault();

        return preferred ?? $"{Request.Scheme}://{Request.Host}";
    }
}
