import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext"
import type { UserRole } from "../../types";

interface Props {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, profile, loading, profileError } = useAuth();

  if (loading) return <p>Loading application...</p>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <main>
        <h2>Profile unavailable</h2>
        <p>{profileError ?? "Your user profile could not be loaded."}</p>
      </main>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}