namespace CyberShield360.Application.Features.Auth.Dtos;

public record RegisterTenantRequest(string TenantName, string Email, string Password, string FullName);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresUtc,
    Guid TenantId, string Email, string[] Roles);
