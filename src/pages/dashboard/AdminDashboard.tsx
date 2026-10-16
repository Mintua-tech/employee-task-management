
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  createdAt?: { toDate: () => Date } | null;
}

interface Task {
  id: string;
  title: string;
  assignedToName?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  createdAt?: { toDate: () => Date } | null;
}

function toDate(value?: { toDate: () => Date } | null): Date | null {
  try {
    return value ? value.toDate() : null;
  } catch {
    return null;
  }
}

function dateLabel(value?: { toDate: () => Date } | null) {
  return toDate(value)?.toLocaleDateString() ?? "—";
}

function newest<T extends { createdAt?: { toDate: () => Date } | null }>(
  records: T[]
) {
  return [...records].sort(
    (a, b) =>
      (toDate(b.createdAt)?.getTime() ?? 0) -
      (toDate(a.createdAt)?.getTime() ?? 0)
  );
}

export default function AdminDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [usersSnapshot, tasksSnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "tasks")),
        ]);

        if (!active) return;

        setEmployees(
          usersSnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Employee[]
        );

        setTasks(
          tasksSnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Task[]
        );
      } catch (err) {
        console.error("Admin dashboard error:", err);
        if (active) {
          setError("Unable to load company statistics. Check Firestore permissions.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p>Loading company dashboard...</p>;
  if (error) return <p role="alert">{error}</p>;

  const employeeProfiles = employees.filter((e) => e.role === "employee");
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;

  return (
    <div style={pageStyle}>
      <header>
        <h1>Admin Dashboard</h1>
        <p style={muted}>Company-wide employee and task overview</p>
      </header>

      <section style={statsGrid}>
        <Stat title="Employees" value={employeeProfiles.length} />
        <Stat title="Total Tasks" value={tasks.length} />
        <Stat title="Completed Tasks" value={completed} />
        <Stat title="Pending Tasks" value={pending} />
        <Stat title="In Progress" value={inProgress} />
        <Stat title="Managers" value={employees.filter((e) => e.role === "manager").length} />
      </section>

      <section style={panel}>
        <h2>Recent Tasks</h2>
        <div style={scroll}>
          <table style={table}>
            <thead>
              <tr>
                <th style={cell}>Task</th>
                <th style={cell}>Assigned To</th>
                <th style={cell}>Status</th>
                <th style={cell}>Priority</th>
                <th style={cell}>Due Date</th>
                <th style={cell}>Created</th>
              </tr>
            </thead>
            <tbody>
              {newest(tasks).slice(0, 5).map((task) => (
                <tr key={task.id}>
                  <td style={cell}>{task.title}</td>
                  <td style={cell}>{task.assignedToName || "Unassigned"}</td>
                  <td style={cell}>{task.status}</td>
                  <td style={cell}>{task.priority || "—"}</td>
                  <td style={cell}>{task.dueDate || "—"}</td>
                  <td style={cell}>{dateLabel(task.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && <p>No tasks created yet.</p>}
        </div>
      </section>

      <section style={panel}>
        <h2>Recent Employees</h2>
        <div style={scroll}>
          <table style={table}>
            <thead>
              <tr>
                <th style={cell}>Name</th>
                <th style={cell}>Email</th>
                <th style={cell}>Department</th>
                <th style={cell}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {newest(employeeProfiles).slice(0, 5).map((employee) => (
                <tr key={employee.id}>
                  <td style={cell}>{employee.name}</td>
                  <td style={cell}>{employee.email}</td>
                  <td style={cell}>{employee.department}</td>
                  <td style={cell}>{dateLabel(employee.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {employeeProfiles.length === 0 && <p>No employee profiles found.</p>}
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <article style={statCard}>
      <p style={muted}>{title}</p>
      <strong style={{ fontSize: 30 }}>{value}</strong>
    </article>
  );
}

const pageStyle = { display: "grid", gap: 22 };
const muted = { color: "#6b7280" };
const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 16,
};
const statCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
};
const panel = {
  background: "#fff",
  padding: 20,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
};
const scroll = { overflowX: "auto" as const };
const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  textAlign: "left" as const,
};
const cell = {
  padding: "12px 10px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap" as const,
};
