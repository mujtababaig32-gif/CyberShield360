using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class NotificationLog : AuditableTenantEntity
{
    public NotificationChannel Channel { get; set; }
    public string Recipient { get; set; } = default!;
    public string Subject { get; set; } = default!;
    public string Body { get; set; } = default!;
    public bool Sent { get; set; }
    public DateTime? SentAtUtc { get; set; }
    public string? Error { get; set; }
}

public class AuditLog : BaseEntity
{
    public Guid? TenantId { get; set; }
    public string? UserId { get; set; }
    public string? UserEmail { get; set; }
    public AuditAction Action { get; set; }
    public string EntityType { get; set; } = default!;
    public string? EntityId { get; set; }
    public string? Description { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
}

public class ScheduledScan : AuditableTenantEntity
{
    public Guid AssetId { get; set; }
    public ScanType Type { get; set; }
    public string CronExpression { get; set; } = "0 2 * * *"; // daily 02:00
    public bool Enabled { get; set; } = true;
    public DateTime? LastRunUtc { get; set; }
    public DateTime? NextRunUtc { get; set; }
}

public class ApiKey : AuditableTenantEntity
{
    public string Name { get; set; } = default!;
    public string KeyHash { get; set; } = default!;   // store only hash
    public string Prefix { get; set; } = default!;     // first chars for display
    public DateTime? ExpiresAtUtc { get; set; }
    public DateTime? LastUsedUtc { get; set; }
    public bool Revoked { get; set; }
}

public class GeneratedReport : AuditableTenantEntity
{
    public string Title { get; set; } = default!;
    public string Format { get; set; } = "PDF";  // PDF | XLSX
    public string? StoragePath { get; set; }
    public Guid? AssetId { get; set; }
    public bool WhiteLabeled { get; set; }
}
