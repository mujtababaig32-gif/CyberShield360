using CyberShield360.Domain.Enums;

namespace CyberShield360.Application.Features.Risks.Dtos;

public record RiskDto(
    Guid Id,
    string Title,
    string? Description,
    string? Category,
    RiskLikelihood Likelihood,
    RiskImpact Impact,
    int InherentScore,
    int? ResidualScore,
    RiskStatus Status,
    string? Owner,
    string? MitigationPlan);

public record HeatmapCellDto(int Likelihood, int Impact, int Count);
