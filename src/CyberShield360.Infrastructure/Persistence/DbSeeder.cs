using System.Security.Cryptography;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider sp)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
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

            var adminEmail = config["AdminSeed:Email"];
            if (string.IsNullOrWhiteSpace(adminEmail))
                adminEmail = "admin@cybershield360.com";

            // Never hardcode a real credential in source: use an operator-supplied
            // password if configured, otherwise generate a fresh random one and print
            // it once so it can be captured and rotated on first login.
            var configuredPassword = config["AdminSeed:Password"];
            var generatedPassword = string.IsNullOrWhiteSpace(configuredPassword);
            var adminPassword = generatedPassword ? GenerateRandomPassword() : configuredPassword!;

            var admin = new ApplicationUser
            {
                UserName = adminEmail, Email = adminEmail,
                EmailConfirmed = true, TenantId = tenant.Id, FullName = "Acme Admin", IsActive = true
            };
            var res = await userMgr.CreateAsync(admin, adminPassword);
            if (res.Succeeded)
            {
                await userMgr.AddToRolesAsync(admin, new[] { AppRoles.TenantAdmin, AppRoles.SecurityAnalyst });

                db.Assets.Add(new MonitoredAsset { TenantId = tenant.Id, Domain = "acme.com", IsPrimary = true });
                await db.SaveChangesAsync();

                if (generatedPassword)
                {
                    logger.LogWarning(
                        "Seed admin created: {Email} / {Password} — rotate this password immediately after first login.",
                        adminEmail, adminPassword);
                }
                else
                {
                    logger.LogInformation("Seed admin created: {Email} (password from AdminSeed:Password configuration).", adminEmail);
                }
            }
            else
            {
                logger.LogWarning("Seed admin creation failed: {Errors}",
                    string.Join(", ", res.Errors.Select(e => e.Description)));
            }
        }
    }

    private static string GenerateRandomPassword()
    {
        // Guarantees at least one of each required character class, then fills the
        // rest randomly, satisfying ASP.NET Core Identity's default password policy.
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        const string special = "!@#$%^&*-_=+";
        const string all = upper + lower + digits + special;

        var chars = new char[20];
        chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        chars[3] = special[RandomNumberGenerator.GetInt32(special.Length)];

        for (var i = 4; i < chars.Length; i++)
            chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

        // Shuffle so the guaranteed characters aren't always in the same positions.
        for (var i = chars.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return new string(chars);
    }
}
