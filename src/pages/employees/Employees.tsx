
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
  type EmployeeInput,
} from "../../services/employeeService";
import type { Employee, UserRole } from "../../types/user";

const emptyForm: EmployeeInput = {
  name: "",
  email: "",
  department: "",
  role: "employee",
};

export default function Employees() {
  const { user, profile } = useAuth();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [form, setForm] = useState<EmployeeInput>(emptyForm);
  const [uid, setUid] = useState("");
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = profile?.role === "admin" || profile?.role === "manager";
  const canDelete = profile?.role === "admin" || profile?.role === "manager";

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!profile) {
      throw new Error("User profile is unavailable.");
    }

    try {
      const data = await getEmployees(
        profile.role,
        profile.department
      );
      setEmployees(data);
    } catch (err) {
      console.error("Failed to load employees:", err);
      setError("Unable to load employees. Check your Firestore Security Rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const departments = useMemo(
    () => [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort(),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(normalizedSearch) ||
        employee.email.toLowerCase().includes(normalizedSearch);

      const matchesDepartment =
        departmentFilter === "all" ||
        employee.department === departmentFilter;

      const matchesRole =
        roleFilter === "all" || employee.role === roleFilter;

      // Employees may only see their own profile.
      const matchesAccess =
        profile?.role !== "employee" || employee.id === user?.uid;

      return matchesSearch && matchesDepartment && matchesRole && matchesAccess;
    });
  }, [employees, search, departmentFilter, roleFilter, profile?.role, user?.uid]);

  function startCreate() {
    setEditingUid(null);
    setUid("");
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function startEdit(employee: Employee) {
    setEditingUid(employee.id);
    setUid(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.email.trim() || !form.department.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    if (!editingUid && !uid.trim()) {
      setError("Enter the employee's Firebase Authentication UID.");
      return;
    }

    setSaving(true);

    try {
      if (editingUid) {
        await updateEmployee(editingUid, form);
        setSuccess("Employee profile updated successfully.");
      } else {
        await createEmployee(uid.trim(), form);
        setSuccess("Employee profile created successfully.");
      }

      setShowForm(false);
      setEditingUid(null);
      setForm(emptyForm);
      setUid("");
      await loadEmployees();
    } catch (error) {
  console.error("Failed to save employee:", error);

  if (error instanceof Error) {
    alert(`Failed to save employee: ${error.message}`);
  } else {
    alert("Failed to save employee. Check the browser console.");
  }
}
}

  async function handleDelete(employee: Employee) {
    if (employee.id === user?.uid) {
      setError("You cannot delete your own profile here.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the Firestore profile for ${employee.name}? This does not delete their Authentication account.`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteEmployee(employee.id);
      setSuccess("Employee profile deleted.");
      await loadEmployees();
    } catch (err) {
      console.error("Employee deletion failed:", err);
      setError("Unable to delete this profile. Check your permissions.");
    }
  }

  return (
    <section className="employees-page">
      <header className="page-header">
        <div>
          <h1>Employee Management</h1>
          <p>Manage employee profiles, departments, and roles.</p>
        </div>

        {canManage && (
          <button type="button" onClick={startCreate}>
            Add employee
          </button>
        )}
      </header>

      {error && <p className="error" role="alert">{error}</p>}
      {success && <p className="success" role="status">{success}</p>}

      {showForm && canManage && (
        <form className="employee-form" onSubmit={handleSubmit}>
          <h2>{editingUid ? "Edit employee" : "Add employee profile"}</h2>

          {!editingUid && (
            <>
              <label htmlFor="employee-uid">Firebase Authentication UID</label>
              <input
                id="employee-uid"
                value={uid}
                onChange={(event) => setUid(event.target.value)}
                placeholder="Paste the employee's Firebase Auth UID"
                required
              />
              <p>
                Create the employee's Authentication account first. Then use
                its UID here.
              </p>
            </>
          )}

          <label htmlFor="employee-name">Full name</label>
          <input
            id="employee-name"
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
            required
          />

          <label htmlFor="employee-email">Email</label>
          <input
            id="employee-email"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
            required
          />

          <label htmlFor="employee-department">Department</label>
          <input
            id="employee-department"
            value={form.department}
            onChange={(event) =>
              setForm({ ...form, department: event.target.value })
            }
            required
          />

          <label htmlFor="employee-role">Role</label>
          <select
            id="employee-role"
            value={form.role}
            onChange={(event) =>
              setForm({ ...form, role: event.target.value as UserRole })
            }
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            {profile?.role === "admin" && (
              <option value="admin">Admin</option>
            )}
          </select>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save employee"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="employee-filters">
        <input
          aria-label="Search employees"
          placeholder="Search by name or email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          aria-label="Filter by department"
          value={departmentFilter}
          onChange={(event) => setDepartmentFilter(event.target.value)}
        >
          <option value="all">All departments</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {loading ? (
        <p>Loading employees...</p>
      ) : filteredEmployees.length === 0 ? (
        <p>No employees found.</p>
      ) : (
        <div className="table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>{employee.name}</td>
                  <td>{employee.email}</td>
                  <td>{employee.department}</td>
                  <td>{employee.role}</td>
                  {canManage && (
                    <td>
                      <button
                        type="button"
                        onClick={() => startEdit(employee)}
                      >
                        Edit
                      </button>{" "}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(employee)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
