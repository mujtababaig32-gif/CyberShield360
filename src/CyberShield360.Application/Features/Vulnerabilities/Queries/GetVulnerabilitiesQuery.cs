using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Application.Features.Vulnerabilities.Dtos;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Vulnerabilities.Queries;

public record GetVulnerabilitiesQuery(VulnerabilityStatus? Status, Severity? Severity,
    int PageNumber = 1, int PageSize = 20) : IRequest<PaginatedList<VulnerabilityDto>>;

public class GetVulnerabilitiesHandler : IRequestHandler<GetVulnerabilitiesQuery, PaginatedList<VulnerabilityDto>>
{
    private readonly IApplicationDbContext _db;
    public GetVulnerabilitiesHandler(IApplicationDbContext db) => _db = db;

    public async Task<PaginatedList<VulnerabilityDto>> Handle(GetVulnerabilitiesQuery r, CancellationToken ct)
    {
        var q = _db.Vulnerabilities.AsNoTracking().AsQueryable();
        if (r.Status.HasValue) q = q.Where(v => v.Status == r.Status);
        if (r.Severity.HasValue) q = q.Where(v => v.Severity == r.Severity);
        q = q.OrderByDescending(v => v.Severity).ThenByDescending(v => v.CreatedAtUtc);

        var count = await q.CountAsync(ct);
        var items = await q.Skip((r.PageNumber - 1) * r.PageSize).Take(r.PageSize)
            .Select(v => new VulnerabilityDto(v.Id, v.Title, v.CveId, v.CvssScore, v.Severity,
                v.Status, v.AssignedToUserId, v.DueDateUtc))
            .ToListAsync(ct);
        return new PaginatedList<VulnerabilityDto>(items, count, r.PageNumber, r.PageSize);
    }
}
