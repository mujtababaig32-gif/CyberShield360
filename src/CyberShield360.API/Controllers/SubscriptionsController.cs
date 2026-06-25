using CyberShield360.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberShield360.API.Controllers;

public class SubscriptionsController : ApiControllerBase
{
    private readonly ILemonSqueezyService _lemonSqueezy;
    private readonly ICurrentUser _user;

    public SubscriptionsController(
        ILemonSqueezyService lemonSqueezy,
        ICurrentUser user)
    {
        _lemonSqueezy = lemonSqueezy;
        _user = user;
    }

    [Authorize(Roles = "TenantAdmin")]
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] LemonSqueezyCheckoutRequest req)
    {
        if (_user.TenantId is not Guid tid)
            return Unauthorized();

        var url = await _lemonSqueezy.CreateCheckoutSessionAsync(
            tid,
            req.SuccessUrl,
            req.CancelUrl,
            _user.Email);

        return Ok(new { url });
    }

    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();
        var signature = Request.Headers["X-Signature"].ToString();

        await _lemonSqueezy.HandleWebhookAsync(payload, signature);

        return Ok();
    }
}

public record LemonSqueezyCheckoutRequest(string SuccessUrl, string CancelUrl);