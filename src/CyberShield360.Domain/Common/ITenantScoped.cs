namespace CyberShield360.Domain.Common;

/// <summary>Marks an entity as belonging to a tenant. A global query filter enforces isolation.</summary>
public interface ITenantScoped
{
    Guid TenantId { get; set; }
}
