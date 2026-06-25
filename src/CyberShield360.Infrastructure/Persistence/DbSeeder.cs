using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var roleMgr = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        var userMgr = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbSeeder");

        await db.Database.MigrateAsync();

        foreach (var role in AppRoles.All)
            if (!await roleMgr.RoleExistsAsync(role))
                await roleMgr.CreateAsync(new ApplicationRole { Name = role });

        if (!await db.Tenants.AnyAsync())
        {
            var tenant = new Tenant
            {
                Name = "Acme Corp", Slug = "acme", PrimaryDomain = "acme.com",
                WhiteLabelEnabled = true, BrandName = "CyberShield360 By Mujtaba",
                PrimaryColorHex = "#10B5A6", CustomReportFooter = "Confidential — CyberShield360 By Mujtaba"
            };
            db.Tenants.Add(tenant);
            db.Subscriptions.Add(new Subscription
            {
                TenantId = tenant.Id, Plan = SubscriptionPlan.Professional,
                Status = SubscriptionStatus.Active, MaxAssets = 25, MaxUsers = 25, MaxScansPerMonth = 1000
            });
            await db.SaveChangesAsync();

            var admin = new ApplicationUser
            {
               UserName = "admin@cybershield360.com", Email = "admin@cybershield360.com",
                EmailConfirmed = true, TenantId = tenant.Id, FullName = "Acme Admin", IsActive = true
            };
            var res = await userMgr.CreateAsync(admin, "CyberShield360@2026!");
            if (res.Succeeded)
                await userMgr.AddToRolesAsync(admin, new[] { AppRoles.TenantAdmin, AppRoles.SecurityAnalyst });
            else
                logger.LogWarning("Seed admin creation failed: {Errors}",
                    string.Join(", ", res.Errors.Select(e => e.Description)));

            db.Assets.Add(new MonitoredAsset { TenantId = tenant.Id, Domain = "acme.com", IsPrimary = true });
            await db.SaveChangesAsync();
            logger.LogInformation("Seed data created. Login: admin@acme.com / ChangeMe!2026");
        }
    }
}
