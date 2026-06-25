using CyberShield360.API.Middleware;
using CyberShield360.Application;
using CyberShield360.Infrastructure;
using CyberShield360.Infrastructure.Persistence;
using CyberShield360.Infrastructure.Services;
using Hangfire;
using CyberShield360.API.Security;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ---- Serilog ----
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/cybershield-.log", rollingInterval: RollingInterval.Day));

// ---- Layers ----
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var corsOrigins = builder.Configuration
    .GetSection("Cors:Origins")
    .Get<string[]>()?
    .Where(x => !string.IsNullOrWhiteSpace(x))
    .Select(x => x.Trim().TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray() ?? Array.Empty<string>();

builder.Services.AddCors(o => o.AddPolicy("default", p =>
{
    if (corsOrigins.Contains("*"))
    {
        p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    }
    else if (corsOrigins.Length > 0)
    {
        p.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod();
    }
    else
    {
        p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod();
    }
}));

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "CyberShield360 By Mujtaba API", Version = "v1",
        Description = "Multi-tenant cybersecurity posture, scanning, and risk management platform."
    });
    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization", Type = SecuritySchemeType.Http, Scheme = "bearer",
        BearerFormat = "JWT", In = ParameterLocation.Header,
        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
    };
    c.AddSecurityDefinition("Bearer", scheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { [scheme] = Array.Empty<string>() });
});

var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "CyberShield360 By Mujtaba v1"));
}

app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseHttpsRedirection();
app.UseCors("default");
app.UseAuthentication();
app.UseMiddleware<TenantResolutionMiddleware>();
app.UseAuthorization();
app.UseMiddleware<AuditLoggingMiddleware>();
// Hangfire dashboard (protected; see HangfireDashboardAuthFilter)
app.UseHangfireDashboard("/jobs", new DashboardOptions
{
    Authorization = new[] { new HangfireDashboardAuthFilter() }
});

// Register recurring jobs at startup
using (var scope = app.Services.CreateScope())
{
    var recurring = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    RecurringJobRegistrar.Register(recurring);
}

app.MapGet("/", () => Results.Ok(new
{
    name = "CyberShield360 API",
    status = "Running",
    version = "1.0",
    swagger = "/swagger",
    message = "CyberShield360 backend API is live."
}));

app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "CyberShield360 API",
    timeUtc = DateTime.UtcNow
}));

app.MapControllers();

app.Run();

public partial class Program { } // for integration tests (WebApplicationFactory)
