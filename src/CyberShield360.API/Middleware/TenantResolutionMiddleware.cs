using CyberShield360.Application.Common.Interfaces;

namespace CyberShield360.API.Middleware;

/// <summary>Resolves the active tenant from the authenticated user's claim (or X-Tenant-Id header for SuperAdmin).</summary>
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    public TenantResolutionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ICurrentUser currentUser, ITenantProvider tenantProvider)
    {
        if (currentUser.TenantId is Guid tid)
            tenantProvider.SetTenantId(tid);
        else if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var header)
                 && Guid.TryParse(header, out var headerTid)
                 && currentUser.IsInRole("SuperAdmin"))
            tenantProvider.SetTenantId(headerTid);

        await _next(context);
    }
}
