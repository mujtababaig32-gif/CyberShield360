using CyberShield360.Domain.Enums;
namespace CyberShield360.Application.Features.ScheduledScans.Dtos;

public record ScheduledScanDto(Guid Id, Guid AssetId, ScanType Type, string CronExpression,
    bool Enabled, DateTime? LastRunUtc, DateTime? NextRunUtc);
