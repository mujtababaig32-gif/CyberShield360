using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Application.Features.Scans.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Scans.Queries;

public record GetScanByIdQuery(Guid Id) : IRequest<Result<ScanDetailDto>>;

public record ScanDetailDto(ScanDto Scan, List<FindingItemDto> Findings);

public class GetScanByIdQueryHandler : IRequestHandler<GetScanByIdQuery, Result<ScanDetailDto>>
{
    private readonly IApplicationDbContext _db;
    public GetScanByIdQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<Result<ScanDetailDto>> Handle(GetScanByIdQuery request, CancellationToken ct)
    {
        var scan = await _db.Scans.Include(s => s.Asset).Include(s => s.Findings)
            .FirstOrDefaultAsync(s => s.Id == request.Id, ct);
        if (scan is null) return Result<ScanDetailDto>.Failure("Scan not found.");

        var dto = new ScanDto(scan.Id, scan.AssetId, scan.Asset?.Domain ?? "", scan.Type,
            scan.Status, scan.Score, scan.Grade, scan.CompletedUtc);
        var findings = scan.Findings.Select(f => new FindingItemDto(f.CheckKey, f.Title,
            f.Severity, f.Passed, f.Detail, f.Recommendation)).ToList();
        return Result<ScanDetailDto>.Success(new ScanDetailDto(dto, findings));
    }
}
