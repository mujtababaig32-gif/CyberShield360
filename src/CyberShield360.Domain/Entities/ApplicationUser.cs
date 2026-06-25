using Microsoft.AspNetCore.Identity;
using CyberShield360.Domain.Common;

namespace CyberShield360.Domain.Entities;

public class ApplicationUser : IdentityUser<Guid>, ITenantScoped
{
    public Guid TenantId { get; set; }
    public string? FullName { get; set; }
    public string? JobTitle { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginUtc { get; set; }
    public string? AvatarUrl { get; set; }

    public Tenant? Tenant { get; set; }
}

public class ApplicationRole : IdentityRole<Guid>
{
    public string? Description { get; set; }
}

public static class AppRoles
{
    public const string SuperAdmin = "SuperAdmin"; // platform owner
    public const string TenantAdmin = "TenantAdmin";
    public const string SecurityAnalyst = "SecurityAnalyst";
    public const string Auditor = "Auditor";
    public const string Member = "Member";
    public static readonly string[] All = { SuperAdmin, TenantAdmin, SecurityAnalyst, Auditor, Member };
}
