using CyberShield360.Application.Common.Interfaces;

namespace CyberShield360.Infrastructure.Identity;

public class TenantProvider : ITenantProvider
{
    private Guid? _tenantId;
    private readonly ICurrentUser _currentUser;
    public TenantProvider(ICurrentUser currentUser) => _currentUser = currentUser;

    public Guid? GetTenantId() => _tenantId ?? _currentUser.TenantId;
    public void SetTenantId(Guid tenantId) => _tenantId = tenantId;
}
