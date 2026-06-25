using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Application.Features.Brand.Dtos;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Brand.Queries;

public record GetBrandAlertsQuery(AlertStatus? Status, int PageNumber = 1, int PageSize = 20)
    : IRequest<PaginatedList<BrandAlertDto>>;

public class GetBrandAlertsHandler : IRequestHandler<GetBrandAlertsQuery, PaginatedList<BrandAlertDto>>
{
    private readonly IApplicationDbContext _db;
    public GetBrandAlertsHandler(IApplicationDbContext db) => _db = db;

    public async Task<PaginatedList<BrandAlertDto>> Handle(GetBrandAlertsQuery r, CancellationToken ct)
    {
        var q = _db.BrandAlerts.AsNoTracking().AsQueryable();
        if (r.Status.HasValue) q = q.Where(a => a.Status == r.Status);
        q = q.OrderByDescending(a => a.DetectedAtUtc);

        var count = await q.CountAsync(ct);
        var items = await q.Skip((r.PageNumber - 1) * r.PageSize).Take(r.PageSize)
            .Select(a => new BrandAlertDto(a.Id, a.Type, a.Severity, a.Status, a.Title,
                a.RelatedDomain, a.SourceUrl, a.DetectedAtUtc))
            .ToListAsync(ct);
        return new PaginatedList<BrandAlertDto>(items, count, r.PageNumber, r.PageSize);
    }
}
