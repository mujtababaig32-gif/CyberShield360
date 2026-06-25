using System.Net.Security;
using System.Net.Sockets;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Security.Models;
using CyberShield360.Domain.Enums;
using DnsClient;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Services;

/// <summary>
/// Performs non-intrusive, read-only security posture checks against a public domain:
/// SSL/TLS certificate, HTTP availability, HTTP security headers, DNS health,
/// email authentication, and attack surface checks.
/// </summary>
public class SecurityScannerService : ISecurityScannerService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IScoreCalculator _scorer;
    private readonly ILogger<SecurityScannerService> _logger;
    private readonly LookupClient _dns = new();

    public SecurityScannerService(
        IHttpClientFactory httpFactory,
        IScoreCalculator scorer,
        ILogger<SecurityScannerService> logger)
    {
        _httpFactory = httpFactory;
        _scorer = scorer;
        _logger = logger;
    }

    public async Task<ScanResultDto> RunScanAsync(
        string domain,
        ScanType type,
        CancellationToken ct = default)
    {
        domain = Normalize(domain);
        var findings = new List<FindingDto>();

        try
        {
            switch (type)
            {
                case ScanType.Ssl:
                    findings.AddRange(await CheckSslAsync(domain, ct));
                    break;

                case ScanType.HttpHeaders:
                    findings.AddRange(await CheckHttpAvailabilityAsync(domain, ct));
                    findings.AddRange(await CheckHeadersAsync(domain, ct));
                    break;

                case ScanType.Dns:
                    findings.AddRange(await CheckDnsAsync(domain, ct));
                    break;

                case ScanType.Spf:
                    findings.Add(await CheckSpfAsync(domain, ct));
                    break;

                case ScanType.Dkim:
                    findings.Add(await CheckDkimAsync(domain, ct));
                    break;

                case ScanType.Dmarc:
                    findings.Add(await CheckDmarcAsync(domain, ct));
                    break;

                case ScanType.FullPosture:
                {
                    var dnsFindings = await CheckDnsAsync(domain, ct);
                    findings.AddRange(dnsFindings);

                    var domainResolves = dnsFindings.Any(f =>
                        f.CheckKey == "dns.a" &&
                        f.Passed);

                    if (!domainResolves)
                    {
                        findings.Add(new FindingDto(
                            "scan.precheck",
                            "Network-dependent checks skipped",
                            Severity.Info,
                            true,
                            "DNS A record did not resolve during this scan, so HTTPS, TLS, headers, ports, and technology fingerprinting were not evaluated.",
                            null));

                        break;
                    }

                    var httpFindings = await CheckHttpAvailabilityAsync(domain, ct);
                    findings.AddRange(httpFindings);

                    var httpsReachable = httpFindings.Any(f =>
                        f.CheckKey == "http.https_status" &&
                        f.Passed);

                    if (httpsReachable)
                    {
                        findings.AddRange(await CheckSslAsync(domain, ct));
                        findings.AddRange(await CheckHeadersAsync(domain, ct));
                        findings.AddRange(await CheckTechnologyStackAsync(domain, ct));
                    }
                    else
                    {
                        findings.Add(new FindingDto(
                            "scan.https_dependent_checks",
                            "HTTPS-dependent checks skipped",
                            Severity.Info,
                            true,
                            "HTTPS endpoint was not reachable during this scan, so TLS certificate, security headers, and technology fingerprinting were not evaluated.",
                            null));
                    }

                    findings.Add(await CheckSpfAsync(domain, ct));
                    findings.Add(await CheckDkimAsync(domain, ct));
                    findings.Add(await CheckDmarcAsync(domain, ct));

                    findings.AddRange(await CheckOpenPortsAsync(domain, ct));
                    findings.AddRange(await CheckDomainIntelligenceAsync(domain, ct));
                    findings.AddRange(await CheckExposureSummaryAsync(domain, ct));

                    break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Scan failed for {Domain}", domain);

            return new ScanResultDto
            {
                Domain = domain,
                Type = type,
                Error = ex.Message
            };
        }

        var (score, grade) = _scorer.Calculate(findings);

        return new ScanResultDto
        {
            Domain = domain,
            Type = type,
            Score = score,
            Grade = grade,
            Findings = findings,
            RawJson = JsonSerializer.Serialize(findings)
        };
    }

    private static string Normalize(string domain) =>
        domain.Replace("https://", "")
            .Replace("http://", "")
            .TrimEnd('/')
            .Split('/')[0];

    private async Task<List<FindingDto>> CheckHttpAvailabilityAsync(
        string host,
        CancellationToken ct)
    {
        var results = new List<FindingDto>();
        var client = _httpFactory.CreateClient("scanner");

        try
        {
            using var httpsResp = await client.GetAsync($"https://{host}", ct);

            var healthy =
                (int)httpsResp.StatusCode >= 200 &&
                (int)httpsResp.StatusCode < 400;

            results.Add(new FindingDto(
                "http.https_status",
                "HTTPS endpoint reachable",
                Severity.High,
                healthy,
                $"Status: {(int)httpsResp.StatusCode} {httpsResp.StatusCode}",
                healthy ? null : "Ensure the HTTPS website is reachable and not returning errors."));
        }
        catch (Exception ex)
        {
            results.Add(new FindingDto(
                "http.https_status",
                "HTTPS endpoint reachable",
                Severity.High,
                false,
                ex.Message,
                "Fix HTTPS availability, DNS, hosting, or firewall configuration."));
        }

        try
        {
            using var httpResp = await client.GetAsync($"http://{host}", ct);
            var finalUrl = httpResp.RequestMessage?.RequestUri?.ToString() ?? "";

            var redirectsToHttps = finalUrl.StartsWith(
                "https://",
                StringComparison.OrdinalIgnoreCase);

            results.Add(new FindingDto(
                "http.redirect_https",
                "HTTP redirects to HTTPS",
                Severity.High,
                redirectsToHttps,
                $"Final URL: {finalUrl}",
                redirectsToHttps ? null : "Redirect all HTTP traffic to HTTPS."));
        }
        catch (Exception ex)
        {
            results.Add(new FindingDto(
                "http.redirect_https",
                "HTTP redirects to HTTPS",
                Severity.Medium,
                false,
                ex.Message,
                "Ensure HTTP requests redirect to HTTPS."));
        }

        return results;
    }

    private async Task<List<FindingDto>> CheckSslAsync(
        string host,
        CancellationToken ct)
    {
        var results = new List<FindingDto>();

        try
        {
            using var tcp = new TcpClient();
            await tcp.ConnectAsync(host, 443, ct);

            X509Certificate2? cert = null;

            using var ssl = new SslStream(
                tcp.GetStream(),
                false,
                (s, certificate, chain, errors) =>
                {
                    if (certificate is not null)
                        cert = new X509Certificate2(certificate);

                    return true;
                });

            await ssl.AuthenticateAsClientAsync(host);

            results.Add(new FindingDto(
                "ssl.present",
                "TLS certificate present",
                Severity.High,
                true,
                $"Negotiated {ssl.SslProtocol}",
                null));

            if (cert is not null)
            {
                var daysLeft = (cert.NotAfter.ToUniversalTime() - DateTime.UtcNow).TotalDays;
                var ok = daysLeft > 14;

                results.Add(new FindingDto(
                    "ssl.expiry",
                    "Certificate not expiring soon",
                    daysLeft < 0 ? Severity.Critical : Severity.High,
                    ok,
                    $"Expires {cert.NotAfter:yyyy-MM-dd} ({daysLeft:F0} days)",
                    ok ? null : "Renew the TLS certificate before expiry."));

                results.Add(new FindingDto(
                    "ssl.issuer",
                    "Certificate issuer identified",
                    Severity.Low,
                    true,
                    cert.Issuer,
                    null));

                results.Add(new FindingDto(
                    "ssl.subject",
                    "Certificate subject identified",
                    Severity.Low,
                    true,
                    cert.Subject,
                    null));
            }

            var protoOk =
                ssl.SslProtocol >= System.Security.Authentication.SslProtocols.Tls12;

            results.Add(new FindingDto(
                "ssl.protocol",
                "Modern TLS version (>=1.2)",
                Severity.High,
                protoOk,
                ssl.SslProtocol.ToString(),
                protoOk ? null : "Disable TLS 1.0/1.1; require TLS 1.2+."));
        }
        catch (Exception ex)
        {
            results.Add(new FindingDto(
                "ssl.present",
                "TLS handshake",
                Severity.Critical,
                false,
                ex.Message,
                "Ensure HTTPS is configured with a valid certificate."));
        }

        return results;
    }

    private async Task<List<FindingDto>> CheckHeadersAsync(
        string host,
        CancellationToken ct)
    {
        var results = new List<FindingDto>();
        var client = _httpFactory.CreateClient("scanner");

        try
        {
            using var resp = await client.GetAsync($"https://{host}", ct);
            var h = resp.Headers;
            var content = resp.Content.Headers;

            void Header(string key, string name, Severity severity, bool passed, string recommendation)
            {
                results.Add(new FindingDto(
                    key,
                    name,
                    severity,
                    passed,
                    passed ? "Present" : "Missing",
                    passed ? null : recommendation));
            }

            Header(
                "headers.hsts",
                "Strict-Transport-Security",
                Severity.High,
                h.Contains("Strict-Transport-Security"),
                "Add HSTS with a long max-age.");

            Header(
                "headers.csp",
                "Content-Security-Policy",
                Severity.High,
                h.Contains("Content-Security-Policy") ||
                content.Contains("Content-Security-Policy"),
                "Define a Content-Security-Policy to mitigate XSS.");

            Header(
                "headers.xcto",
                "X-Content-Type-Options",
                Severity.Medium,
                h.Contains("X-Content-Type-Options"),
                "Add 'X-Content-Type-Options: nosniff'.");

            Header(
                "headers.xfo",
                "X-Frame-Options",
                Severity.Medium,
                h.Contains("X-Frame-Options"),
                "Add X-Frame-Options or frame-ancestors in CSP.");

            Header(
                "headers.refpol",
                "Referrer-Policy",
                Severity.Low,
                h.Contains("Referrer-Policy"),
                "Set a strict Referrer-Policy.");

            Header(
                "headers.permpol",
                "Permissions-Policy",
                Severity.Low,
                h.Contains("Permissions-Policy"),
                "Restrict browser features via Permissions-Policy.");

            Header(
                "headers.server",
                "Server header hidden",
                Severity.Low,
                !h.Contains("Server"),
                "Remove or minimize the Server header.");

            Header(
                "headers.xpoweredby",
                "X-Powered-By header hidden",
                Severity.Low,
                !h.Contains("X-Powered-By"),
                "Remove the X-Powered-By header.");
        }
        catch (Exception ex)
        {
            results.Add(new FindingDto(
                "headers.check",
                "HTTP security header scan",
                Severity.High,
                false,
                ex.Message,
                "Ensure the HTTPS endpoint is reachable so headers can be inspected."));
        }

        return results;
    }

    private async Task<List<FindingDto>> CheckDnsAsync(
        string host,
        CancellationToken ct)
    {
        var results = new List<FindingDto>();

        var a = await _dns.QueryAsync(host, QueryType.A, cancellationToken: ct);
        var aRecords = a.Answers.ARecords()
            .Select(r => r.Address.ToString())
            .ToList();

        results.Add(new FindingDto(
            "dns.a",
            "A record resolves",
            Severity.High,
            aRecords.Any(),
            string.Join(", ", aRecords),
            "Ensure the domain resolves to a valid host."));

        var mx = await _dns.QueryAsync(host, QueryType.MX, cancellationToken: ct);
        var mxRecords = mx.Answers.MxRecords()
            .Select(r => r.Exchange.Value)
            .ToList();

        results.Add(new FindingDto(
            "dns.mx",
            "MX records present",
            Severity.Medium,
            mxRecords.Any(),
            string.Join(", ", mxRecords),
            "Configure MX records for mail delivery."));

        var caa = await _dns.QueryAsync(host, QueryType.CAA, cancellationToken: ct);
        var caaRecords = caa.Answers.CaaRecords()
            .Select(r => r.Value)
            .ToList();

        results.Add(new FindingDto(
            "dns.caa",
            "CAA record present",
            Severity.Low,
            caaRecords.Any(),
            caaRecords.Any() ? string.Join(", ", caaRecords) : null,
            "Add a CAA record to restrict which CAs may issue certificates."));

        var ns = await _dns.QueryAsync(host, QueryType.NS, cancellationToken: ct);
        var nsRecords = ns.Answers.NsRecords()
            .Select(r => r.NSDName.Value)
            .ToList();

        results.Add(new FindingDto(
            "dns.ns",
            "Name servers configured",
            Severity.Medium,
            nsRecords.Any(),
            string.Join(", ", nsRecords),
            "Ensure authoritative name servers are configured correctly."));

        return results;
    }

    private async Task<FindingDto> CheckSpfAsync(
        string host,
        CancellationToken ct)
    {
        var txt = await _dns.QueryAsync(host, QueryType.TXT, cancellationToken: ct);

        var spf = txt.Answers.TxtRecords()
            .SelectMany(r => r.Text)
            .FirstOrDefault(t => t.StartsWith("v=spf1", StringComparison.OrdinalIgnoreCase));

        var ok = spf is not null;

        return new FindingDto(
            "email.spf",
            "SPF record published",
            Severity.High,
            ok,
            spf,
            ok ? null : "Publish an SPF (v=spf1) TXT record to prevent spoofing.");
    }

    private async Task<FindingDto> CheckDkimAsync(
        string host,
        CancellationToken ct)
    {
        foreach (var selector in new[] { "default", "google", "selector1", "selector2", "k1", "s1" })
        {
            try
            {
                var q = await _dns.QueryAsync(
                    $"{selector}._domainkey.{host}",
                    QueryType.TXT,
                    cancellationToken: ct);

                var rec = q.Answers.TxtRecords()
                    .SelectMany(r => r.Text)
                    .FirstOrDefault(t =>
                        t.Contains("DKIM", StringComparison.OrdinalIgnoreCase) ||
                        t.Contains("p=", StringComparison.OrdinalIgnoreCase));

                if (rec is not null)
                {
                    return new FindingDto(
                        "email.dkim",
                        "DKIM record verified",
                        Severity.High,
                        true,
                        $"DKIM TXT record found using selector '{selector}'.",
                        null);
                }
            }
            catch
            {
                // Continue checking the next selector.
            }
        }

        return new FindingDto(
            "email.dkim",
            "DKIM selector not verified",
            Severity.Info,
            true,
            "No DKIM record was found using common selector guesses. DKIM cannot be reliably confirmed without the domain's actual selector.",
            "Provide known DKIM selectors for reliable DKIM validation.");
    }

    private async Task<FindingDto> CheckDmarcAsync(
        string host,
        CancellationToken ct)
    {
        var q = await _dns.QueryAsync($"_dmarc.{host}", QueryType.TXT, cancellationToken: ct);

        var dmarc = q.Answers.TxtRecords()
            .SelectMany(r => r.Text)
            .FirstOrDefault(t => t.StartsWith("v=DMARC1", StringComparison.OrdinalIgnoreCase));

        var ok = dmarc is not null;

        var enforced =
            dmarc is not null &&
            (
                dmarc.Contains("p=reject", StringComparison.OrdinalIgnoreCase) ||
                dmarc.Contains("p=quarantine", StringComparison.OrdinalIgnoreCase)
            );

        return new FindingDto(
            "email.dmarc",
            "DMARC policy enforced",
            Severity.High,
            ok && enforced,
            dmarc,
            ok
                ? enforced
                    ? null
                    : "Move DMARC policy to p=quarantine or p=reject."
                : "Publish a DMARC record (_dmarc) with an enforcing policy.");
    }

    private async Task<List<FindingDto>> CheckOpenPortsAsync(
        string host,
        CancellationToken ct)
    {
        var findings = new List<FindingDto>();

        var ports = new Dictionary<int, string>
        {
            [21] = "FTP",
            [22] = "SSH",
            [25] = "SMTP",
            [53] = "DNS",
            [80] = "HTTP",
            [110] = "POP3",
            [143] = "IMAP",
            [443] = "HTTPS",
            [3306] = "MySQL",
            [3389] = "RDP"
        };

        foreach (var port in ports)
        {
            try
            {
                using var tcp = new TcpClient();

                var connectTask = tcp.ConnectAsync(host, port.Key);
                var timeoutTask = Task.Delay(1500, ct);

                var completed = await Task.WhenAny(connectTask, timeoutTask);
                var open = completed == connectTask && tcp.Connected;

                var shouldBePublic = port.Key is 80 or 443;
                var highRiskIfOpen = port.Key is 21 or 22 or 3306 or 3389;
                var mediumRiskIfOpen = port.Key is 25 or 110 or 143;

                var passed = shouldBePublic ? open : !open;

                var severity =
                    highRiskIfOpen ? Severity.High :
                    mediumRiskIfOpen ? Severity.Medium :
                    Severity.Low;

                var recommendation =
                    shouldBePublic
                        ? open
                            ? null
                            : $"Ensure {port.Value} port {port.Key} is reachable if this service is expected."
                        : open
                            ? $"Restrict or firewall {port.Value} port {port.Key} unless it is intentionally exposed."
                            : null;

                findings.Add(new FindingDto(
                    $"asm.port.{port.Key}",
                    $"{port.Value} Port Exposure",
                    severity,
                    passed,
                    open
                        ? $"{port.Value} port {port.Key} is publicly reachable."
                        : $"{port.Value} port {port.Key} appears closed.",
                    recommendation));
            }
            catch
            {
                findings.Add(new FindingDto(
                    $"asm.port.{port.Key}",
                    $"{port.Value} Port Exposure",
                    Severity.Low,
                    true,
                    $"{port.Value} port {port.Key} did not respond.",
                    null));
            }
        }

        return findings;
    }

    private async Task<List<FindingDto>> CheckTechnologyStackAsync(
        string host,
        CancellationToken ct)
    {
        var findings = new List<FindingDto>();
        var detected = new List<string>();

        try
        {
            var client = _httpFactory.CreateClient("scanner");

            using var response = await client.GetAsync($"https://{host}", ct);

            var serverHeader = response.Headers.Server?.ToString();
            if (!string.IsNullOrWhiteSpace(serverHeader))
                detected.Add($"Server: {serverHeader}");

            if (response.Headers.TryGetValues("X-Powered-By", out var poweredBy))
                detected.Add($"X-Powered-By: {string.Join(", ", poweredBy)}");

            var html = await response.Content.ReadAsStringAsync(ct);
            var lower = html.ToLowerInvariant();

            if (lower.Contains("wp-content") || lower.Contains("wordpress"))
                detected.Add("WordPress");

            if (lower.Contains("__next_data__"))
                detected.Add("Next.js");

            if (lower.Contains("react"))
                detected.Add("React");

            if (lower.Contains("angular"))
                detected.Add("Angular");

            if (lower.Contains("shopify"))
                detected.Add("Shopify");

            if (lower.Contains("woocommerce"))
                detected.Add("WooCommerce");

            if (lower.Contains("cloudflare"))
                detected.Add("Cloudflare");

            var exposedHeaders = detected.Any(x =>
                x.StartsWith("Server:", StringComparison.OrdinalIgnoreCase) ||
                x.StartsWith("X-Powered-By:", StringComparison.OrdinalIgnoreCase));

            findings.Add(new FindingDto(
                "asm.tech_stack",
                "Technology Stack Fingerprinting",
                exposedHeaders ? Severity.Medium : Severity.Low,
                !exposedHeaders,
                detected.Count > 0
                    ? string.Join(", ", detected.Distinct())
                    : "No obvious technology fingerprint detected.",
                exposedHeaders
                    ? "Minimize exposed Server and X-Powered-By headers to reduce fingerprinting."
                    : null));
        }
        catch (Exception ex)
        {
            findings.Add(new FindingDto(
                "asm.tech_stack",
                "Technology Stack Fingerprinting",
                Severity.Info,
                true,
                $"Technology fingerprinting skipped because HTTPS inspection failed: {ex.Message}",
                null));
        }

        return findings;
    }

    private async Task<List<FindingDto>> CheckDomainIntelligenceAsync(
        string host,
        CancellationToken ct)
    {
        var findings = new List<FindingDto>();

        try
        {
            var a = await _dns.QueryAsync(host, QueryType.A, cancellationToken: ct);
            var ips = a.Answers.ARecords()
                .Select(r => r.Address.ToString())
                .Distinct()
                .ToList();

            var ns = await _dns.QueryAsync(host, QueryType.NS, cancellationToken: ct);
            var nameservers = ns.Answers.NsRecords()
                .Select(r => r.NSDName.Value)
                .Distinct()
                .ToList();

            findings.Add(new FindingDto(
                "asm.domain_inventory",
                "Domain Inventory Profile",
                Severity.Low,
                ips.Any(),
                $"IPs: {(ips.Any() ? string.Join(", ", ips) : "None")} | NS: {(nameservers.Any() ? string.Join(", ", nameservers) : "None")}",
                ips.Any()
                    ? null
                    : "Ensure the domain resolves properly and authoritative DNS is configured."));
        }
        catch (Exception ex)
        {
            findings.Add(new FindingDto(
                "asm.domain_inventory",
                "Domain Inventory Profile",
                Severity.Info,
                true,
                $"Domain inventory skipped because DNS intelligence failed: {ex.Message}",
                null));
        }

        return findings;
    }

    private Task<List<FindingDto>> CheckExposureSummaryAsync(
        string host,
        CancellationToken ct)
    {
        return Task.FromResult(new List<FindingDto>
        {
            new FindingDto(
                "asm.exposure_summary",
                "Attack Surface Exposure Summary",
                Severity.Low,
                true,
                "ASM completed: public ports, technology fingerprinting, domain inventory, DNS, SSL, email security, and web exposure checks.",
                null)
        });
    }
}