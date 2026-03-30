const C = {
  void: "#0B0B0E", surface: "#101014", elevated: "#16161A",
  border: "#2A2A2E", steel: "#4A7A9B", steelMed: "#6B8AAE",
  textPrimary: "#D4D3CF", textSecondary: "#8A8984", textMuted: "#4A4A46",
};
const MONO = "'IBM Plex Mono', 'SF Mono', monospace";
const SANS = "'IBM Plex Sans', -apple-system, sans-serif";

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: C.textMuted,
        textTransform: "uppercase", marginBottom: 12,
      }}>
        {title}
      </div>
      <div style={{ fontFamily: SANS, fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

function P({ children }) {
  return <p style={{ marginBottom: 12 }}>{children}</p>;
}

function UL({ items }) {
  return (
    <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicy() {
  return (
    <div style={{ background: C.void, minHeight: "100vh", color: C.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        a { color: #4A7A9B; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 28px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <a href="/" style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 3, color: C.textMuted, display: "block", marginBottom: 32 }}>
            leetfocus
          </a>
          <h1 style={{ fontFamily: MONO, fontSize: 20, fontWeight: 500, color: C.textPrimary, letterSpacing: 1, marginBottom: 10 }}>
            Privacy Policy
          </h1>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.textMuted }}>
            Last updated: June 2025
          </div>
        </div>

        <div style={{ borderTop: `0.5px solid ${C.border}`, marginBottom: 40 }} />

        <Section title="Overview">
          <P>
            LeetFocus ("we", "us", or "our") operates the LeetFocus web application at{" "}
            <a href="https://leetfocus.com">leetfocus.com</a> and the LeetFocus Chrome Extension
            (collectively, the "Service"). This Privacy Policy explains what data we collect, how
            we use it, and your rights regarding that data.
          </P>
          <P>
            The Chrome Extension has a single purpose: to help users maintain focus while studying
            LeetCode problems by redirecting browser tabs to an assigned problem until it is solved.
            No browsing history, page content, or personal communications are ever collected or
            transmitted.
          </P>
        </Section>

        <Section title="Data We Collect">
          <P><strong style={{ color: C.textPrimary }}>Account information</strong></P>
          <P>
            When you create an account, we collect your email address through Clerk, our
            authentication provider. This is used solely to identify your account and deliver the
            Service.
          </P>

          <P><strong style={{ color: C.textPrimary }}>Authentication tokens</strong></P>
          <P>
            The Chrome Extension stores your session token (a short-lived JWT issued by Clerk)
            in local browser storage (<code style={{ fontFamily: MONO, fontSize: 12 }}>chrome.storage.local</code>).
            This token is used to authenticate requests to the LeetFocus API on your behalf.
            It is never transmitted to any third party and expires automatically.
          </P>

          <P><strong style={{ color: C.textPrimary }}>Daily problem assignment and lock state</strong></P>
          <P>
            The Extension stores the following in local browser storage:
          </P>
          <UL items={[
            "The URL of your assigned LeetCode problem for the day",
            "Whether you have solved today's problem (true/false)",
            "The date of the current assignment",
          ]} />
          <P>
            This data never leaves your device except as part of normal API communication with
            the LeetFocus backend to verify problem completion.
          </P>

          <P><strong style={{ color: C.textPrimary }}>Subscription and billing</strong></P>
          <P>
            If you subscribe to LeetFocus Pro, payment is processed by Stripe. We do not store
            your credit card number or full payment details. We receive only a Stripe customer ID
            and subscription status from Stripe.
          </P>
        </Section>

        <Section title="Data We Do NOT Collect">
          <P>We explicitly do not collect:</P>
          <UL items={[
            "Web browsing history — the Extension monitors tab navigation solely to perform redirects; no URLs, page titles, or visit timestamps are stored or transmitted",
            "The content of any web page you visit",
            "Keystrokes, mouse movements, or any other user activity",
            "Health, financial, or location information",
            "Personal communications (email, chat, SMS)",
          ]} />
        </Section>

        <Section title="How We Use Your Data">
          <P>Data collected is used exclusively to operate the Service:</P>
          <UL items={[
            "Your email address identifies your account",
            "Your session token authenticates API requests",
            "Your daily problem assignment and lock state enable the browser focus enforcement feature",
            "Your Stripe subscription status determines your access level (Free vs. Pro)",
          ]} />
          <P>
            We do not use your data for advertising, profiling, or any purpose unrelated to the
            Service described above.
          </P>
        </Section>

        <Section title="Chrome Extension Permissions">
          <P>The Extension requests the following browser permissions:</P>

          <P><strong style={{ color: C.textPrimary }}>storage</strong></P>
          <P>
            Used to persist your session token, daily problem assignment, and lock state locally
            so the Extension can enforce the browser lock without repeated server calls.
          </P>

          <P><strong style={{ color: C.textPrimary }}>tabs</strong></P>
          <P>
            Used to monitor tab navigation and redirect tabs to your assigned LeetCode problem
            while the browser is in locked mode. Also used to detect when the problem has been
            solved so the lock can be released. No tab URLs or history are stored or transmitted.
          </P>

          <P><strong style={{ color: C.textPrimary }}>Host permissions (all URLs)</strong></P>
          <P>
            The core lock feature requires intercepting navigation to any URL in order to redirect
            you to your assigned problem. Without broad host access, the Extension cannot enforce
            the lock across all sites. No user data from visited pages is ever collected, read, or
            transmitted — this permission is used solely for redirect enforcement.
          </P>
        </Section>

        <Section title="Data Sharing">
          <P>We do not sell, rent, or transfer your personal data to third parties, except:</P>
          <UL items={[
            "Clerk (authentication) — processes sign-in and issues session tokens",
            "Stripe (payments) — processes subscription billing for Pro users",
            "Supabase (database) — hosts your account and problem assignment data",
          ]} />
          <P>
            Each of these providers operates under its own privacy policy and processes data
            only as necessary to provide their respective services to us.
          </P>
        </Section>

        <Section title="Data Retention">
          <P>
            Your account data is retained for as long as your account is active. Local Extension
            data (<code style={{ fontFamily: MONO, fontSize: 12 }}>chrome.storage.local</code>) is
            cleared when you sign out of the Extension. You may request deletion of your account
            data at any time by contacting us at the address below.
          </P>
        </Section>

        <Section title="Your Rights">
          <P>You have the right to:</P>
          <UL items={[
            "Access the personal data we hold about you",
            "Request correction of inaccurate data",
            "Request deletion of your account and associated data",
            "Withdraw consent at any time by uninstalling the Extension or deleting your account",
          ]} />
        </Section>

        <Section title="Children's Privacy">
          <P>
            The Service is not directed at children under 13. We do not knowingly collect personal
            data from children under 13. If you believe a child has provided us with personal data,
            please contact us and we will delete it promptly.
          </P>
        </Section>

        <Section title="Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. We will notify users of material
            changes by updating the "Last updated" date above. Continued use of the Service after
            changes constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="Contact">
          <P>
            Questions about this Privacy Policy or requests regarding your data can be submitted
            via the contact form at{" "}
            <a href="https://leetfocus.com">leetfocus.com</a>.
          </P>
        </Section>

        <div style={{ borderTop: `0.5px solid ${C.border}`, paddingTop: 24 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: C.textMuted }}>
            © {new Date().getFullYear()} LeetFocus. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
