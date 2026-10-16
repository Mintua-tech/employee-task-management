
import { useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../../services/firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
    } catch (err: unknown) {
      console.error("Password reset request failed:", err);

      const code =
        typeof err === "object" &&
        err !== null &&
        "code" in err
          ? String(err.code)
          : "";

      if (code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait and try again.");
      } else {
        setError("Unable to send the reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "64px auto", padding: 24 }}>
      <h1>Forgot password?</h1>
      <p>Enter your email address to request a password-reset link.</p>

      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}

      {success && (
        <p role="status" style={{ color: "green" }}>
          If an account exists for this address, a password-reset email
          may have been sent. Check your inbox and spam folder.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            padding: 10,
            margin: "8px 0 16px",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 12 }}
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p><Link to="/login">Back to login</Link></p>
    </main>
  );
}
