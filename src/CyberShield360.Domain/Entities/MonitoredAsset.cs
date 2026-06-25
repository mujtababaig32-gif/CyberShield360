using CyberShield360.Domain.Common;

namespace CyberShield360.Domain.Entities;

public class MonitoredAsset : AuditableTenantEntity
{
    public string Domain { get; set; } = default!;
    public string? DisplayName { get; set; }
    public bool IsPrimary { get; set; }
    public bool MonitoringEnabled { get; set; } = true;
    public DateTime? LastScannedUtc { get; set; }

    public ICollection<SecurityScan> Scans { get; set; } = new List<SecurityScan>();
}
