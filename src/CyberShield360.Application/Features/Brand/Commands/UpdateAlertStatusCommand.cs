using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Brand.Commands;

public record UpdateAlertStatusCommand(Guid Id, AlertStatus Status) : IRequest<Result>;

public class UpdateAlertStatusHandler : IRequestHandler<UpdateAlertStatusCommand, Result>
{
    private readonly IApplicationDbContext _db;
    public UpdateAlertStatusHandler(IApplicationDbContext db) => _db = db;

    public async Task<Result> Handle(UpdateAlertStatusCommand r, CancellationToken ct)
    {
        var alert = await _db.BrandAlerts.FirstOrDefaultAsync(a => a.Id == r.Id, ct);
        if (alert is null) return Result.Failure("Alert not found.");
        alert.Status = r.Status;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
