using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.ScheduledScans.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.ScheduledScans.Queries;

public record GetScheduledScansQuery() : IRequest<IReadOnlyList<ScheduledScanDto>>;

public class GetScheduledScansHandler : IRequestHandler<GetScheduledScansQuery, IReadOnlyList<ScheduledScanDto>>
{
    private readonly IApplicationDbContext _db;
    public GetScheduledScansHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<ScheduledScanDto>> Handle(GetScheduledScansQuery request, CancellationToken ct)
        => await _db.ScheduledScans.AsNoTracking()
            .OrderBy(s => s.NextRunUtc)
            .Select(s => new ScheduledScanDto(s.Id, s.AssetId, s.Type, s.CronExpression,
                s.Enabled, s.LastRunUtc, s.NextRunUtc))
            .ToListAsync(ct);
}
