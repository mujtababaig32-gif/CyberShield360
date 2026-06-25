using System.Security.Claims;
using CyberShield360.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace CyberShield360.Infrastructure.Identity;

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;
    public CurrentUser(IHttpContextAccessor accessor) => _accessor = accessor;

    private ClaimsPrincipal? Principal => _accessor.HttpContext?.User;

    public Guid? UserId => Guid.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    public string? Email => Principal?.FindFirstValue(ClaimTypes.Email);
    public Guid? TenantId => Guid.TryParse(Principal?.FindFirstValue("tenant_id"), out var t) ? t : null;
    public IReadOnlyList<string> Roles =>
        Principal?.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList() ?? new List<string>();
    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;
    public bool IsInRole(string role) => Principal?.IsInRole(role) ?? false;
}
