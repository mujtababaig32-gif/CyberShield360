namespace CyberShield360.API.Controllers;

public record PhishingTemplate(string Name, string Category, string Difficulty, string Subject, string HtmlBody);

/// <summary>
/// Built-in pretext templates for authorized internal phishing simulations. Each body
/// uses {{Name}} and {{Link}} placeholders filled in per-recipient at send time. These
/// are intentionally realistic — the "this was a test" reveal happens only after a
/// click, on the landing page, matching how every real simulation product (KnowBe4,
/// GoPhish) runs an authorized campaign.
/// </summary>
public static class PhishingTemplateCatalog
{
    public static readonly IReadOnlyList<PhishingTemplate> All = new List<PhishingTemplate>
    {
        new(
            "IT Password Expiration",
            "Credential Awareness",
            "Medium",
            "Action Required: Your password expires today",
            """
            <p>Hi {{Name}},</p>
            <p>Our records show your account password expires today. To avoid losing access to your mailbox and shared files, please verify your account now.</p>
            <p><a href="{{Link}}">Verify My Account</a></p>
            <p>IT Support Team</p>
            """),
        new(
            "Invoice Payment Request",
            "Business Email Compromise",
            "High",
            "Invoice #48213 — payment overdue",
            """
            <p>Hi {{Name}},</p>
            <p>Invoice #48213 for last month's services is now overdue. Please review and confirm payment at your earliest convenience to avoid a late fee.</p>
            <p><a href="{{Link}}">Review Invoice</a></p>
            <p>Accounts Payable</p>
            """),
        new(
            "Shared Document Notification",
            "Security Awareness",
            "Low",
            "A document has been shared with you",
            """
            <p>Hi {{Name}},</p>
            <p>A colleague has shared a document with you titled "Q3 Planning — Confidential". Sign in to view it.</p>
            <p><a href="{{Link}}">Open Document</a></p>
            """),
        new(
            "Package Delivery Issue",
            "Security Awareness",
            "Low",
            "We could not deliver your package",
            """
            <p>Hi {{Name}},</p>
            <p>We attempted to deliver a package to your address but were unable to complete delivery. Please confirm your details to reschedule.</p>
            <p><a href="{{Link}}">Reschedule Delivery</a></p>
            """),
        new(
            "Urgent Security Alert",
            "Security Awareness",
            "High",
            "Unusual sign-in activity on your account",
            """
            <p>Hi {{Name}},</p>
            <p>We detected a sign-in to your account from a new device. If this wasn't you, secure your account immediately.</p>
            <p><a href="{{Link}}">Review Account Activity</a></p>
            """),
    };

    public static PhishingTemplate? Find(string? name) =>
        All.FirstOrDefault(t => string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase));
}
