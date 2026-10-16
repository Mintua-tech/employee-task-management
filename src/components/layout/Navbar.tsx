
import { useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function Navbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    try {
      setLoggingOut(true);
      setError("");
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  const roleLabel = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
    : "User";

  return (
    <header
      style={{
        minHeight: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 24px",
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        boxSizing: "border-box",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            color: "#111827",
          }}
        >
          Employee Task Management
        </h2>
        <span style={{ color: "#6b7280", fontSize: 12 }}>
          Manage employees and tasks
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 14,
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600, color: "#111827" }}>
            {profile?.name || user?.email || "User"}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {roleLabel}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            padding: "9px 14px",
            border: "none",
            borderRadius: 6,
            background: "#dc2626",
            color: "#ffffff",
            cursor: loggingOut ? "wait" : "pointer",
            opacity: loggingOut ? 0.7 : 1,
          }}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </header>
  );
}
