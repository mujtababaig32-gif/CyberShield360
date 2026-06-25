using CyberShield360.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

[Authorize]
public class MicrosoftAuthController : ApiControllerBase
{
    private readonly ICurrentUser _user;

    public MicrosoftAuthController(ICurrentUser user)
    {
        _user = user;
    }

    [HttpGet("summary")]
    public IActionResult Summary()
    {
        if (_user.TenantId is not Guid)
            return Unauthorized();

        return Ok(new
        {
            generatedUtc = DateTime.UtcNow,

            provider = "Microsoft Entra ID",

            configuration = new
            {
                tenantId = "Not Configured",
                clientId = "Not Configured",
                redirectUri = "Not Configured",
                status = "Pending"
            },

            capabilities = new[]
            {
                "Single Sign-On",
                "Microsoft 365 Authentication",
                "Automatic User Provisioning",
                "Role Mapping",
                "Conditional Access",
                "Multi-Factor Authentication"
            },

            readiness = new[]
            {
                new { item = "Azure App Registration", status = "Pending" },
                new { item = "Client ID", status = "Pending" },
                new { item = "Tenant ID", status = "Pending" },
                new { item = "Redirect URI", status = "Pending" },
                new { item = "User Sync", status = "Pending" }
            },

            recommendations = new[]
            {
                "Create Azure App Registration.",
                "Configure Client ID and Tenant ID.",
                "Enable Microsoft login on sign-in page.",
                "Map Entra groups to CyberShield roles."
            }
        });
    }
}