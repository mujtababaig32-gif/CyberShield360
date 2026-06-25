using CyberShield360.Application.Features.Brand.Commands;
using CyberShield360.Application.Features.Brand.Queries;
using CyberShield360.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

[Authorize]
public class BrandController : ApiControllerBase
{
    [HttpGet("alerts")]
    public async Task<IActionResult> Alerts([FromQuery] AlertStatus? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await Mediator.Send(new GetBrandAlertsQuery(status, page, pageSize)));

    [HttpPut("alerts/{id:guid}/status")]
    [Authorize(Roles = "TenantAdmin,SecurityAnalyst")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] AlertStatusBody body)
        => Ok(await Mediator.Send(new UpdateAlertStatusCommand(id, body.Status)));
}

public record AlertStatusBody(AlertStatus Status);
