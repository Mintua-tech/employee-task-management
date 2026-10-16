
import { useState, type FormEvent } from "react";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { Link, useSearchParams } from "react-router-dom";
import { auth } from "../../services/firebase";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!oobCode) {
      setError("This reset link is invalid or incomplete.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await verifyPasswordResetCode(auth, oobCode);
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: unknown) {
      console.error("Password reset failed:", err);

      const code =
        typeof err === "object" &&
        err !== null &&
        "code" in err
          ? String(err.code)
          : "";

      if (
        code === "auth/expired-action-code" ||
        code === "auth/invalid-action-code"
      ) {
        setError("This reset link has expired or has already been used. Request a new one.");
      } else if (code === "auth/weak-password") {
        setError("Choose a stronger password.");
      } else {
        setError("Unable to reset your password. Request a new link and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "64px auto", padding: 24 }}>
      <h1>Reset password</h1>

      {!success ? (
        <>
          <p>Choose a new password for your account.</p>

          {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}

          <form onSubmit={handleSubmit}>
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
              style={inputStyle}
            />

            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={inputStyle}
            />

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        </>
      ) : (
        <section>
          <p role="status" style={{ color: "green" }}>
            Your password has been changed successfully.
          </p>
          <Link to="/login">Continue to login</Link>
        </section>
      )}

      {!success && <p><Link to="/login">Back to login</Link></p>}
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 10,
  margin: "6px 0 16px",
};

const buttonStyle = {
  width: "100%",
  padding: 12,
  cursor: "pointer",
};
