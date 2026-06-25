using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Application.Features.Risks.Dtos;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Risks.Queries;

public record GetRisksQuery(RiskStatus? Status, int PageNumber = 1, int PageSize = 20)
    : IRequest<PaginatedList<RiskDto>>;

public class GetRisksHandler : IRequestHandler<GetRisksQuery, PaginatedList<RiskDto>>
{
    private readonly IApplicationDbContext _db;

    public GetRisksHandler(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<PaginatedList<RiskDto>> Handle(GetRisksQuery r, CancellationToken ct)
    {
        var pageNumber = Math.Max(1, r.PageNumber);
        var pageSize = Math.Clamp(r.PageSize, 1, 100);

        var query = _db.Risks
            .AsNoTracking()
            .AsQueryable();

        if (r.Status.HasValue)
            query = query.Where(x => x.Status == r.Status);

        query = query
            .OrderByDescending(x => (int)x.Likelihood * (int)x.Impact)
            .ThenBy(x => x.Status)
            .ThenBy(x => x.Title);

        var count = await query.CountAsync(ct);

        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new RiskDto(
                x.Id,
                x.Title,
                x.Description,
                x.Category,
                x.Likelihood,
                x.Impact,
                (int)x.Likelihood * (int)x.Impact,
                x.ResidualScore,
                x.Status,
                x.Owner,
                x.MitigationPlan))
            .ToListAsync(ct);

        return new PaginatedList<RiskDto>(items, count, pageNumber, pageSize);
    }
}
