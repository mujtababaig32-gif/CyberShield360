using CyberShield360.Domain.Common;

namespace CyberShield360.Domain.Entities;

/// <summary>
/// A third-party/vendor record that is assessed through CyberShield360's external posture scanner.
/// The linked Asset keeps scan/report data reusable across Dashboard, Reports, Compliance, and Vendor Risk.
/// </summary>
public class Vendor : AuditableTenantEntity
{
    public string VendorName { get; set; } = default!;
    public string Website { get; set; } = default!;
    public string BusinessCriticality { get; set; } = "Medium";
    public string ReviewStatus { get; set; } = "Assessment Required";
    public string? ServiceType { get; set; }
    public string? ContactEmail { get; set; }
    public string? Notes { get; set; }

    public Guid AssetId { get; set; }
    public MonitoredAsset? Asset { get; set; }

    public Guid? LastAssessmentScanId { get; set; }
    public SecurityScan? LastAssessmentScan { get; set; }
    public DateTime? LastReviewedUtc { get; set; }
}
