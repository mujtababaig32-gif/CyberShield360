using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.ScheduledScans.Commands;

public record CreateScheduledScanCommand(Guid AssetId, ScanType Type, string CronExpression)
    : IRequest<Result<Guid>>;

public class CreateScheduledScanValidator : AbstractValidator<CreateScheduledScanCommand>
{
    public CreateScheduledScanValidator()
    {
        RuleFor(x => x.AssetId).NotEmpty();
        RuleFor(x => x.CronExpression).NotEmpty()
            .Must(c => c.Split(' ').Length == 5)
            .WithMessage("Cron must be a 5-field standard expression, e.g. '0 2 * * *'.");
    }
}

public class CreateScheduledScanHandler : IRequestHandler<CreateScheduledScanCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _user;
    public CreateScheduledScanHandler(IApplicationDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Result<Guid>> Handle(CreateScheduledScanCommand r, CancellationToken ct)
    {
        if (_user.TenantId is null) return Result<Guid>.Failure("No tenant context.");
        var asset = await _db.Assets.FirstOrDefaultAsync(a => a.Id == r.AssetId, ct);
        if (asset is null) return Result<Guid>.Failure("Asset not found.");

        var schedule = new ScheduledScan
        {
            TenantId = _user.TenantId.Value, AssetId = r.AssetId, Type = r.Type,
            CronExpression = r.CronExpression, Enabled = true,
            NextRunUtc = DateTime.UtcNow // picked up by the next sweep
        };
        _db.ScheduledScans.Add(schedule);
        await _db.SaveChangesAsync(ct);
        return Result<Guid>.Success(schedule.Id);
    }
}
