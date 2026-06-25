using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Application.Features.Scans.Dtos;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Scans.Commands;

public record RunScanCommand(Guid AssetId, ScanType Type) : IRequest<Result<ScanDto>>;

public class RunScanCommandValidator : AbstractValidator<RunScanCommand>
{
    public RunScanCommandValidator() => RuleFor(x => x.AssetId).NotEmpty();
}

public class RunScanCommandHandler : IRequestHandler<RunScanCommand, Result<ScanDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly ISecurityScannerService _scanner;
    private readonly IScoreCalculator _scorer;
    private readonly ICurrentUser _user;

    public RunScanCommandHandler(IApplicationDbContext db, ISecurityScannerService scanner,
        IScoreCalculator scorer, ICurrentUser user)
    {
        _db = db; _scanner = scanner; _scorer = scorer; _user = user;
    }

    public async Task<Result<ScanDto>> Handle(RunScanCommand request, CancellationToken ct)
    {
        var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == request.AssetId, ct);
        if (asset is null) return Result<ScanDto>.Failure("Asset not found.");

        var scan = new SecurityScan
        {
            AssetId = asset.Id,
            TenantId = asset.TenantId,
            Type = request.Type,
            Status = ScanStatus.Running,
            StartedUtc = DateTime.UtcNow
        };
        _db.Scans.Add(scan);
        await _db.SaveChangesAsync(ct);

        try
        {
            var result = await _scanner.RunScanAsync(asset.Domain, request.Type, ct);
            scan.Score = result.Score;
            scan.Grade = result.Grade;
            scan.Status = ScanStatus.Completed;
            scan.CompletedUtc = DateTime.UtcNow;
            scan.RawResultJson = result.RawJson;
            foreach (var f in result.Findings)
            {
                _db.ScanFindings.Add(new ScanFinding
                {
                    ScanId = scan.Id, TenantId = asset.TenantId,
                    CheckKey = f.CheckKey, Title = f.Title, Severity = f.Severity,
                    Passed = f.Passed, Detail = f.Detail, Recommendation = f.Recommendation
                });
            }
            asset.LastScannedUtc = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            scan.Status = ScanStatus.Failed;
            scan.ErrorMessage = ex.Message;
        }
        await _db.SaveChangesAsync(ct);

        return Result<ScanDto>.Success(new ScanDto(scan.Id, asset.Id, asset.Domain, scan.Type,
            scan.Status, scan.Score, scan.Grade, scan.CompletedUtc));
    }
}
