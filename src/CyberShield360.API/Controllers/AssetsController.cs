using System.Text.RegularExpressions;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using DnsClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class AssetsController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IBackgroundJobService _jobs;
    private readonly IScanJobRunner _scanJobRunner;
    private readonly LookupClient _dns = new();

    public AssetsController(
        ApplicationDbContext db,
        ICurrentUser user,
        IBackgroundJobService jobs,
        IScanJobRunner scanJobRunner)
    {
        _db = db;
        _user = user;
        _jobs = jobs;
        _scanJobRunner = scanJobRunner;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .OrderBy(a => a.Domain)
            .ToListAsync(ct);

        var assetIds = assets.Select(a => a.Id).ToList();

        var completedFullPostureScans = await _db.Scans
            .AsNoTracking()
            .Include(s => s.Findings)
            .Where(s =>
                s.TenantId == tid &&
                assetIds.Contains(s.AssetId) &&
                s.Status == ScanStatus.Completed &&
                s.Type == ScanType.FullPosture)
            .OrderByDescending(s => s.CompletedUtc ?? s.StartedUtc ?? s.CreatedAtUtc)
            .ToListAsync(ct);

        var latestFullPostureByAsset = completedFullPostureScans
            .GroupBy(s => s.AssetId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(PostureScoreHelper.SortUtc).First());

        var response = assets.Select(asset =>
        {
            latestFullPostureByAsset.TryGetValue(asset.Id, out var latest);

            var failedFindings = latest?.Findings.Count(f => !f.Passed && f.Severity != Severity.Info);
            var highCriticalFindings = latest?.Findings.Count(f =>
                !f.Passed && f.Severity is Severity.High or Severity.Critical);

            return new
            {
                asset.Id,
                asset.Domain,
                asset.DisplayName,
                asset.IsPrimary,
                asset.MonitoringEnabled,
                LastScannedUtc = latest?.CompletedUtc ?? asset.LastScannedUtc,

                // Backwards-compatible fields now point only to latest completed Full Posture scan.
                LatestScanId = (Guid?)latest?.Id,
                LatestScore = latest is null ? (int?)null : PostureScoreHelper.NormalizeScore(latest.Score),
                LatestGrade = latest is null ? null : PostureScoreHelper.GradeLabel(latest),

                LatestFullPostureScanId = (Guid?)latest?.Id,
                LatestFullPostureScore = latest is null ? (int?)null : PostureScoreHelper.NormalizeScore(latest.Score),
                LatestFullPostureGrade = latest is null ? null : PostureScoreHelper.GradeLabel(latest),
                FailedFindings = failedFindings,
                HighCriticalFindings = highCriticalFindings,
                ScoreSource = latest is null ? "Not scanned yet" : "Latest completed Full Posture scan"
            };
        });

        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Create([FromBody] CreateAssetRequest req)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var normalizedDomain = NormalizeDomain(req.Domain);

        if (!IsValidDomain(normalizedDomain))
        {
            return BadRequest(new
            {
                message = "Invalid domain format. Use a real domain like example.com or app.example.com.",
                domain = normalizedDomain
            });
        }

        var exists = await _db.Assets.AnyAsync(a =>
            a.TenantId == tid &&
            a.Domain == normalizedDomain);

        if (exists)
        {
            return Conflict(new
            {
                message = "Asset already exists.",
                domain = normalizedDomain
            });
        }

        var asset = new MonitoredAsset
        {
            TenantId = tid,
            Domain = normalizedDomain,
            DisplayName = req.DisplayName,
            IsPrimary = true
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(List), new { id = asset.Id }, new { asset.Id });
    }

    [HttpPost("{id:guid}/discover-subdomains")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> DiscoverSubdomains(Guid id, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var rootAsset = await _db.Assets
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tid, ct);

        if (rootAsset is null) return NotFound();

        var rootDomain = NormalizeDomain(rootAsset.Domain);

        var prefixes = new[]
        {
            "www", "mail", "webmail", "smtp", "imap", "pop",
            "api", "app", "portal", "admin", "dashboard", "login",
            "dev", "test", "staging", "beta", "cdn", "static",
            "assets", "vpn", "remote", "support", "help", "docs",
            "blog", "shop"
        };

        var discovered = new List<object>();
        var created = 0;

        foreach (var prefix in prefixes)
        {
            var subdomain = $"{prefix}.{rootDomain}";

            try
            {
                var response = await _dns.QueryAsync(subdomain, QueryType.A, cancellationToken: ct);

                var ipAddresses = response.Answers
                    .ARecords()
                    .Select(r => r.Address.ToString())
                    .Distinct()
                    .ToList();

                if (!ipAddresses.Any()) continue;

                var alreadyExists = await _db.Assets.AnyAsync(a =>
                    a.TenantId == tid &&
                    a.Domain == subdomain, ct);

                if (!alreadyExists)
                {
                    _db.Assets.Add(new MonitoredAsset
                    {
                        TenantId = tid,
                        Domain = subdomain,
                        DisplayName = $"Discovered: {subdomain}",
                        IsPrimary = false,
                        MonitoringEnabled = true
                    });

                    created++;
                }

                discovered.Add(new
                {
                    domain = subdomain,
                    ips = ipAddresses,
                    alreadyExists
                });
            }
            catch
            {
                // Ignore DNS failures for guessed subdomains.
            }
        }

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            rootDomain,
            checkedCount = prefixes.Length,
            discoveredCount = discovered.Count,
            createdCount = created,
            discovered
        });
    }

    [HttpPost("scan-all")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> ScanAllAssets(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid && a.MonitoringEnabled)
            .Select(a => new { a.Id, a.Domain })
            .ToListAsync(ct);

        // Queue each asset's scan as its own background job instead of running them
        // sequentially inside this request: a tenant with 20+ assets would otherwise
        // make this request run long enough to hit a reverse-proxy/load-balancer
        // timeout, killing the connection with scans left in an unknown partial state.
        foreach (var asset in assets)
        {
            _jobs.Enqueue(() => _scanJobRunner.RunAdHocScanAsync(tid, asset.Id, ScanType.FullPosture, CancellationToken.None));
        }

        return Accepted(new
        {
            queuedCount = assets.Count,
            message = "Full Posture scans have been queued for all monitored assets. Check each asset for updated results as scans complete."
        });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var asset = await _db.Assets
            .FirstOrDefaultAsync(a => a.Id == id && a.TenantId == tid);

        if (asset is null) return NotFound();

        _db.Assets.Remove(asset);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static string NormalizeDomain(string? domain)
    {
        return (domain ?? string.Empty)
            .Trim()
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
            .Trim()
            .TrimEnd('/')
            .Split('/')[0]
            .Split('?')[0]
            .Split('#')[0]
            .TrimEnd('.')
            .ToLowerInvariant();
    }

    private static bool IsValidDomain(string domain)
    {
        if (string.IsNullOrWhiteSpace(domain) || domain.Length > 253)
            return false;

        if (domain.Contains(' ') || domain.Contains('_') || domain.Contains('@'))
            return false;

        return Regex.IsMatch(
            domain,
            @"^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }
}

public record CreateAssetRequest(string Domain, string? DisplayName);