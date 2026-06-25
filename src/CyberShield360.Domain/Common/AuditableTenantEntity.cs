namespace CyberShield360.Domain.Common;

public abstract class AuditableTenantEntity : BaseEntity, ITenantScoped, ISoftDelete
{
    public Guid TenantId { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
}
