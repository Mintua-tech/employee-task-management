
import { useAuth } from "../../contexts/AuthContext";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import EmployeeDashboard from "./EmployeeDashboard";

export default function Dashboard() {
  const { profile } = useAuth();

  

  if (!profile) {
    return <p>Loading dashboard profile...</p>;
  }

  switch (profile.role) {
    case "admin":
      return <AdminDashboard />;

    case "manager":
      return <ManagerDashboard />;

    case "employee":
      return <EmployeeDashboard />;

    default:
      return <p role="alert">Your account has an unsupported role.</p>;
  }
}
