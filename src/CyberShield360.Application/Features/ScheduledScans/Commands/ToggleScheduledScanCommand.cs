using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.ScheduledScans.Commands;

public record ToggleScheduledScanCommand(Guid Id, bool Enabled) : IRequest<Result>;

public class ToggleScheduledScanHandler : IRequestHandler<ToggleScheduledScanCommand, Result>
{
    private readonly IApplicationDbContext _db;
    public ToggleScheduledScanHandler(IApplicationDbContext db) => _db = db;

    public async Task<Result> Handle(ToggleScheduledScanCommand r, CancellationToken ct)
    {
        var s = await _db.ScheduledScans.FirstOrDefaultAsync(x => x.Id == r.Id, ct);
        if (s is null) return Result.Failure("Schedule not found.");
        s.Enabled = r.Enabled;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
