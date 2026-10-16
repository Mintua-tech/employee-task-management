
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "../../types";

interface NavigationItem {
  label: string;
  path: string;
  roles: UserRole[];
}

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: ["admin", "manager", "employee"],
  },
  {
    label: "Employees",
    path: "/employees",
    roles: ["admin", "manager"],
  },
  {
    label: "Tasks",
    path: "/tasks",
    roles: ["admin", "manager", "employee"],
  },
];

export default function Sidebar() {
  const { profile } = useAuth();

  const visibleItems = navigationItems.filter((item) =>
    profile ? item.roles.includes(profile.role) : false
  );

  return (
    <aside
      style={{
        width: 230,
        minWidth: 230,
        minHeight: "100%",
        background: "#111827",
        color: "#ffffff",
        padding: "24px 14px",
        boxSizing: "border-box",
      }}
    >
      <p
        style={{
          margin: "0 10px 18px",
          color: "#9ca3af",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        MAIN MENU
      </p>

      <nav aria-label="Main navigation">
        <ul
          style={{
            display: "grid",
            gap: 8,
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                style={({ isActive }) => ({
                  display: "block",
                  padding: "12px 14px",
                  borderRadius: 7,
                  textDecoration: "none",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#ffffff" : "#d1d5db",
                  background: isActive ? "#2563eb" : "transparent",
                })}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
