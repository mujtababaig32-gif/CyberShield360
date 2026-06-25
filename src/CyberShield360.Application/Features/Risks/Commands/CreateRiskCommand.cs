using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Common.Models;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CyberShield360.Application.Features.Risks.Commands;

public record CreateRiskCommand(string Title, string? Description, string? Category,
    RiskLikelihood Likelihood, RiskImpact Impact, string? Owner, string? MitigationPlan)
    : IRequest<Result<Guid>>;

public class CreateRiskValidator : AbstractValidator<CreateRiskCommand>
{
    public CreateRiskValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(256);
        RuleFor(x => x.Likelihood).IsInEnum();
        RuleFor(x => x.Impact).IsInEnum();
    }
}

public class CreateRiskHandler : IRequestHandler<CreateRiskCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUser _user;
    public CreateRiskHandler(IApplicationDbContext db, ICurrentUser user) { _db = db; _user = user; }

    public async Task<Result<Guid>> Handle(CreateRiskCommand r, CancellationToken ct)
    {
        if (_user.TenantId is null) return Result<Guid>.Failure("No tenant context.");
        var risk = new Risk
        {
            TenantId = _user.TenantId.Value, Title = r.Title, Description = r.Description,
            Category = r.Category, Likelihood = r.Likelihood, Impact = r.Impact,
            Owner = r.Owner, MitigationPlan = r.MitigationPlan, Status = RiskStatus.Identified
        };
        _db.Risks.Add(risk);
        await _db.SaveChangesAsync(ct);
        return Result<Guid>.Success(risk.Id);
    }
}
