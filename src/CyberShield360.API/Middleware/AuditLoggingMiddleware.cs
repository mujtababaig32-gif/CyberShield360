using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Domain.Entities;
using CyberShield360.Domain.Enums;
using CyberShield360.Infrastructure.Persistence;

namespace CyberShield360.API.Middleware;

/// <summary>Records mutating requests (POST/PUT/DELETE) into the audit trail.</summary>
public class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    public AuditLoggingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext db, ICurrentUser user)
    {
        await _next(context);

        var method = context.Request.Method;
        if (user.IsAuthenticated && (method is "POST" or "PUT" or "DELETE" or "PATCH")
            && context.Response.StatusCode < 400)
        {
            db.AuditLogs.Add(new AuditLog
            {
                TenantId = user.TenantId,
                UserId = user.UserId?.ToString(),
                UserEmail = user.Email,
                Action = method switch
                {
                    "POST" => AuditAction.Create,
                    "DELETE" => AuditAction.Delete,
                    _ => AuditAction.Update
                },
                EntityType = context.Request.Path.Value ?? "unknown",
                Description = $"{method} {context.Request.Path}",
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                UserAgent = context.Request.Headers.UserAgent.ToString()
            });
            await db.SaveChangesAsync();
        }
    }
}
