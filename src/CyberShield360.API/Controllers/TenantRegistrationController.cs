using CyberShield360.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

[Authorize]
public class TenantRegistrationController : ApiControllerBase
{
    private readonly ICurrentUser _user;

    public TenantRegistrationController(ICurrentUser user)
    {
        _user = user;
    }

    [HttpGet("summary")]
    public IActionResult Summary()
    {
        if (_user.TenantId is not Guid)
            return Unauthorized();

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
                name = "Growth",
                price = 149,
                description = "For growing companies needing full cyber visibility.",
                assets = 100,
                users = 10,
                scans = 250
            },
            new
            {
                name = "Business",
                price = 399,
                description = "For mature teams managing multiple assets and compliance.",
                assets = 500,
                users = 25,
                scans = 1000
            },
            new
            {
                name = "Enterprise",
                price = 999,
                description = "For enterprises needing advanced controls and scale.",
                assets = 5000,
                users = 100,
                scans = 10000
            }
        };

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,
            signupStatus = "Ready for UI",
            tenantCreation = "Available",
            adminCreation = "Available",
            planSelection = "Available",
            paymentStatus = "Stripe Pending",
            plans,
            steps = new[]
            {
                new { step = 1, name = "Company Details", status = "Available" },
                new { step = 2, name = "Admin User", status = "Available" },
                new { step = 3, name = "Plan Selection", status = "Available" },
                new { step = 4, name = "Payment Setup", status = "Pending Stripe" },
                new { step = 5, name = "Workspace Launch", status = "Available" }
            },
            recommendations = new[]
            {
                "Add public registration page outside protected routes.",
                "Create tenant and admin user in one transaction.",
                "Connect selected plan to Stripe checkout.",
                "Send welcome email after registration.",
                "Redirect new tenant admin to onboarding dashboard."
            }
        });
    }

    public record TenantRegistrationRequest(
        string CompanyName,
        string AdminName,
        string AdminEmail,
        string Plan
    );

    [HttpPost("preview")]
    public IActionResult Preview([FromBody] TenantRegistrationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CompanyName))
            return BadRequest("Company name is required.");

        if (string.IsNullOrWhiteSpace(request.AdminEmail))
            return BadRequest("Admin email is required.");

        return Ok(new
        {
            message = "Tenant registration preview created.",
            company = request.CompanyName,
            admin = request.AdminName,
            email = request.AdminEmail,
            selectedPlan = request.Plan,
            nextStep = "In production, this will create tenant, admin user, Stripe checkout, and onboarding workspace.",
            previewTenantId = Guid.NewGuid(),
            createdUtc = DateTime.UtcNow
        });
    }
}