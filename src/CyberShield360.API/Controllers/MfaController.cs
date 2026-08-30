using System.Text;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using QRCoder;

namespace CyberShield360.API.Controllers;

[Authorize]
public class MfaController : ApiControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly ICurrentUser _currentUser;

    public MfaController(UserManager<ApplicationUser> users, ICurrentUser currentUser)
    {
        _users = users;
        _currentUser = currentUser;
    }

    public record MfaSetupResponse(string ManualEntryKey, string QrCodePngBase64, string OtpAuthUri);

    [HttpPost("setup")]
    public async Task<IActionResult> Setup()
    {
        if (_currentUser.UserId is not Guid uid) return Unauthorized();

        var user = await _users.FindByIdAsync(uid.ToString());
        if (user is null) return Unauthorized();

        if (user.TwoFactorEnabled)
            return BadRequest(new { message = "MFA is already enabled. Disable it first to re-enroll." });

        // Always issue a fresh key on (re-)setup so an abandoned enrollment attempt
        // can't leave a guessable half-configured secret lying around.
        await _users.ResetAuthenticatorKeyAsync(user);
        var key = await _users.GetAuthenticatorKeyAsync(user);

        const string issuer = "CyberShield360";
        var label = Uri.EscapeDataString($"{issuer}:{user.Email}");
        var otpAuthUri = $"otpauth://totp/{label}?secret={key}&issuer={Uri.EscapeDataString(issuer)}&digits=6";

        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(otpAuthUri, QRCodeGenerator.ECCLevel.Q);
        var pngQrCode = new PngByteQRCode(qrCodeData);
        var qrBytes = pngQrCode.GetGraphic(10);

        return Ok(new MfaSetupResponse(
            FormatKeyForDisplay(key!),
            Convert.ToBase64String(qrBytes),
            otpAuthUri));
    }

    public record MfaVerifyRequest(string Code);

    [HttpPost("verify")]
    public async Task<IActionResult> Verify([FromBody] MfaVerifyRequest req)
    {
        if (_currentUser.UserId is not Guid uid) return Unauthorized();

        var user = await _users.FindByIdAsync(uid.ToString());
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Code))
            return BadRequest(new { message = "Enter the 6-digit code from your authenticator app." });

        var valid = await _users.VerifyTwoFactorTokenAsync(
            user, TokenOptions.DefaultAuthenticatorProvider, req.Code.Replace(" ", ""));

        if (!valid)
            return BadRequest(new { message = "That code did not match. Check your authenticator app and try again." });

        await _users.SetTwoFactorEnabledAsync(user, true);
        var recoveryCodes = await _users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);

        return Ok(new
        {
            enabled = true,
            recoveryCodes,
            message = "Save these recovery codes now — each one can be used once if you lose access to your authenticator app. They will not be shown again."
        });
    }

    public record MfaDisableRequest(string? Password);

    [HttpPost("disable")]
    public async Task<IActionResult> Disable([FromBody] MfaDisableRequest req)
    {
        if (_currentUser.UserId is not Guid uid) return Unauthorized();

        var user = await _users.FindByIdAsync(uid.ToString());
        if (user is null) return Unauthorized();

        // OAuth-only accounts have no password to re-check; the authenticated
        // session itself is the only factor available for those.
        var hasPassword = await _users.HasPasswordAsync(user);
        if (hasPassword && !await _users.CheckPasswordAsync(user, req.Password ?? string.Empty))
            return Unauthorized(new { message = "Incorrect password." });

        await _users.SetTwoFactorEnabledAsync(user, false);
        await _users.ResetAuthenticatorKeyAsync(user);

        return Ok(new { enabled = false });
    }

    private static string FormatKeyForDisplay(string key)
    {
        // Group into 4-character blocks, matching how most authenticator apps show a manual-entry key.
        var sb = new StringBuilder();
        for (var i = 0; i < key.Length; i += 4)
        {
            if (i > 0) sb.Append(' ');
            sb.Append(key, i, Math.Min(4, key.Length - i));
        }
        return sb.ToString();
    }
}
