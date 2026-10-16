
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  assignTask,
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  updateTaskStatus,
  type Task as ApiTask,
  type TaskStatus,
} from "../../services/taskService";
import { getEmployees } from "../../services/employeeService";
import type { Employee } from "../../types/user";

type TaskPriority = "low" | "medium" | "high";

type TaskItem = ApiTask & {
  assignedToName?: string;
  priority?: TaskPriority;
};

interface TaskForm {
  title: string;
  description: string;
  assignedTo: string;
  priority: TaskPriority;
  dueDate: string;
}

const emptyForm: TaskForm = {
  title: "",
  description: "",
  assignedTo: "",
  priority: "medium",
  dueDate: "",
};

const statuses: TaskStatus[] = [
  "pending",
  "in-progress",
  "completed",
];

export default function Tasks() {
  const { user, profile } = useAuth();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const role = profile?.role;
  const canManageTasks = role === "admin" || role === "manager";

  const loadData = useCallback(async () => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Task data comes from the Cloud Functions API.
      const taskResults = await getTasks();
      setTasks(taskResults as TaskItem[]);

      // Employee loading is separate from task loading.
      if (canManageTasks && role) {
        const employeeResults = await getEmployees(
          role,
          profile.department,
        );
        setEmployees(employeeResults);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error("Failed to load task page data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load tasks. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [user, profile, role, canManageTasks]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resetForm() {
    setForm(emptyForm);
    setEditingTask(null);
  }

  function startEditing(task: TaskItem) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      assignedTo: task.assignedTo ?? "",
      priority: task.priority ?? "medium",
      dueDate: task.dueDate ?? "",
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!user || !profile || !canManageTasks) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const assignedEmployee = employees.find(
        (employee) => employee.id === form.assignedTo,
      );

      if (!assignedEmployee) {
        throw new Error("Please select a valid employee.");
      }

      if (assignedEmployee.role !== "employee") {
        throw new Error("Tasks can only be assigned to employees.");
      }

      if (
        role === "manager" &&
        assignedEmployee.department !== profile.department
      ) {
        throw new Error(
          "You can only assign tasks within your department.",
        );
      }

      if (editingTask) {
        // Update task details through the API.
        await updateTask(editingTask.id, {
          title: form.title.trim(),
          description: form.description.trim(),
          dueDate: form.dueDate || null,
        });

        // Keep assignment changes on the dedicated API endpoint.
        if (form.assignedTo !== editingTask.assignedTo) {
          await assignTask(editingTask.id, form.assignedTo);
        }

        setMessage("Task updated successfully.");
      } else {
        await createTask({
          title: form.title.trim(),
          description: form.description.trim(),
          department: assignedEmployee.department,
          assignedTo: assignedEmployee.id,
          dueDate: form.dueDate || null,
        });

        setMessage("Task created and assigned successfully.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error("Failed to save task:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save the task.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    task: TaskItem,
    status: TaskStatus,
  ) {
    setError("");
    setMessage("");

    try {
      await updateTaskStatus(task.id, status);
      setMessage("Task status updated successfully.");
      await loadData();
    } catch (err) {
      console.error("Failed to update task status:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not update task status.",
      );
    }
  }

  async function handleDelete(task: TaskItem) {
    if (!canManageTasks) return;

    const confirmed = window.confirm(
      `Delete the task "${task.title}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await deleteTask(task.id);
      setMessage("Task deleted successfully.");
      await loadData();
    } catch (err) {
      console.error("Failed to delete task:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete task.",
      );
    }
  }

  const employeeName = (task: TaskItem) => {
    const employee = employees.find(
      (item) => item.id === task.assignedTo,
    );

    return (
      task.assignedToName ||
      employee?.name ||
      task.assignedTo ||
      "Unassigned"
    );
  };

  const filteredTasks = tasks.filter((task) => {
    const searchMatch = [
      task.title,
      task.description ?? "",
      employeeName(task),
      task.department,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());

    const statusMatch =
      statusFilter === "all" || task.status === statusFilter;

    return searchMatch && statusMatch;
  });

  if (!profile) {
    return (
      <main>
        <p>Your user profile is unavailable.</p>
      </main>
    );
  }

  return (
    <main className="tasks-page">
      <header>
        <h1>Task Management</h1>
        <p>Create tasks, assign employees, and track progress.</p>
        <p>
          Signed in as <strong>{profile.name}</strong> ({profile.role})
        </p>
      </header>

      {message && <p role="status" style={{ color: "green" }}>{message}</p>}
      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}

      {canManageTasks && (
        <section>
          <h2>{editingTask ? "Edit Task" : "Create New Task"}</h2>

          <form onSubmit={handleSubmit}>
            <p>
              <label htmlFor="task-title">Title</label>
              <br />
              <input
                id="task-title"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                required
                maxLength={150}
              />
            </p>

            <p>
              <label htmlFor="task-description">Description</label>
              <br />
              <textarea
                id="task-description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                rows={4}
                required
              />
            </p>

            <p>
              <label htmlFor="task-assignee">Assign to employee</label>
              <br />
              <select
                id="task-assignee"
                value={form.assignedTo}
                onChange={(event) =>
                  setForm({ ...form, assignedTo: event.target.value })
                }
                required
              >
                <option value="">Select an employee</option>
                {employees
                  .filter(
                    (employee) =>
                      employee.role === "employee" &&
                      (role === "admin" ||
                        employee.department === profile.department),
                  )
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} — {employee.department}
                    </option>
                  ))}
              </select>
            </p>

            <p>
              <label htmlFor="task-priority">Priority</label>
              <br />
              <select
                id="task-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm({
                    ...form,
                    priority: event.target.value as TaskPriority,
                  })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </p>

            <p>
              <label htmlFor="task-due-date">Due date</label>
              <br />
              <input
                id="task-due-date"
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm({ ...form, dueDate: event.target.value })
                }
                required
              />
            </p>

            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingTask
                  ? "Update Task"
                  : "Create Task"}
            </button>{" "}

            {editingTask && (
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </form>
        </section>
      )}

      <hr />

      <section>
        <h2>Tasks ({filteredTasks.length})</h2>

        <p>
          <label htmlFor="task-search">Search tasks</label>
          <br />
          <input
            id="task-search"
            type="search"
            placeholder="Search title, description, employee..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </p>

        <p>
          <label htmlFor="task-status-filter">Filter by status</label>
          <br />
          <select
            id="task-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </p>

        {loading ? (
          <p>Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  {canManageTasks && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      <br />
                      {task.description}
                    </td>
                    <td>{employeeName(task)}</td>
                    <td>{task.department}</td>
                    <td>{task.priority ?? "medium"}</td>
                    <td>{task.dueDate || "Not set"}</td>
                    <td>
                      <select
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        onChange={(event) =>
                          void handleStatusChange(
                            task,
                            event.target.value as TaskStatus,
                          )
                        }
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    {canManageTasks && (
                      <td>
                        <button
                          type="button"
                          onClick={() => startEditing(task)}
                        >
                          Edit
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => void handleDelete(task)}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
