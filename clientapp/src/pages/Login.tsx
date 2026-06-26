import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { AuthApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

const HIGHLIGHTS = [
  { label: "Security visibility", value: "360Â°" },
  { label: "Guided remediation", value: "AI" },
  { label: "Operational control", value: "SOC" },
];

const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api/v1").replace(/\/+$/, "");

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth = await AuthApi.login(email, password);
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

              <div>
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

              <div className="auth-3d-scene">
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
                  <div className="shield-diamond-inner">ðŸ›¡ï¸</div>
                </div>
              </div>
            </div>
          </main>

          <footer className="login-footer">
            <span>Â© 2026 CyberShield360. Built for modern security teams.</span>
            <span>Secure â€¢ Tenant-aware â€¢ Audit-ready</span>
          </footer>
        </section>

        <section className="login-form-side">
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
                    onClick={() => setShowForm(true)}
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
                 <div className="google-login-cybershield">
  <button type="button" className="google-login-cybershield-face">
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M18.8 10.209C18.8 9.55898 18.7417 8.93398 18.6333 8.33398H10V11.8798H14.9333C14.7208 13.0257 14.075 13.9965 13.1042 14.6465V16.9465H16.0667C17.8 15.3507 18.8 13.0007 18.8 10.209Z"
        fill="#4285F4"
      />
      <path
        d="M10.0003 19.1672C12.4753 19.1672 14.5503 18.3464 16.0669 16.9464L13.1044 14.6464C12.2836 15.1964 11.2336 15.5214 10.0003 15.5214C7.61276 15.5214 5.59193 13.9089 4.87109 11.7422H1.80859V14.1172C3.31693 17.113 6.41693 19.1672 10.0003 19.1672Z"
        fill="#34A853"
      />
      <path
        d="M4.86953 11.7411C4.6862 11.1911 4.58203 10.6036 4.58203 9.99948C4.58203 9.39531 4.6862 8.80781 4.86953 8.25781V5.88281H1.80703C1.16536 7.16019 0.831466 8.56999 0.832032 9.99948C0.832032 11.4786 1.1862 12.8786 1.80703 14.1161L4.86953 11.7411Z"
        fill="#FBBC05"
      />
      <path
        d="M10.0003 4.47982C11.3461 4.47982 12.5544 4.94232 13.5044 5.85065L16.1336 3.22148C14.5461 1.74232 12.4711 0.833984 10.0003 0.833984C6.41693 0.833984 3.31693 2.88815 1.80859 5.88398L4.87109 8.25898C5.59193 6.09232 7.61276 4.47982 10.0003 4.47982Z"
        fill="#EA4335"
      />
    </svg>

    <span>Continue with Google</span>
  </button>

  <div className="google-login-cybershield-click">
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
      width="360"
    />
  </div>
</div>

                  {googleLoading && (
                    <div className="text-center text-xs text-slate-400">
                      Signing in with Google...
                    </div>
                  )}

                  <button
                    type="button"
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-500"
                  >
                    Continue with Microsoft - Coming Soon
                  </button>

                  <div className="login-divider">
                    <div />
                    <span>or sign in with email</span>
                    <div />
                  </div>

                  {error && <div className="login-error">{error}</div>}

                  <input
                    className="input border-white/10 bg-slate-950/70 text-white"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <input
                    className="input border-white/10 bg-slate-950/70 text-white"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button className="btn-primary w-full" disabled={loading}>
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
            Â© 2026 CyberShield360. Built for modern security teams.
          </div>
        </section>
      </div>
    </div>
  );
}