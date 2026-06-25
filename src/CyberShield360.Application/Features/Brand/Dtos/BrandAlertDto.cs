using CyberShield360.Domain.Enums;
namespace CyberShield360.Application.Features.Brand.Dtos;

public record BrandAlertDto(Guid Id, BrandAlertType Type, Severity Severity, AlertStatus Status,
    string Title, string? RelatedDomain, string? SourceUrl, DateTime DetectedAtUtc);
