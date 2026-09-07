import LegalPageShell from "../components/LegalPageShell";

export default function Terms() {
  return (
    <LegalPageShell title="Terms of Service" effectiveDate="September 6, 2026">
      <p>
        These Terms of Service ("Terms") govern access to and use of CyberShield360 (the "Service"),
        provided by <strong>Muhammad Mujtaba Baig</strong>, operating as CyberShield360 ("CyberShield360,"
        "we," "us," or "our"). By
        creating an account, starting a trial, or otherwise using the Service, you ("Customer," "you")
        agree to be bound by these Terms. If you are entering into these Terms on behalf of a company or
        other legal entity, you represent that you have the authority to bind that entity.
      </p>

      <h2>1. The Service</h2>
      <p>
        CyberShield360 is a cybersecurity posture management platform that provides, among other
        features: external attack-surface scanning, vulnerability detection and scoring, AI-generated
        remediation guidance, phishing simulation and security-awareness training, dark-web exposure
        monitoring, vendor risk assessment, compliance framework mapping, and related reporting tools.
        We may add, change, or remove features at our discretion.
      </p>

      <h2>2. Authorization to Scan</h2>
      <p>
        The Service performs active scanning of domains, subdomains, and other network assets. You may
        only submit assets for scanning that you own, control, or are otherwise fully authorized to test.
        You are solely responsible for ensuring you have the legal right to scan every asset you add to
        your account. Scanning systems you do not own or lack authorization to test may violate
        computer-crime laws (including, in the United States, the Computer Fraud and Abuse Act) and other
        applicable laws — CyberShield360 accepts no responsibility for unauthorized scanning performed
        through your account, and you agree to indemnify us against any claim arising from it.
      </p>

      <h2>3. Phishing Simulation and Training</h2>
      <p>
        If you use our phishing simulation or security-awareness training features, you represent that
        you have the right to send simulated phishing communications to the individuals you target
        (typically your own employees or contractors) and that doing so complies with your internal
        policies and applicable law, including workplace-monitoring and electronic-communications laws in
        your jurisdiction. You are responsible for obtaining any consent or notice required under your
        internal policies before running a simulation.
      </p>

      <h2>4. Accounts and Registration</h2>
      <p>
        You must register using an accurate company name, a valid company email address, and accurate
        billing information. Free consumer email domains (e.g., Gmail, Yahoo, Outlook) are not accepted
        for new workspace registration. You are responsible for maintaining the confidentiality of your
        account credentials and for all activity that occurs under your account. Notify us immediately of
        any unauthorized use.
      </p>

      <h2>5. Subscription Plans, Trials, and Billing</h2>
      <ul>
        <li>New workspaces begin with a 14-day free trial. No payment method is required to start a trial.</li>
        <li>
          Paid plans are billed on a recurring basis (monthly or as otherwise stated at checkout) through
          our payment processor. Prices for each plan tier are shown on our pricing page and may change
          with notice.
        </li>
        <li>
          Each plan includes limits on the number of monitored assets, team members, and scans per month.
          Exceeding those limits may require upgrading to a higher tier.
        </li>
        <li>
          Subscriptions renew automatically until cancelled. You may cancel at any time; cancellation
          takes effect at the end of the current billing period. Except where required by law, fees are
          non-refundable.
        </li>
        <li>Failure to pay may result in suspension or downgrade of your account.</li>
      </ul>

      <h2>6. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service to scan, attack, or test any asset without proper authorization;</li>
        <li>Use the Service to store or transmit malicious code, or to interfere with the Service's operation;</li>
        <li>Attempt to reverse-engineer, resell, or white-label the Service without our written consent;</li>
        <li>Use the Service in a way that violates applicable law or the rights of any third party;</li>
        <li>Exceed reasonable API or scanning rate limits, or attempt to circumvent plan limits.</li>
      </ul>

      <h2>7. Data Ownership</h2>
      <p>
        You retain all rights to the data you submit to the Service, including asset lists, scan
        configurations, and any documents you upload ("Customer Data"). You grant us a license to process
        Customer Data solely to provide, maintain, and improve the Service, including generating scan
        results and AI-assisted remediation guidance as described in our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>8. Third-Party Services</h2>
      <p>
        The Service relies on third-party providers to function, including an AI provider for generating
        remediation guidance, a payment processor for billing, and an email delivery provider for
        transactional messages. Your use of the Service constitutes acceptance that relevant Customer Data
        may be processed by these providers as described in our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>9. Service Availability</h2>
      <p>
        The Service is provided on an "as is" and "as available" basis. We do not guarantee that the
        Service will be uninterrupted, error-free, or that scan results will identify every vulnerability
        or security issue present in a scanned asset. CyberShield360 is a tool to assist your security
        program; it does not replace professional security assessment, penetration testing, or legal or
        compliance advice.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, CyberShield360 and its officers, employees, and affiliates
        will not be liable for any indirect, incidental, special, consequential, or punitive damages, or
        any loss of profits, revenue, data, or goodwill, arising from your use of the Service. Our total
        liability for any claim arising from these Terms or the Service will not exceed the amount you
        paid us in the twelve (12) months preceding the claim.
      </p>

      <h2>11. Termination</h2>
      <p>
        We may suspend or terminate your access to the Service if you breach these Terms, fail to pay
        applicable fees, or if we reasonably believe your use poses a security or legal risk to us or
        others. You may terminate your account at any time by contacting us or through your account
        settings.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated by email or an
        in-product notice. Continued use of the Service after a change takes effect constitutes acceptance
        of the revised Terms.
      </p>

      <h2>13. Governing Law</h2>
      <p>
        These Terms are governed by the laws of <strong>Pakistan</strong>, without regard to its
        conflict-of-laws principles.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms can be sent to <strong>admin@cybershield360ai.com</strong>.
      </p>
    </LegalPageShell>
  );
}
