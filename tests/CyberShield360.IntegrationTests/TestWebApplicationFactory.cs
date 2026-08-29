using Microsoft.AspNetCore.Mvc.Testing;

namespace CyberShield360.IntegrationTests;

/// <summary>
/// Boots the API with a valid, test-only JWT secret so the startup guard against a
/// missing/placeholder Jwt:Secret (see DependencyInjection.AddInfrastructure) doesn't
/// reject the test host the way it correctly rejects a real deployment's appsettings.json.
///
/// This has to be an environment variable rather than a WebApplicationFactory
/// ConfigureAppConfiguration override: for the minimal-hosting-model Program.cs,
/// WebApplicationFactory only injects its config overrides at WebApplicationBuilder.Build()
/// time, which is too late for a check that reads configuration eagerly during
/// service registration (AddInfrastructure runs before Build() is called).
/// </summary>
public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    static TestWebApplicationFactory()
    {
        Environment.SetEnvironmentVariable(
            "Jwt__Secret", "integration-test-only-secret-value-not-used-in-production-32c");
    }
}
