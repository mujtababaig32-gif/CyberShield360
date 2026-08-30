import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { AuthApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { isMfaRequired } from "../types";

const HIGHLIGHTS = [
  { label: "Security visibility", value: "360°" },
  { label: "Guided remediation", value: "AI" },
  { label: "Operational control", value: "SOC" },
];

const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api/v1").replace(/\/+$/, "");
const GOOGLE_CLIENT_ID_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

function getGoogleButtonWidth() {
  if (typeof window === "undefined") return 360;

  // Keep the official Google button inside the login card on narrow phones.
  return Math.max(220, Math.min(360, window.innerWidth - 72));
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(getGoogleButtonWidth);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    const syncGoogleButtonWidth = () => setGoogleButtonWidth(getGoogleButtonWidth());
    window.addEventListener("resize", syncGoogleButtonWidth);
    return () => window.removeEventListener("resize", syncGoogleButtonWidth);
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await AuthApi.login(email.trim(), password);

      if (isMfaRequired(result)) {
        setMfaToken(result.mfaToken);
        return;
      }

      login(result);
      navigate("/");
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401 || status === 400) {
        setError("Invalid email or password.");
      } else if (status) {
        setError("Login failed due to a server error. Please try again shortly.");
      } else {
        setError("Could not reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitMfa = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mfaToken) return;

    setLoading(true);
    setError(null);

    try {
      const auth = await AuthApi.loginMfa(mfaToken, mfaCode.trim());
      login(auth);
      navigate("/");
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) {
        setError("That code is invalid or has expired.");
      } else {
        setError("Could not verify the code. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    setError(null);
    setGoogleLoading(true);

    try {
      if (!credentialResponse.credential) {
        setError("Google did not return a valid login credential.");
        return;
      }

      const response = await fetch(`${API_BASE}/GoogleAuth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        setError(data?.message ?? "Google login failed. Please try again.");
        return;
      }

      const token = data?.accessToken ?? data?.AccessToken;

      if (!token) {
        setError("Google login succeeded, but no session token was returned.");
        return;
      }

      const normalizedAuth = {
        ...data,
        accessToken: token,
        refreshToken: data?.refreshToken ?? data?.RefreshToken,
        expiresUtc: data?.expiresUtc ?? data?.ExpiresUtc,
        tenantId: data?.tenantId ?? data?.TenantId,
        email: data?.email ?? data?.Email,
        roles: data?.roles ?? data?.Roles ?? [],
      };

      login(normalizedAuth);
      navigate("/");
    } catch {
      setError("Google login could not connect to CyberShield360.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-bg-grid" />

      <div className="login-page">
        <section className="login-hero">
          <header className="login-header">
            <div className="login-brand">
              <div className="login-logo-box">
                <img src="/logo.svg" alt="CyberShield360" className="login-logo" />
              </div>

              <div className="login-brand-copy">
                <div className="login-brand-name">
                  CyberShield<span>360</span>
                </div>
                <div className="login-brand-sub">By Mujtaba</div>
              </div>
            </div>

            <div className="login-status-pill">Secure SaaS Console</div>
          </header>

          <main className="login-hero-main">
            <div className="login-copy">
              <div className="login-eyebrow">
                AI-ready cyber risk, exposure, and compliance command center
              </div>

              <h1>Modern Security Visibility for Every Asset, Risk, and Control</h1>

              <p>
                CyberShield360 unifies assets, scans, vulnerabilities, compliance,
                vendors, users, audit logs, reports, and remediation workflows into
                one polished security workspace.
              </p>

              <div className="login-highlight-grid">
                {HIGHLIGHTS.map((item) => (
                  <div key={item.label} className="login-highlight-card">
                    <div>{item.value}</div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="login-hero-visual" aria-hidden="true">
                <div className="login-hero-visual-grid" />
                <div className="login-hero-orbit login-hero-orbit-a" />
                <div className="login-hero-orbit login-hero-orbit-b" />
                <div className="login-hero-shield">
                  <div className="login-hero-shield-face">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5 12.5L9.5 17L19 7"
                        stroke="white"
                        strokeWidth="2.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="login-tag-row" aria-hidden="true">
                <span>Full Posture Scan</span>
                <span>Compliance Ready</span>
                <span>Risk Intelligence</span>
                <span>Executive Reports</span>
              </div>
            </div>
          </main>

          <footer className="login-footer">
            <span>© 2026 CyberShield360. Built for modern security teams.</span>
            <span>Secure • Tenant-aware • Audit-ready</span>
          </footer>
        </section>

        <section className="login-form-side">
          <div className="login-mobile-intro" aria-hidden="true">
            <span>Security workspace</span>
            <strong>See risk clearly. Fix what matters.</strong>
          </div>

          <form onSubmit={mfaToken ? submitMfa : submit} className="login-card">
            <div className="login-card-head">
              <div className="login-card-logo">
                <img src="/logo.svg" alt="CyberShield360 By Mujtaba" />
              </div>

              <h2>
                CyberShield<span>360</span>
              </h2>

              <div className="login-card-sub">By Mujtaba</div>

              <p>Sign in to your security workspace</p>
            </div>

            <div className="login-actions">
              {mfaToken ? (
                <>
                  <div className="login-form-toolbar">
                    <button
                      type="button"
                      className="login-back-button"
                      onClick={() => {
                        setError(null);
                        setMfaToken(null);
                        setMfaCode("");
                      }}
                    >
                      <span aria-hidden="true">←</span>
                      Back
                    </button>
                  </div>

                  <p className="text-sm text-slate-400">
                    Enter the 6-digit code from your authenticator app, or a recovery code.
                  </p>

                  {error && (
                    <div className="login-error" role="alert" aria-live="assertive">
                      {error}
                    </div>
                  )}

                  <div className="login-field">
                    <label htmlFor="login-mfa-code">Authentication code</label>
                    <input
                      id="login-mfa-code"
                      className="input border-white/10 bg-slate-950/70 text-white"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <button className="btn-primary w-full" disabled={loading}>
                    {loading ? "Verifying..." : "Verify and sign in"}
                  </button>
                </>
              ) : !showForm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setShowForm(true);
                    }}
                    className="btn-primary w-full"
                  >
                    Get Started
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/tenant-registration")}
                    className="btn-ghost w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Create company account
                  </button>
                </>
              ) : (
                <>
                  <div className="login-form-toolbar">
                    <button
                      type="button"
                      className="login-back-button"
                      onClick={() => {
                        setError(null);
                        setShowForm(false);
                      }}
                    >
                      <span aria-hidden="true">←</span>
                      Back
                    </button>
                  </div>

                  <div className="google-login-official">
                    {GOOGLE_CLIENT_ID_CONFIGURED ? (
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => {
                          setError("Google login failed. Please try again.");
                        }}
                        useOneTap={false}
                        auto_select={false}
                        theme="outline"
                        size="large"
                        text="signin_with"
                        shape="rectangular"
                        logo_alignment="left"
                        width={String(googleButtonWidth)}
                      />
                    ) : (
                      <div
                        className="login-provider-status"
                        role="alert"
                        title="Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in."
                      >
                        Google sign-in is not configured for this deployment.
                      </div>
                    )}
                  </div>

                  {googleLoading && (
                    <div className="login-provider-status" aria-live="polite">
                      Signing in with Google...
                    </div>
                  )}

                  <button
                    type="button"
                    disabled
                    className="login-microsoft-button"
                  >
                    Continue with Microsoft <span>Coming Soon</span>
                  </button>

                  <div className="login-divider">
                    <div />
                    <span>or sign in with email</span>
                    <div />
                  </div>

                  {error && (
                    <div className="login-error" role="alert" aria-live="assertive">
                      {error}
                    </div>
                  )}

                  <div className="login-field">
                    <label htmlFor="login-email">Email address</label>
                    <input
                      id="login-email"
                      className="input border-white/10 bg-slate-950/70 text-white"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="login-field">
                    <label htmlFor="login-password">Password</label>
                    <div className="login-password-wrap">
                      <input
                        id="login-password"
                        className="input border-white/10 bg-slate-950/70 text-white"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPassword((current) => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <button className="btn-primary w-full" disabled={loading || googleLoading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/tenant-registration")}
                    className="btn-ghost w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    Create company account
                  </button>
                </>
              )}
            </div>

            <div className="login-card-assurance" aria-label="Security assurances">
              <span>Encrypted session</span>
              <span>Tenant-aware access</span>
              <span>Audit-ready</span>
            </div>
          </form>

          <div className="login-mobile-footer">
            © 2026 CyberShield360. Built for modern security teams.
          </div>
        </section>
      </div>
    </div>
  );
}
