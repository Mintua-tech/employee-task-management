
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { Navigate } from "react-router-dom";
import { auth } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const { user, profile, loading, profileError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (loading) {
    return <p>Checking your session...</p>;
  }

  if (user && profile) {
    
    return <Navigate to="/dashboard" replace />;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      
      setMessage("Firebase login successful");
      

      // AuthProvider loads the user's Firestore profile.
    } catch (err: unknown) {
      console.error("Login failed:", err);

      const firebaseError = err as {
        code?: string;
        message?: string;
      };

      switch (firebaseError.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setError("Incorrect email or password.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/too-many-requests":
          setError(
            "Too many login attempts. Please wait and try again."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Check your internet connection and try again."
          );
          break;

        case "auth/unauthorized-domain":
          setError(
            "This domain is not authorized in Firebase Authentication settings."
          );
          break;

        default:
          setError(
            `Login failed: ${
              firebaseError.code ?? firebaseError.message ?? "Unknown error"
            }`
          );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Enter your email address first.");
      return;
    }

    setResetting(true);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);

      setMessage(
        "If an account exists for this email, a password reset email will be sent."
      );
    } catch (err: unknown) {
      console.error("Password reset failed:", err);

      const firebaseError = err as {
        code?: string;
        message?: string;
      };

      if (firebaseError.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (
        firebaseError.code === "auth/network-request-failed"
      ) {
        setError("Network error. Check your internet connection.");
      } else {
        setError(
          `Password reset failed: ${
            firebaseError.code ?? firebaseError.message ?? "Unknown error"
          }`
        );
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="auth-container">
      <form className="auth-card" onSubmit={handleLogin}>
        <h1>Employee Management</h1>
        <p>Sign in to your account</p>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          placeholder="Enter your email"
          required
          disabled={submitting}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          disabled={submitting}
        />

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {profileError && user && (
          <p className="error" role="alert">
            {profileError}
          </p>
        )}

        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}

        <button type="submit" disabled={submitting || resetting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={submitting || resetting}
        >
          {resetting ? "Sending reset email..." : "Forgot password?"}
        </button>
      </form>
      <p>
  Don't have an account? <Link to="/register">Register</Link>
</p>
    </main>
  );
}
