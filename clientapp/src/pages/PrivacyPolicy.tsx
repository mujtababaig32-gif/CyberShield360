import LegalPageShell from "../components/LegalPageShell";

export default function PrivacyPolicy() {
  return (
    <LegalPageShell title="Privacy Policy" effectiveDate="September 6, 2026">
      <p>
        This Privacy Policy explains how <strong>[Company Legal Name]</strong> ("CyberShield360," "we,"
        "us," or "our") collects, uses, and shares information when you use our cybersecurity posture
        management platform (the "Service"). This policy applies to visitors, trial users, and paying
        customers of the Service.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We collect the following categories of information:</p>
      <ul>
        <li>
          <strong>Account information</strong> — company name, admin name, work email address, and
          password (stored as a salted hash, never in plain text).
        </li>
        <li>
          <strong>Asset and scan data</strong> — domains and subdomains you register for monitoring, and
          the results of scans we run against them (vulnerabilities, misconfigurations, DNS/email
          security records, and similar technical findings).
        </li>
        <li>
          <strong>Usage data</strong> — pages visited, features used, and actions taken within the
          Service, collected to operate and improve the product.
        </li>
        <li>
          <strong>Billing information</strong> — plan tier and subscription status. Card and payment
          details are collected and stored directly by our payment processor; we do not receive or store
          full card numbers.
        </li>
        <li>
          <strong>Communications</strong> — content of support requests, and records of transactional
          emails we send you (e.g., password resets, scan notifications, invitation emails).
        </li>
      </ul>

      <h2>2. How We Use Information</h2>
      <ul>
        <li>To provide the Service, including running scans and generating reports and dashboards;</li>
        <li>To generate AI-assisted remediation guidance based on your scan and finding data;</li>
        <li>To send transactional emails (password resets, invitations, scan and billing notifications);</li>
        <li>To process payments and manage subscriptions;</li>
        <li>To monitor, secure, and improve the Service, including detecting abuse or unauthorized use;</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>3. AI Processing</h2>
      <p>
        Certain features (such as AI-generated remediation guidance) send relevant scan and finding data
        to a third-party AI model provider for processing. We do not knowingly send full-content
        documents or unrelated personal data to the AI provider beyond what is necessary to generate
        useful guidance for the specific finding being explained.
      </p>

      <h2>4. Third Parties We Share Data With</h2>
      <p>We share data with the following categories of service providers, solely to operate the Service:</p>
      <ul>
        <li><strong>Cloud hosting provider</strong> — hosts our application and database infrastructure.</li>
        <li><strong>Payment processor</strong> — processes subscription payments on our behalf.</li>
        <li><strong>Email delivery provider</strong> — sends transactional emails on our behalf.</li>
        <li><strong>AI model provider</strong> — processes scan/finding data to generate remediation guidance, as described above.</li>
      </ul>
      <p>
        We do not sell your personal information, and we do not share Customer Data with third parties for
        their own independent marketing purposes.
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain account and scan data for as long as your account is active, and for a reasonable period
        afterward to allow for account recovery, comply with legal obligations, resolve disputes, and
        enforce our agreements. You may request deletion of your account and associated data as described
        in Section 7.
      </p>

      <h2>6. Data Security</h2>
      <p>
        We use industry-standard measures to protect your information, including encryption of data in
        transit, hashed password storage, and tenant-level data isolation. No method of transmission or
        storage is completely secure, and we cannot guarantee absolute security.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, export, or delete the personal
        information we hold about you, and to object to or restrict certain processing. To exercise these
        rights, contact us at <strong>[privacy contact email]</strong>. We will respond within a reasonable
        timeframe and in accordance with applicable law.
      </p>

      <h2>8. International Data Transfers</h2>
      <p>
        Your information may be processed and stored in countries other than your own, including the
        country where our hosting infrastructure is located. Where required, we take steps to ensure such
        transfers are subject to appropriate safeguards.
      </p>

      <h2>9. Children's Privacy</h2>
      <p>
        The Service is intended for business use by adults and is not directed at individuals under 18.
        We do not knowingly collect personal information from children.
      </p>

      <h2>10. Cookies</h2>
      <p>
        We use cookies and similar technologies for authentication (keeping you signed in) and to
        remember basic preferences. We do not use third-party advertising cookies.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be communicated by
        email or an in-product notice before they take effect.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        Questions about this Privacy Policy can be sent to <strong>[privacy contact email]</strong>.
      </p>
    </LegalPageShell>
  );
}
