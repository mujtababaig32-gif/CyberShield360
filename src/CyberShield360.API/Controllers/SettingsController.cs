using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class SettingsController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;

    public SettingsController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var tenant = await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tid, ct);

        if (tenant is null)
            return NotFound();

        var smtpEvents = await _db.Notifications
            .AsNoTracking()
            .CountAsync(n => n.TenantId == tid, ct);

        var auditEvents = await _db.AuditLogs
            .AsNoTracking()
            .CountAsync(a => a.TenantId == tid, ct);

        var users = await _db.Users
            .AsNoTracking()
            .CountAsync(u => u.TenantId == tid, ct);

        var assets = await _db.Assets
            .AsNoTracking()
            .CountAsync(a => a.TenantId == tid, ct);

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            branding = new
            {
                tenant.Name,
                tenant.BrandName,
                tenant.LogoUrl,
                tenant.PrimaryColorHex,
                tenant.CustomReportFooter,
                tenant.WhiteLabelEnabled
            },
            readiness = new[]
            {
                new { item = "Tenant Profile", status = !string.IsNullOrWhiteSpace(tenant.Name) ? "Ready" : "Needs Review", priority = "High" },
                new { item = "Branding", status = tenant.WhiteLabelEnabled ? "Enabled" : "Default", priority = "Medium" },
                new { item = "SMTP Email", status = smtpEvents > 0 ? "Validated by notification activity" : "Not validated yet", priority = "High" },
                new { item = "Audit Logging", status = auditEvents > 0 ? "Active" : "No events yet", priority = "High" },
                new { item = "Users", status = users > 0 ? "Active" : "No users", priority = "High" },
                new { item = "Assets", status = assets > 0 ? "Active" : "No assets", priority = "High" }
            },
            recommendations = new[]
            {
                "Move secrets from appsettings.json to environment variables before deployment.",
                "Use a verified sender domain for production email delivery.",
                "Review white-label settings before generating customer-facing reports.",
                "Keep audit logging enabled for all production environments."
            }
        });
    }

    [HttpGet("branding")]
    public async Task<IActionResult> GetBranding(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var tenant = await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tid, ct);

        if (tenant is null) return NotFound();

        return Ok(new
        {
            tenant.Name,
            tenant.BrandName,
            tenant.LogoUrl,
            tenant.PrimaryColorHex,
            tenant.CustomReportFooter,
            tenant.WhiteLabelEnabled
        });
    }

    [HttpPut("branding")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> UpdateBranding([FromBody] BrandingSettingsRequest req, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tid, ct);
        if (tenant is null) return NotFound();

        tenant.BrandName = Clean(req.BrandName);
        tenant.LogoUrl = Clean(req.LogoUrl);
        tenant.PrimaryColorHex = string.IsNullOrWhiteSpace(req.PrimaryColorHex) ? "#10B5A6" : req.PrimaryColorHex.Trim();
        tenant.CustomReportFooter = Clean(req.CustomReportFooter);
        tenant.WhiteLabelEnabled = req.WhiteLabelEnabled;

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            message = "Branding settings updated.",
            tenant.BrandName,
            tenant.LogoUrl,
            tenant.PrimaryColorHex,
            tenant.CustomReportFooter,
            tenant.WhiteLabelEnabled
        });
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

public record BrandingSettingsRequest(
    string? BrandName,
    string? LogoUrl,
    string? PrimaryColorHex,
    string? CustomReportFooter,
    bool WhiteLabelEnabled
);
