using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CyberShield360.Application.Features.Risks.Commands;

public record UpdateRiskCommand(Guid Id, RiskStatus Status, string? MitigationPlan, int? ResidualScore)
    : IRequest<Result>;

public class UpdateRiskHandler : IRequestHandler<UpdateRiskCommand, Result>
{
    private readonly IApplicationDbContext _db;
    public UpdateRiskHandler(IApplicationDbContext db) => _db = db;

    public async Task<Result> Handle(UpdateRiskCommand r, CancellationToken ct)
    {
        var risk = await _db.Risks.FirstOrDefaultAsync(x => x.Id == r.Id, ct);
        if (risk is null) return Result.Failure("Risk not found.");
        risk.Status = r.Status;
        risk.MitigationPlan = r.MitigationPlan ?? risk.MitigationPlan;
        risk.ResidualScore = r.ResidualScore ?? risk.ResidualScore;
        await _db.SaveChangesAsync(ct);
        return Result.Success();
    }
}
