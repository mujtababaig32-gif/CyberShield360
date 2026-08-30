import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthApi } from "../api/endpoints";
import SecurityMeshBackground from "../components/SecurityMeshBackground";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const linkIsValid = Boolean(email && token);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }

    setLoading(true);

    try {
      await AuthApi.resetPassword(email, token, password);
      setDone(true);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(message ?? "This reset link is invalid or has expired.");
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

          <p>Choose a new password</p>
        </div>

        {!linkIsValid ? (
          <div className="auth-standalone-body">
            <div className="login-error" role="alert">
              This reset link is missing required information. Request a new one from
              the sign-in page.
            </div>

            <button type="button" className="btn-primary w-full" onClick={() => navigate("/forgot-password")}>
              Request a new link
            </button>
          </div>
        ) : done ? (
          <div className="auth-standalone-body">
            <div className="login-provider-status" role="status" aria-live="polite">
              Your password has been updated. You can now sign in with your new password.
            </div>

            <button type="button" className="btn-primary w-full" onClick={() => navigate("/login")}>
              Go to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-standalone-body">
            <p className="text-sm text-slate-400">
              Resetting the password for <strong>{email}</strong>.
            </p>

            {error && (
              <div className="login-error" role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="reset-password">New password</label>
              <div className="login-password-wrap">
                <input
                  id="reset-password"
                  className="input border-white/10 bg-slate-950/70 text-white"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Enter a new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoFocus
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

            <div className="login-field">
              <label htmlFor="reset-password-confirm">Confirm password</label>
              <input
                id="reset-password-confirm"
                className="input border-white/10 bg-slate-950/70 text-white"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter the new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
