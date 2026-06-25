using CyberShield360.Domain.Common;
using CyberShield360.Domain.Enums;

namespace CyberShield360.Domain.Entities;

public class Tenant : BaseEntity, ISoftDelete
{
    public string Name { get; set; } = default!;
    public string Slug { get; set; } = default!;
    public string? PrimaryDomain { get; set; }
    public bool IsActive { get; set; } = true;

    // White-label (agency) settings
    public string? BrandName { get; set; }
    public string? LogoUrl { get; set; }
    public string? PrimaryColorHex { get; set; }
    public string? CustomReportFooter { get; set; }
    public bool WhiteLabelEnabled { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAtUtc { get; set; }

    public Subscription? Subscription { get; set; }
    public ICollection<ApplicationUser> Users { get; set; } = new List<ApplicationUser>();
    public ICollection<MonitoredAsset> Assets { get; set; } = new List<MonitoredAsset>();
}
