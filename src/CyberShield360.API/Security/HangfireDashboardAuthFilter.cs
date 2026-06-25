using Hangfire.Dashboard;

namespace CyberShield360.API.Security;

/// <summary>Restricts the Hangfire dashboard to authenticated admins.</summary>
public class HangfireDashboardAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var http = context.GetHttpContext();
        return http.User.Identity?.IsAuthenticated == true &&
               (http.User.IsInRole("SuperAdmin") || http.User.IsInRole("TenantAdmin"));
    }
}
