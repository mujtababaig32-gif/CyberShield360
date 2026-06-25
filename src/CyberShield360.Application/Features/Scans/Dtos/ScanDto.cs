using CyberShield360.Domain.Enums;

namespace CyberShield360.Application.Features.Scans.Dtos;

public record ScanDto(Guid Id, Guid AssetId, string Domain, ScanType Type, ScanStatus Status,
    int Score, SecurityGrade Grade, DateTime? CompletedUtc);

public record FindingItemDto(string CheckKey, string Title, Severity Severity, bool Passed,
    string? Detail, string? Recommendation);
