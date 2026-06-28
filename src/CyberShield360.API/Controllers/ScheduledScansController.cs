using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;
using CyberShield360.Infrastructure.Services;
using Cronos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.API.Controllers;

[Authorize]
public class ScheduledScansController : ApiControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ICurrentUser _user;
    private readonly IScanJobRunner _runner;

    public ScheduledScansController(
        ApplicationDbContext db,
        ICurrentUser user,
        IScanJobRunner runner)
    {
        _db = db;
        _user = user;
        _runner = runner;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var schedules = await (
            from schedule in _db.ScheduledScans.AsNoTracking()
            join asset in _db.Assets.AsNoTracking()
                on schedule.AssetId equals asset.Id into assetJoin
            from asset in assetJoin.DefaultIfEmpty()
            where schedule.TenantId == tid
            orderby schedule.Enabled descending, schedule.NextRunUtc
            select new
            {
                id = schedule.Id,
                assetId = schedule.AssetId,
                assetDomain = asset != null ? asset.Domain : "Unknown asset",
                type = schedule.Type,
                typeName = schedule.Type.ToString(),
                cronExpression = schedule.CronExpression,
                enabled = schedule.Enabled,
                lastRunUtc = schedule.LastRunUtc,
                nextRunUtc = schedule.NextRunUtc
            })
            .ToListAsync(ct);

        return Ok(schedules);
    }

    [HttpPost]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Create(
        [FromBody] CreateScheduledScanRequest request,
        CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        if (request.AssetId == Guid.Empty)
            return BadRequest(new { message = "Asset is required." });

        var normalizedCron = request.CronExpression?.Trim() ?? string.Empty;
        if (!TryComputeNextRun(normalizedCron, DateTime.UtcNow, out var nextRunUtc, out var cronError))
            return BadRequest(new { message = cronError });

        var asset = await _db.Assets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.AssetId && a.TenantId == tid, ct);

        if (asset is null)
            return NotFound(new { message = "Asset not found." });

        var duplicate = await _db.ScheduledScans.AnyAsync(s =>
            s.TenantId == tid &&
            s.AssetId == request.AssetId &&
            s.Type == request.Type &&
            s.CronExpression == normalizedCron,
            ct);

        if (duplicate)
        {
            return Conflict(new
            {
                message = "A matching scheduled scan already exists for this asset."
            });
        }

        var schedule = new ScheduledScan
        {
            TenantId = tid,
            AssetId = request.AssetId,
            Type = request.Type,
            CronExpression = normalizedCron,
            Enabled = true,
            NextRunUtc = nextRunUtc
        };

        _db.ScheduledScans.Add(schedule);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = schedule.Id,
            nextRunUtc = schedule.NextRunUtc,
            message = "Scheduled scan created. Use Run Now for an immediate assessment, or wait for the next scheduled review."
        });
    }

    [HttpPut("{id:guid}/toggle")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> Toggle(
        Guid id,
        [FromBody] ToggleBody body,
        CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var schedule = await _db.ScheduledScans
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tid, ct);

        if (schedule is null)
            return NotFound(new { message = "Schedule not found." });

        schedule.Enabled = body.Enabled;

        if (body.Enabled)
        {
            if (!TryComputeNextRun(schedule.CronExpression, DateTime.UtcNow, out var nextRunUtc, out var cronError))
                return BadRequest(new { message = cronError });

            schedule.NextRunUtc = nextRunUtc;
        }

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id = schedule.Id,
            enabled = schedule.Enabled,
            nextRunUtc = schedule.NextRunUtc,
            message = schedule.Enabled ? "Schedule enabled." : "Schedule paused."
        });
    }

    [HttpPost("{id:guid}/run-now")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> RunNow(Guid id, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var exists = await _db.ScheduledScans
            .AsNoTracking()
            .AnyAsync(s => s.Id == id && s.TenantId == tid, ct);

        if (!exists)
            return NotFound(new { message = "Schedule not found." });

        await _runner.RunSingleScheduledScanAsync(id, ct);

        return Ok(new
        {
            id,
            message = "Scheduled scan executed successfully."
        });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var schedule = await _db.ScheduledScans
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tid, ct);

        if (schedule is null)
            return NotFound(new { message = "Schedule not found." });

        _db.ScheduledScans.Remove(schedule);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            id,
            message = "Scheduled scan deleted."
        });
    }

    private static bool TryComputeNextRun(
        string cronExpression,
        DateTime fromUtc,
        out DateTime? nextRunUtc,
        out string? error)
    {
        nextRunUtc = null;
        error = null;

        if (string.IsNullOrWhiteSpace(cronExpression))
        {
            error = "Cron expression is required.";
            return false;
        }

        if (cronExpression.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).Length != 5)
        {
            error = "Cron must be a standard 5-field expression, for example 0 2 * * *.";
            return false;
        }

        try
        {
            var expr = CronExpression.Parse(cronExpression, CronFormat.Standard);
            nextRunUtc = expr.GetNextOccurrence(fromUtc, TimeZoneInfo.Utc);

            if (nextRunUtc is null)
            {
                error = "Cron expression did not produce a future run time.";
                return false;
            }

            return true;
        }
        catch
        {
            error = "Invalid cron expression. Use standard 5-field cron, for example 0 2 * * *.";
            return false;
        }
    }
}

public record CreateScheduledScanRequest(
    Guid AssetId,
    ScanType Type,
    string CronExpression);

public record ToggleBody(bool Enabled);
