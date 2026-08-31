using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

// This controller serves the public, pre-login "sign up a new company" flow, so it
// must stay reachable without an existing session or tenant context. It only
// supplies display content (plan tiers, step labels) for the wizard — actual
// account creation goes through AuthController.Register, the same endpoint
// used by every other real signup path.
[AllowAnonymous]
public class TenantRegistrationController : ApiControllerBase
{
    [HttpGet("summary")]
    public IActionResult Summary()
    {
        // Names match SubscriptionPlan exactly so what a tenant picks here is
        // what shows up later in SaaS Admin — no silent renaming in between.
        var plans = new[]
        {
            new
            {
                name = "Starter",
                price = 49,
                description = "For small teams starting security monitoring.",
                assets = 25,
                users = 3,
                scans = 50
            },
            new
            {
                name = "Professional",
                price = 149,
                description = "For growing companies needing full cyber visibility.",
                assets = 100,
                users = 10,
                scans = 250
            },
            new
            {
                name = "Enterprise",
                price = 399,
                description = "For mature teams managing multiple assets and compliance.",
                assets = 500,
                users = 25,
                scans = 1000
            },
            new
            {
                name = "Agency",
                price = 999,
                description = "For MSSPs and consultancies managing security for multiple clients.",
                assets = 5000,
                users = 100,
                scans = 10000
            }
        };

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            signupStatus = "Ready",
            tenantCreation = "Available",
            adminCreation = "Available",
            planSelection = "Available",
            paymentStatus = "Free 14-day trial — no card required",
            plans,
            steps = new[]
            {
                new { step = 1, name = "Company Details", status = "Available" },
                new { step = 2, name = "Admin User", status = "Available" },
                new { step = 3, name = "Plan Selection", status = "Available" },
                new { step = 4, name = "Review & Create", status = "Available" },
                new { step = 5, name = "Workspace Launch", status = "Available" }
            },
            recommendations = new[]
            {
                "Use a company email domain for the admin account to simplify future SSO setup.",
                "The selected plan sets your workspace's asset, user, and scan limits for the trial.",
                "You can invite teammates and add assets as soon as the workspace launches."
            }
        });
    }
}
