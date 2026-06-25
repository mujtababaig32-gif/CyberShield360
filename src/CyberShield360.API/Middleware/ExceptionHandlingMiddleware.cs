using System.Net;
using System.Text.Json;
using CyberShield360.Application.Common.Exceptions;
using FluentValidation;

namespace CyberShield360.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    { _next = next; _logger = logger; }

    public async Task InvokeAsync(HttpContext context)
    {
        try { await _next(context); }
        catch (ValidationException ex)
        {
            await Write(context, HttpStatusCode.BadRequest, "Validation failed",
                ex.Errors.Select(e => e.ErrorMessage));
        }
        catch (NotFoundException ex)
        {
            await Write(context, HttpStatusCode.NotFound, ex.Message, null);
        }
        catch (ForbiddenAccessException ex)
        {
            await Write(context, HttpStatusCode.Forbidden, ex.Message, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await Write(context, HttpStatusCode.InternalServerError, "An unexpected error occurred.", null);
        }
    }

    private static async Task Write(HttpContext ctx, HttpStatusCode code, string message, IEnumerable<string>? errors)
    {
        ctx.Response.ContentType = "application/json";
        ctx.Response.StatusCode = (int)code;
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = (int)code, message, errors = errors?.ToArray()
        }));
    }
}
