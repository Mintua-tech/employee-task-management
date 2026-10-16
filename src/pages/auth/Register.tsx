
import { useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

import { auth, db } from "../../services/firebase";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !department.trim()) {
      setError("Name and department are required.");
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
    let createdUser: typeof auth.currentUser = null;
    let profileCreated = false;

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      createdUser = credential.user;

      await updateProfile(createdUser, {
        displayName: name.trim(),
      });

      await setDoc(doc(db, "users", createdUser.uid), {
        name: name.trim(),
        email: createdUser.email ?? email.trim(),
        department: department.trim(),
        role: "employee",
        createdAt: serverTimestamp(),
      });

      profileCreated = true;

      try {
        await sendEmailVerification(createdUser);
      } catch (verificationError) {
        // Account and profile exist; verification can be requested later.
        console.error("Verification email could not be sent:", verificationError);
      }

      await signOut(auth);

      setSuccess(
        "Registration successful. If verification email was sent, check your inbox. You can now sign in."
      );

      window.setTimeout(() => navigate("/login"), 1800);
    } catch (err: unknown) {
      console.error("Registration failed:", err);

      if (createdUser && !profileCreated) {
        try {
          await deleteUser(createdUser);
        } catch (cleanupError) {
          console.error("Could not clean up incomplete account:", cleanupError);
        }
      }

      const code =
        typeof err === "object" &&
        err !== null &&
        "code" in err
          ? String(err.code)
          : "";

      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (code === "auth/invalid-email") {
        setError("Enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Choose a stronger password.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Email/password sign-up is not enabled in Firebase.");
      } else if (code === "permission-denied") {
        setError(
          "Your account was created, but Firestore rejected the profile. Check your Firestore rules and retry with administrator assistance."
        );
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 440, margin: "48px auto", padding: 24 }}>
      <h1>Create an account</h1>
      <p>Register as an employee to access the system.</p>

      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
      {success && <p role="status" style={{ color: "green" }}>{success}</p>}

      <form onSubmit={handleRegister}>
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          style={inputStyle}
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={inputStyle}
        />

        <label htmlFor="department">Department</label>
        <input
          id="department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          required
          style={inputStyle}
        />

        <label htmlFor="password">Password</label>
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

        <label htmlFor="confirmPassword">Confirm password</label>
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
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>

      <p>
        Already registered? <Link to="/login">Sign in</Link>
      </p>
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
  marginTop: 8,
  cursor: "pointer",
};
