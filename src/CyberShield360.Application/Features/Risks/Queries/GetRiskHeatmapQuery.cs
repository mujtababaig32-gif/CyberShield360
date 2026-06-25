using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Features.Risks.Dtos;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Risks.Queries;

public record GetRiskHeatmapQuery() : IRequest<IReadOnlyList<HeatmapCellDto>>;

public class GetRiskHeatmapHandler : IRequestHandler<GetRiskHeatmapQuery, IReadOnlyList<HeatmapCellDto>>
{
    private readonly IApplicationDbContext _db;
    public GetRiskHeatmapHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<HeatmapCellDto>> Handle(GetRiskHeatmapQuery request, CancellationToken ct)
    {
        return await _db.Risks.AsNoTracking()
            .Where(r => r.Status != RiskStatus.Closed)
            .GroupBy(r => new { L = (int)r.Likelihood, I = (int)r.Impact })
            .Select(g => new HeatmapCellDto(g.Key.L, g.Key.I, g.Count()))
            .ToListAsync(ct);
    }
}
