using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Scans.Commands;
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
    private readonly LookupClient _dns = new();

    public AssetsController(ApplicationDbContext db, ICurrentUser user)
    {
        _db = db;
        _user = user;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var assets = await _db.Assets
            .AsNoTracking()
            .Where(a => a.TenantId == tid)
            .Select(a => new
            {
                a.Id,
                a.Domain,
                a.DisplayName,
                a.IsPrimary,
                a.MonitoringEnabled,
                a.LastScannedUtc,

                LatestScanId = a.Scans
                    .OrderByDescending(s => s.CompletedUtc ?? s.StartedUtc)
                    .Select(s => (Guid?)s.Id)
                    .FirstOrDefault(),

                LatestScore = a.Scans
                    .OrderByDescending(s => s.CompletedUtc ?? s.StartedUtc)
                    .Select(s => s.Score)
                    .FirstOrDefault(),

                LatestGrade = a.Scans
                    .OrderByDescending(s => s.CompletedUtc ?? s.StartedUtc)
                    .Select(s => s.Grade.ToString())
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(assets);
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Create([FromBody] CreateAssetRequest req)
    {
        if (_user.TenantId is not Guid tid) return Unauthorized();

        var normalizedDomain = NormalizeDomain(req.Domain);

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

        var results = new List<object>();

        foreach (var asset in assets)
        {
            var scanResult = await Mediator.Send(
                new RunScanCommand(asset.Id, ScanType.FullPosture),
                ct
            );

            results.Add(new
            {
                asset.Id,
                asset.Domain,
                scanResult.Succeeded,
                scan = scanResult.Data,
                scanResult.Errors
            });
        }

        return Ok(new
        {
            scannedCount = results.Count,
            results
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

    private static string NormalizeDomain(string domain)
    {
        return domain
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
            .Trim()
            .TrimEnd('/')
            .Split('/')[0]
            .ToLowerInvariant();
    }
}

public record CreateAssetRequest(string Domain, string? DisplayName);