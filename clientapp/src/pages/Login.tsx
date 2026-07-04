import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { AuthApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

const HIGHLIGHTS = [
  { label: "Security visibility", value: "360°" },
  { label: "Guided remediation", value: "AI" },
  { label: "Operational control", value: "SOC" },
];

const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api/v1").replace(/\/+$/, "");

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
      const auth = await AuthApi.login(email.trim(), password);
      login(auth);
      navigate("/");
    } catch {
      setError("Invalid email or password.");
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

              <div className="auth-3d-scene" aria-hidden="true">
                <div className="auth-grid" />

                <div className="floating-chip chip-top-left">Full Posture Scan</div>

                <div
                  className="floating-chip chip-top-right"
                  style={{ animationDelay: "0.7s" }}
                >
                  Compliance Ready
                </div>

                <div
                  className="floating-chip chip-bottom-left"
                  style={{ animationDelay: "1.2s" }}
                >
                  Risk Intelligence
                </div>

                <div
                  className="floating-chip chip-bottom-right"
                  style={{ animationDelay: "1.8s" }}
                >
                  Executive Reports
                </div>

                <div className="ring-3d ring-3d-one" />
                <div className="ring-3d ring-3d-two" />
                <div className="ring-3d ring-3d-three" />

                <div className="shield-diamond">
                  <div className="shield-diamond-inner">🛡️</div>
                </div>
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

          <form onSubmit={submit} className="login-card">
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
              {!showForm ? (
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
          </form>

          <div className="login-mobile-footer">
            © 2026 CyberShield360. Built for modern security teams.
          </div>
        </section>
      </div>
    </div>
  );
}
