using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Text.RegularExpressions;
using CyberShield360.Application.Common.Interfaces;
using CyberShield360.Application.Security.Models;
using CyberShield360.Domain.Enums;
using DnsClient;
using Microsoft.Extensions.Logging;

namespace CyberShield360.Infrastructure.Services;

/// <summary>
/// Performs non-intrusive, read-only security posture checks against a public domain:
/// SSL/TLS certificate, HTTP availability, HTTP security headers, DNS health,
/// email authentication, technology fingerprinting, and public exposure checks.
/// </summary>
public class SecurityScannerService : ISecurityScannerService
{
    private static readonly string[] CommonDkimSelectors =
    [
        "default",
        "google",
        "selector1",
        "selector2",
        "k1",
        "s1",
        "s2",
        "mail",
        "smtp",
        "dkim",
        "mandrill",
        "sendgrid",
        "zoho",
        "mailgun",
        "amazonses",
        "protonmail",
        "mta",
        "mx",
    ];

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
                    findings.AddRange(CheckExposureSummary(domain, findings));

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

        var orderedFindings = findings
            .OrderByDescending(f => !f.Passed)
            .ThenByDescending(f => SeverityRank(f.Severity))
            .ThenBy(f => f.CheckKey)
            .ToList();

        var (score, grade) = _scorer.Calculate(orderedFindings);

        return new ScanResultDto
        {
            Domain = domain,
            Type = type,
            Score = score,
            Grade = grade,
            Findings = orderedFindings,
            RawJson = JsonSerializer.Serialize(orderedFindings)
        };
    }

    private static string Normalize(string domain)
    {
        domain = domain
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
            .Trim()
            .TrimEnd('/')
            .Split('/')[0]
            .Split('?')[0]
            .Split('#')[0]
            .ToLowerInvariant();

        if (domain.StartsWith("www.", StringComparison.OrdinalIgnoreCase))
            domain = domain[4..];

        return domain;
    }

    private static int SeverityRank(Severity severity) =>
        severity switch
        {
            Severity.Critical => 5,
            Severity.High => 4,
            Severity.Medium => 3,
            Severity.Low => 2,
            Severity.Info => 1,
            _ => 0
        };

    private static string CleanEvidence(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? "No evidence returned."
            : value.Trim();

    private static List<string> GetTxtValues(IDnsQueryResponse response) =>
        response.Answers.TxtRecords()
            .Select(r => string.Concat(r.Text))
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static string? GetTagValue(string record, string tag)
    {
        var parts = record.Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var part in parts)
        {
            var pieces = part.Split('=', 2, StringSplitOptions.TrimEntries);

            if (pieces.Length == 2 && pieces[0].Equals(tag, StringComparison.OrdinalIgnoreCase))
                return pieces[1];
        }

        return null;
    }

    private static bool HeaderExists(
        HttpResponseMessage response,
        string headerName)
    {
        return response.Headers.Contains(headerName) ||
               response.Content.Headers.Contains(headerName);
    }

    private static string? HeaderValue(
        HttpResponseMessage response,
        string headerName)
    {
        if (response.Headers.TryGetValues(headerName, out var values))
            return string.Join(", ", values);

        if (response.Content.Headers.TryGetValues(headerName, out var contentValues))
            return string.Join(", ", contentValues);

        return null;
    }

    private static FindingDto Finding(
        string key,
        string name,
        Severity severity,
        bool passed,
        string? evidence,
        string recommendation)
    {
        return new FindingDto(
            key,
            name,
            severity,
            passed,
            CleanEvidence(evidence),
            passed ? null : recommendation);
    }

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

            results.Add(Finding(
                "http.https_status",
                "HTTPS endpoint reachable",
                Severity.High,
                healthy,
                $"Status: {(int)httpsResp.StatusCode} {httpsResp.StatusCode}",
                "Ensure the HTTPS website is reachable and not returning errors."));
        }
        catch (Exception ex)
        {
            results.Add(Finding(
                "http.https_status",
                "HTTPS endpoint reachable",
                Severity.High,
                false,
                ex.Message,
                "Fix HTTPS availability, DNS, hosting, firewall, or TLS configuration."));
        }

        try
        {
            using var httpResp = await client.GetAsync($"http://{host}", ct);
            var finalUrl = httpResp.RequestMessage?.RequestUri?.ToString() ?? "";

            var redirectsToHttps = finalUrl.StartsWith(
                "https://",
                StringComparison.OrdinalIgnoreCase);

            results.Add(Finding(
                "http.redirect_https",
                "HTTP redirects to HTTPS",
                Severity.High,
                redirectsToHttps,
                $"Final URL: {finalUrl}",
                "Redirect all HTTP traffic to HTTPS."));
        }
        catch (Exception ex)
        {
            results.Add(Finding(
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
            SslPolicyErrors sslErrors = SslPolicyErrors.None;

            using var ssl = new SslStream(
                tcp.GetStream(),
                false,
                (_, certificate, _, errors) =>
                {
                    sslErrors = errors;

                    if (certificate is not null)
                        cert = new X509Certificate2(certificate);

                    return true;
                });

            await ssl.AuthenticateAsClientAsync(host);

            results.Add(Finding(
                "ssl.present",
                "TLS certificate present",
                Severity.High,
                true,
                $"Negotiated {ssl.SslProtocol}",
                "Ensure HTTPS is configured with a valid certificate."));

            var trusted = sslErrors == SslPolicyErrors.None;

            results.Add(Finding(
                "ssl.trust",
                "TLS certificate trusted",
                Severity.High,
                trusted,
                trusted ? "Certificate chain validated." : $"TLS policy errors: {sslErrors}",
                "Use a trusted certificate chain matching the scanned domain."));

            if (cert is not null)
            {
                var now = DateTime.UtcNow;
                var notBeforeOk = cert.NotBefore.ToUniversalTime() <= now;
                var daysLeft = (cert.NotAfter.ToUniversalTime() - now).TotalDays;
                var expiryOk = daysLeft > 30;
                var notExpired = daysLeft > 0;

                results.Add(Finding(
                    "ssl.valid_from",
                    "Certificate currently valid",
                    Severity.Medium,
                    notBeforeOk && notExpired,
                    $"Valid from {cert.NotBefore:yyyy-MM-dd} to {cert.NotAfter:yyyy-MM-dd}",
                    "Install a certificate that is currently valid for the scanned host."));

                results.Add(Finding(
                    "ssl.expiry",
                    "Certificate not expiring soon",
                    daysLeft < 0 ? Severity.Critical : Severity.High,
                    expiryOk,
                    $"Expires {cert.NotAfter:yyyy-MM-dd} ({daysLeft:F0} days)",
                    "Renew the TLS certificate before it enters the 30-day expiry window."));

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

            var protoOk = ssl.SslProtocol is SslProtocols.Tls12 or SslProtocols.Tls13;

            results.Add(Finding(
                "ssl.protocol",
                "Modern TLS version",
                Severity.High,
                protoOk,
                ssl.SslProtocol.ToString(),
                "Disable legacy TLS protocols and require TLS 1.2 or TLS 1.3."));
        }
        catch (Exception ex)
        {
            results.Add(Finding(
                "ssl.present",
                "TLS handshake",
                Severity.Critical,
                false,
                ex.Message,
                "Ensure HTTPS is configured with a valid certificate and reachable on port 443."));
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

            var hsts = HeaderValue(resp, "Strict-Transport-Security");
            var hasHsts = !string.IsNullOrWhiteSpace(hsts);
            var hstsMaxAgeOk = false;

            if (hasHsts)
            {
                var match = Regex.Match(hsts!, @"max-age\s*=\s*(\d+)", RegexOptions.IgnoreCase);
                if (match.Success && long.TryParse(match.Groups[1].Value, out var maxAge))
                    hstsMaxAgeOk = maxAge >= 15552000;
            }

            results.Add(Finding(
                "headers.hsts",
                "Strict-Transport-Security",
                Severity.High,
                hasHsts,
                hsts,
                "Add Strict-Transport-Security with a long max-age."));

            results.Add(Finding(
                "headers.hsts_max_age",
                "HSTS max-age is strong",
                Severity.Medium,
                hasHsts && hstsMaxAgeOk,
                hsts,
                "Use HSTS max-age of at least 15552000 seconds, preferably 31536000."));

            var csp = HeaderValue(resp, "Content-Security-Policy");
            var hasCsp = !string.IsNullOrWhiteSpace(csp);
            var weakCsp =
                hasCsp &&
                (
                    csp!.Contains("'unsafe-inline'", StringComparison.OrdinalIgnoreCase) ||
                    csp.Contains("*", StringComparison.OrdinalIgnoreCase)
                );

            results.Add(Finding(
                "headers.csp",
                "Content-Security-Policy",
                Severity.High,
                hasCsp,
                csp,
                "Define a Content-Security-Policy to reduce XSS and content injection risk."));

            results.Add(Finding(
                "headers.csp_strength",
                "Content-Security-Policy avoids weak sources",
                Severity.Medium,
                hasCsp && !weakCsp,
                csp,
                "Avoid wildcard sources and unsafe-inline where possible in CSP."));

            var frameProtected =
                HeaderExists(resp, "X-Frame-Options") ||
                (
                    hasCsp &&
                    csp!.Contains("frame-ancestors", StringComparison.OrdinalIgnoreCase)
                );

            results.Add(Finding(
                "headers.frame_protection",
                "Clickjacking protection",
                Severity.Medium,
                frameProtected,
                HeaderValue(resp, "X-Frame-Options") ?? csp,
                "Add X-Frame-Options or frame-ancestors in CSP."));

            results.Add(Finding(
                "headers.xcto",
                "X-Content-Type-Options",
                Severity.Medium,
                HeaderExists(resp, "X-Content-Type-Options"),
                HeaderValue(resp, "X-Content-Type-Options"),
                "Add X-Content-Type-Options: nosniff."));

            results.Add(Finding(
                "headers.refpol",
                "Referrer-Policy",
                Severity.Low,
                HeaderExists(resp, "Referrer-Policy"),
                HeaderValue(resp, "Referrer-Policy"),
                "Set a strict Referrer-Policy such as strict-origin-when-cross-origin."));

            results.Add(Finding(
                "headers.permpol",
                "Permissions-Policy",
                Severity.Low,
                HeaderExists(resp, "Permissions-Policy"),
                HeaderValue(resp, "Permissions-Policy"),
                "Restrict browser features with Permissions-Policy."));

            results.Add(Finding(
                "headers.coop",
                "Cross-Origin-Opener-Policy",
                Severity.Low,
                HeaderExists(resp, "Cross-Origin-Opener-Policy"),
                HeaderValue(resp, "Cross-Origin-Opener-Policy"),
                "Add Cross-Origin-Opener-Policy to reduce cross-origin isolation risks."));

            results.Add(Finding(
                "headers.server",
                "Server header hidden",
                Severity.Low,
                !HeaderExists(resp, "Server"),
                HeaderValue(resp, "Server"),
                "Remove or minimize the Server header."));

            results.Add(Finding(
                "headers.xpoweredby",
                "X-Powered-By header hidden",
                Severity.Low,
                !HeaderExists(resp, "X-Powered-By"),
                HeaderValue(resp, "X-Powered-By"),
                "Remove the X-Powered-By header."));
        }
        catch (Exception ex)
        {
            if (results.Count == 0)
            {
                results.Add(Finding(
                    "headers.check",
                    "HTTP security header scan",
                    Severity.High,
                    false,
                    ex.Message,
                    "Ensure the HTTPS endpoint is reachable so headers can be inspected."));
            }
            else
            {
                results.Add(new FindingDto(
                    "headers.partial",
                    "HTTP security header scan completed with partial evidence",
                    Severity.Info,
                    true,
                    $"Some header checks completed, but one optional header inspection step was skipped: {ex.Message}",
                    null));
            }
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
            .Distinct()
            .ToList();

        results.Add(Finding(
            "dns.a",
            "A record resolves",
            Severity.High,
            aRecords.Any(),
            string.Join(", ", aRecords),
            "Ensure the domain resolves to a valid host."));

        var aaaa = await _dns.QueryAsync(host, QueryType.AAAA, cancellationToken: ct);
        var aaaaRecords = aaaa.Answers.AaaaRecords()
            .Select(r => r.Address.ToString())
            .Distinct()
            .ToList();

        results.Add(new FindingDto(
            "dns.aaaa",
            "IPv6 AAAA record visibility",
            Severity.Info,
            true,
            aaaaRecords.Any()
                ? string.Join(", ", aaaaRecords)
                : "No IPv6 AAAA record found. This is optional for many businesses.",
            null));

        var mx = await _dns.QueryAsync(host, QueryType.MX, cancellationToken: ct);
        var mxRecords = mx.Answers.MxRecords()
            .Select(r => r.Exchange.Value.TrimEnd('.'))
            .Distinct()
            .ToList();

        results.Add(Finding(
            "dns.mx",
            "MX records present",
            Severity.Medium,
            mxRecords.Any(),
            string.Join(", ", mxRecords),
            "Configure MX records if the domain sends or receives email."));

        var caa = await _dns.QueryAsync(host, QueryType.CAA, cancellationToken: ct);
        var caaRecords = caa.Answers.CaaRecords()
            .Select(r => r.Value)
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .Distinct()
            .ToList();

        results.Add(Finding(
            "dns.caa",
            "CAA record present",
            Severity.Low,
            caaRecords.Any(),
            caaRecords.Any() ? string.Join(", ", caaRecords) : null,
            "Add a CAA record to restrict which certificate authorities may issue certificates."));

        var ns = await _dns.QueryAsync(host, QueryType.NS, cancellationToken: ct);
        var nsRecords = ns.Answers.NsRecords()
            .Select(r => r.NSDName.Value.TrimEnd('.'))
            .Distinct()
            .ToList();

        results.Add(Finding(
            "dns.ns",
            "Name servers configured",
            Severity.Medium,
            nsRecords.Any(),
            string.Join(", ", nsRecords),
            "Ensure authoritative name servers are configured correctly."));

        results.Add(Finding(
            "dns.ns_redundancy",
            "Multiple name servers configured",
            Severity.Low,
            nsRecords.Count >= 2,
            nsRecords.Any() ? string.Join(", ", nsRecords) : null,
            "Use at least two authoritative name servers for DNS resilience."));

        return results;
    }

    private async Task<FindingDto> CheckSpfAsync(
        string host,
        CancellationToken ct)
    {
        var txt = await _dns.QueryAsync(host, QueryType.TXT, cancellationToken: ct);

        var spfRecords = GetTxtValues(txt)
            .Where(t => t.StartsWith("v=spf1", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (spfRecords.Count == 0)
        {
            return new FindingDto(
                "email.spf",
                "SPF record published",
                Severity.High,
                false,
                "No SPF record found.",
                "Publish a single SPF TXT record starting with v=spf1.");
        }

        if (spfRecords.Count > 1)
        {
            return new FindingDto(
                "email.spf",
                "SPF record published",
                Severity.High,
                false,
                string.Join(" | ", spfRecords),
                "Keep only one SPF record. Multiple SPF records can break email authentication.");
        }

        var spf = spfRecords[0];

        var hasAll = Regex.IsMatch(spf, @"[~\-?+]all", RegexOptions.IgnoreCase);
        var dangerousAll = spf.Contains("+all", StringComparison.OrdinalIgnoreCase);
        var neutralAll = spf.Contains("?all", StringComparison.OrdinalIgnoreCase);
        var softFail = spf.Contains("~all", StringComparison.OrdinalIgnoreCase);
        var hardFail = spf.Contains("-all", StringComparison.OrdinalIgnoreCase);

        var passed = hasAll && !dangerousAll && !neutralAll;
        var severity = dangerousAll ? Severity.Critical : Severity.High;

        string? recommendation = null;

        if (dangerousAll)
            recommendation = "Remove +all. It allows any sender and makes spoofing easier.";
        else if (neutralAll)
            recommendation = "Avoid ?all. Use ~all during transition or -all after validation.";
        else if (!hasAll)
            recommendation = "End the SPF record with ~all or -all.";
        else if (softFail)
            recommendation = "SPF is published. Consider moving from ~all to -all after confirming legitimate senders.";
        else if (!hardFail)
            recommendation = "Review SPF policy and use -all when legitimate senders are confirmed.";

        return new FindingDto(
            "email.spf",
            "SPF record published",
            severity,
            passed,
            spf,
            passed ? recommendation : recommendation);
    }

    private async Task<FindingDto> CheckDkimAsync(
        string host,
        CancellationToken ct)
    {
        foreach (var selector in CommonDkimSelectors)
        {
            try
            {
                var q = await _dns.QueryAsync(
                    $"{selector}._domainkey.{host}",
                    QueryType.TXT,
                    cancellationToken: ct);

                var rec = GetTxtValues(q)
                    .FirstOrDefault(t =>
                        t.Contains("v=DKIM1", StringComparison.OrdinalIgnoreCase) ||
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

        var dmarcRecords = GetTxtValues(q)
            .Where(t => t.StartsWith("v=DMARC1", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (dmarcRecords.Count == 0)
        {
            return new FindingDto(
                "email.dmarc",
                "DMARC policy enforced",
                Severity.High,
                false,
                "No DMARC record found.",
                "Publish a DMARC record at _dmarc with p=quarantine or p=reject.");
        }

        if (dmarcRecords.Count > 1)
        {
            return new FindingDto(
                "email.dmarc",
                "DMARC policy enforced",
                Severity.High,
                false,
                string.Join(" | ", dmarcRecords),
                "Keep only one DMARC record. Multiple DMARC records can cause authentication failure.");
        }

        var dmarc = dmarcRecords[0];
        var policy = GetTagValue(dmarc, "p")?.ToLowerInvariant();

        var enforced = policy is "reject" or "quarantine";
        var monitoringOnly = policy == "none";

        return new FindingDto(
            "email.dmarc",
            "DMARC policy enforced",
            monitoringOnly ? Severity.Medium : Severity.High,
            enforced,
            dmarc,
            enforced
                ? null
                : monitoringOnly
                    ? "DMARC is present but monitoring only. Move to p=quarantine or p=reject after validation."
                    : "Set DMARC policy to p=quarantine or p=reject.");
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
            [23] = "Telnet",
            [25] = "SMTP",
            [53] = "DNS",
            [80] = "HTTP",
            [110] = "POP3",
            [143] = "IMAP",
            [443] = "HTTPS",
            [445] = "SMB",
            [465] = "SMTPS",
            [587] = "SMTP Submission",
            [993] = "IMAPS",
            [995] = "POP3S",
            [1433] = "SQL Server",
            [3306] = "MySQL",
            [5432] = "PostgreSQL",
            [6379] = "Redis",
            [8080] = "Alternative HTTP",
            [8443] = "Alternative HTTPS",
            [9200] = "Elasticsearch",
            [3389] = "RDP"
        };

        foreach (var port in ports)
        {
            var open = await IsPortOpenAsync(host, port.Key, 1200, ct);

            var expectedPublic = port.Key is 80 or 443;
            var criticalIfOpen = port.Key is 23 or 445 or 1433 or 3306 or 5432 or 6379 or 9200 or 3389;
            var highIfOpen = port.Key is 21 or 22;
            var mediumIfOpen = port.Key is 25 or 110 or 143 or 8080 or 8443;

            var passed = expectedPublic ? open : !open;

            var severity =
                criticalIfOpen ? Severity.Critical :
                highIfOpen ? Severity.High :
                mediumIfOpen ? Severity.Medium :
                Severity.Low;

            var recommendation =
                expectedPublic
                    ? $"Ensure {port.Value} port {port.Key} is reachable if this public web service is expected."
                    : $"Restrict, firewall, or move {port.Value} port {port.Key} behind VPN/private access unless intentionally exposed.";

            findings.Add(Finding(
                $"asm.port.{port.Key}",
                $"{port.Value} Port Exposure",
                severity,
                passed,
                open
                    ? $"{port.Value} port {port.Key} is publicly reachable."
                    : $"{port.Value} port {port.Key} appears closed or filtered.",
                recommendation));
        }

        return findings;
    }

    private static async Task<bool> IsPortOpenAsync(
        string host,
        int port,
        int timeoutMs,
        CancellationToken ct)
    {
        try
        {
            using var tcp = new TcpClient();

            var connectTask = tcp.ConnectAsync(host, port);
            var timeoutTask = Task.Delay(timeoutMs, ct);

            var completed = await Task.WhenAny(connectTask, timeoutTask);

            if (completed != connectTask)
                return false;

            await connectTask;

            return tcp.Connected;
        }
        catch
        {
            return false;
        }
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

            if (response.Headers.TryGetValues("X-AspNet-Version", out var aspNet))
                detected.Add($"X-AspNet-Version: {string.Join(", ", aspNet)}");

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

            if (lower.Contains("laravel"))
                detected.Add("Laravel");

            if (lower.Contains("php") || lower.Contains("phpsessid"))
                detected.Add("PHP indicator");

            var exposedHeaders = detected.Any(x =>
                x.StartsWith("Server:", StringComparison.OrdinalIgnoreCase) ||
                x.StartsWith("X-Powered-By:", StringComparison.OrdinalIgnoreCase) ||
                x.StartsWith("X-AspNet-Version:", StringComparison.OrdinalIgnoreCase));

            findings.Add(Finding(
                "asm.tech_stack",
                "Technology Stack Fingerprinting",
                exposedHeaders ? Severity.Medium : Severity.Low,
                !exposedHeaders,
                detected.Count > 0
                    ? string.Join(", ", detected.Distinct())
                    : "No obvious technology fingerprint detected.",
                "Minimize exposed Server, X-Powered-By, and framework/version headers to reduce fingerprinting."));
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
                .Select(r => r.NSDName.Value.TrimEnd('.'))
                .Distinct()
                .ToList();

            findings.Add(Finding(
                "asm.domain_inventory",
                "Domain Inventory Profile",
                Severity.Low,
                ips.Any(),
                $"IPs: {(ips.Any() ? string.Join(", ", ips) : "None")} | NS: {(nameservers.Any() ? string.Join(", ", nameservers) : "None")}",
                "Ensure the domain resolves properly and authoritative DNS is configured."));
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

    private static List<FindingDto> CheckExposureSummary(
        string host,
        IReadOnlyCollection<FindingDto> findings)
    {
        var failed = findings.Where(f => !f.Passed).ToList();
        var criticalHigh = failed.Count(f => f.Severity is Severity.Critical or Severity.High);
        var medium = failed.Count(f => f.Severity == Severity.Medium);
        var low = failed.Count(f => f.Severity == Severity.Low);

        var summary =
            $"ASM completed for {host}. Failed checks: {failed.Count}. Critical/High: {criticalHigh}. Medium: {medium}. Low: {low}. Public ports, technology fingerprinting, domain inventory, DNS, SSL, email security, and web exposure checks were evaluated where reachable.";

        return
        [
            new FindingDto(
                "asm.exposure_summary",
                "Attack Surface Exposure Summary",
                Severity.Low,
                true,
                summary,
                null)
        ];
    }
}