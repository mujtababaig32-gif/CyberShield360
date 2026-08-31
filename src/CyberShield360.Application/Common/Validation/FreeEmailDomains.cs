namespace CyberShield360.Application.Common.Validation;

// Blocks self-service company signup from consumer/free webmail addresses, so a
// tenant's admin account is tied to a domain the company actually controls
// (matters for future SSO and for keeping "company workspace" signups honest).
public static class FreeEmailDomains
{
    private static readonly HashSet<string> Domains = new(StringComparer.OrdinalIgnoreCase)
    {
        "gmail.com", "googlemail.com",
        "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.co.jp", "yahoo.com.au",
        "yahoo.ca", "yahoo.fr", "yahoo.de", "ymail.com", "rocketmail.com",
        "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.it",
        "outlook.com", "outlook.co.uk", "outlook.in", "outlook.fr", "outlook.de",
        "live.com", "live.co.uk", "live.fr", "msn.com",
        "icloud.com", "me.com", "mac.com",
        "aol.com", "aim.com",
        "protonmail.com", "proton.me", "pm.me",
        "gmx.com", "gmx.net", "gmx.de", "mail.com", "web.de",
        "zoho.com",
        "yandex.com", "yandex.ru",
        "qq.com", "163.com", "126.com", "sina.com", "sohu.com",
        "naver.com", "hanmail.net", "daum.net",
        "rediffmail.com",
        "inbox.com", "fastmail.com", "tutanota.com",
        "mailinator.com", "guerrillamail.com", "10minutemail.com", "yopmail.com",
        "example.com", "test.com",
    };

    public static bool IsFreeOrConsumerDomain(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;

        var at = email.LastIndexOf('@');
        if (at < 0 || at == email.Length - 1) return false;

        var domain = email[(at + 1)..].Trim().ToLowerInvariant();
        return Domains.Contains(domain);
    }
}
