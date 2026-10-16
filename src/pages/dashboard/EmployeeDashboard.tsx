
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../contexts/AuthContext";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
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

function newest(records: Task[]) {
  return [...records].sort(
    (a, b) =>
      (toDate(b.createdAt)?.getTime() ?? 0) -
      (toDate(a.createdAt)?.getTime() ?? 0)
  );
}

function statusLabel(status: Task["status"]) {
  return status === "in-progress"
    ? "In Progress"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export default function EmployeeDashboard() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.uid) {
        setError("Your authentication session is unavailable.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(
          query(
            collection(db, "tasks"),
            where("assignedTo", "==", user.uid)
          )
        );

        if (active) {
          setTasks(
            snapshot.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as Task[]
          );
        }
      } catch (err) {
        console.error("Employee dashboard error:", err);
        if (active) {
          setError("Unable to load your tasks. Check your connection and permissions.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  if (loading) return <p>Loading your dashboard...</p>;
  if (error) return <p role="alert">{error}</p>;

  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTasks = tasks
    .filter((task) => {
      if (!task.dueDate || task.status === "completed") return false;
      const due = new Date(`${task.dueDate}T00:00:00`);
      return !Number.isNaN(due.getTime()) && due >= today;
    })
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 5);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <header>
        <h1>My Dashboard</h1>
        <p style={{ color: "#6b7280" }}>
          Welcome, {profile?.name || user?.email || "Employee"}.
          Here is your task overview.
        </p>
      </header>

      <section style={statsGrid}>
        <Stat title="Assigned Tasks" value={tasks.length} />
        <Stat title="Completed" value={completed} />
        <Stat title="Pending" value={pending} />
        <Stat title="In Progress" value={inProgress} />
      </section>

      <section style={panel}>
        <h2>Upcoming Deadlines</h2>
        {upcomingTasks.length === 0 ? (
          <p>No upcoming deadlines for unfinished tasks.</p>
        ) : (
          <ul style={{ paddingLeft: 20 }}>
            {upcomingTasks.map((task) => (
              <li key={task.id} style={{ marginBottom: 12 }}>
                <strong>{task.title}</strong>
                {" — "}
                Due {task.dueDate}
                {" · "}
                {statusLabel(task.status)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={panel}>
        <h2>Recent Assigned Tasks</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={cell}>Task</th>
                <th style={cell}>Status</th>
                <th style={cell}>Priority</th>
                <th style={cell}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {newest(tasks).slice(0, 5).map((task) => (
                <tr key={task.id}>
                  <td style={cell}>{task.title}</td>
                  <td style={cell}>{statusLabel(task.status)}</td>
                  <td style={cell}>{task.priority || "—"}</td>
                  <td style={cell}>{task.dueDate || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && <p>You have no assigned tasks yet.</p>}
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <article style={statCard}>
      <p style={{ color: "#6b7280" }}>{title}</p>
      <strong style={{ fontSize: 30 }}>{value}</strong>
    </article>
  );
}

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
