import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { AuthApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

const FEATURES = [
  {
    title: "Attack Surface",
    text: "Discover assets, run posture scans, and export executive reports.",
    icon: "🌐",
  },
  {
    title: "Risk Intelligence",
    text: "Prioritize vulnerabilities, risks, vendors, and remediation work.",
    icon: "🛡️",
  },
  {
    title: "Compliance Ready",
    text: "Track policies, frameworks, controls, audit logs, and evidence.",
    icon: "📋",
  },
];

function getApiBase() {
  return (import.meta.env.VITE_API_BASE ?? "/api/v1").replace(/\/+$/, "");
}

function normalizeAuth(data: any) {
  const token = data?.accessToken ?? data?.AccessToken;

  if (!token) {
    throw new Error("No session token returned.");
  }

  return {
    ...data,
    accessToken: token,
    refreshToken: data.refreshToken ?? data.RefreshToken,
    expiresUtc: data.expiresUtc ?? data.ExpiresUtc,
    tenantId: data.tenantId ?? data.TenantId,
    email: data.email ?? data.Email,
    roles: data.roles ?? data.Roles ?? [],
  };
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("admin@cybershield360.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth = await AuthApi.login(email, password);
      login(auth);
      navigate("/");
    } catch {
      setError("Invalid email or password. Check the Azure seed admin or reset the password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setError(null);
      setGoogleLoading(true);

      if (!credentialResponse?.credential) {
        setError("Google did not return a valid login credential.");
        return;
      }

      const response = await fetch(`${getApiBase()}/GoogleAuth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.message ?? "Google login failed. Please try again.");
        return;
      }

      login(normalizeAuth(data));
      navigate("/");
    } catch {
      setError("Google login could not connect to CyberShield360. Check Vercel API URL, CORS, and browser popup settings.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-bg-grid" />

      <div className="login-page">
        <section className="login-hero">
          <div className="login-header">
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
          </div>

          <div className="login-hero-main">
            <div className="login-copy">
              <div className="login-eyebrow">
                AI-ready cyber risk, exposure, and compliance command center
              </div>

              <h1>Modern Security Visibility for Every Asset, Risk, and Control.</h1>

              <p>
                CyberShield360 unifies assets, scans, vulnerabilities, compliance,
                vendors, users, audit logs, reports, and remediation workflows into one
                polished security workspace.
              </p>

              <div className="login-highlight-grid">
                <div className="login-highlight-card">
                  <div>360°</div>
                  <span>Security visibility</span>
                </div>
                <div className="login-highlight-card">
                  <div>AI</div>
                  <span>Guided remediation</span>
                </div>
                <div className="login-highlight-card">
                  <div>SOC</div>
                  <span>Operational control</span>
                </div>
              </div>

              <div className="auth-3d-scene auth-3d-wide">
                <div className="auth-grid" />
                <div className="scene-glow" />
                <div className="ring-3d ring-3d-one" />
                <div className="ring-3d ring-3d-two" />
                <div className="ring-3d ring-3d-three" />
                <div className="shield-diamond">
                  <div className="shield-diamond-inner">🛡️</div>
                </div>
                <div className="floating-chip chip-top-left">Full Posture Scan</div>
                <div className="floating-chip chip-top-right">Compliance Ready</div>
                <div className="floating-chip chip-bottom-left">Risk Intelligence</div>
                <div className="floating-chip chip-bottom-right">Executive Reports</div>
              </div>

              <div className="login-feature-strip">
                {FEATURES.map((feature) => (
                  <div key={feature.title} className="login-feature-card">
                    <div>{feature.icon}</div>
                    <strong>{feature.title}</strong>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="login-footer">
            <span>© 2026 CyberShield360.</span>
            <span>Built for modern security teams.</span>
          </div>
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
                    className="btn-primary"
                  >
                    Get Started
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/tenant-registration")}
                    className="btn-ghost"
                  >
                    Create company account
                  </button>
                </>
              ) : (
                <>
                  <div className="google-button-wrap">
                    <button type="button" className="google-button" tabIndex={-1}>
                      <span className="google-icon">
                        <svg viewBox="0 0 48 48">
                          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                        </svg>
                      </span>
                      <span>Sign in with Google</span>
                    </button>

                    <div className="google-hidden-click">
                      <GoogleLogin
                        width="420"
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError("Google login failed. Please try again.")}
                      />
                    </div>
                  </div>

                  {googleLoading && (
                    <div className="text-center text-xs text-slate-400">
                      Signing in with Google...
                    </div>
                  )}

                  <div className="login-divider">
                    <div />
                    <span>or continue with admin email</span>
                    <div />
                  </div>

                  <input
                    className="input"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />

                  <input
                    className="input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />

                  <button className="btn-primary" disabled={loading || googleLoading}>
                    {loading ? "Signing in..." : "Sign in"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setError(null);
                    }}
                    className="btn-ghost"
                  >
                    Back
                  </button>
                </>
              )}

              {error && <div className="login-error">{error}</div>}
            </div>
          </form>
        </section>

        <div className="login-mobile-footer">
          © 2026 CyberShield360. Built for modern security teams.
        </div>
      </div>
    </div>
  );
}
