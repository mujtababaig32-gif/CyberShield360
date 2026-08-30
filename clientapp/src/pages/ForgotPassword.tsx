import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthApi } from "../api/endpoints";
import SecurityMeshBackground from "../components/SecurityMeshBackground";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await AuthApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // The endpoint never reveals whether an account exists, so any failure
      // here is a connectivity problem, not an invalid-email problem.
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-standalone-shell">
      <SecurityMeshBackground intensity="subtle" className="auth-standalone-mesh" />

      <div className="auth-standalone-card">
        <div className="login-card-head">
          <div className="login-card-logo">
            <img src="/logo.svg" alt="CyberShield360 By Mujtaba" />
          </div>

          <h2>
            CyberShield<span>360</span>
          </h2>

          <div className="login-card-sub">By Mujtaba</div>

          <p>Reset your password</p>
        </div>

        {sent ? (
          <div className="auth-standalone-body">
            <div className="login-provider-status" role="status" aria-live="polite">
              If an account exists for <strong>{email.trim()}</strong>, a password reset
              link has been sent. Check your inbox — the link expires soon.
            </div>

            <button type="button" className="btn-ghost w-full border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => navigate("/login")}>
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-standalone-body">
            <p className="text-sm text-slate-400">
              Enter the email address for your CyberShield360 account and we'll send you
              a link to choose a new password.
            </p>

            {error && (
              <div className="login-error" role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                className="input border-white/10 bg-slate-950/70 text-white"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Sending link..." : "Send reset link"}
            </button>

            <Link to="/login" className="login-forgot-link auth-standalone-back">
              ← Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
