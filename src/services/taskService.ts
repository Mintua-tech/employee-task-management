
import { apiRequest } from "./api";

export type TaskStatus = "pending" | "in-progress" | "completed";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo: string | null;
  department: string;
  dueDate: string | null;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  department: string;
  dueDate?: string | null;
  assignedTo?: string | null;
}

export interface TaskStatusInput {
  status: TaskStatus;
}

export interface TaskAssignmentInput {
  assignedTo: string;
}

interface TasksResponse {
  tasks: Task[];
}

interface TaskResponse {
  task: Task;
}

interface MessageResponse {
  message: string;
}

/**
 * Get tasks available to the currently authenticated user.
 * The backend applies role-based access control.
 */
export async function getTasks(): Promise<Task[]> {
  const response = await apiRequest<TasksResponse>("/tasks");
  return response.tasks;
}

/**
 * Get a single task by ID.
 */
export async function getTaskById(taskId: string): Promise<Task> {
  const response = await apiRequest<TaskResponse>(
    `/tasks/${encodeURIComponent(taskId)}`,
  );

  return response.task;
}

/**
 * Create a task.
 * Admins can select a department; managers are restricted
 * to their own department by the backend.
 */
export async function createTask(input: TaskInput): Promise<Task> {
  const response = await apiRequest<TaskResponse>("/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      department: input.department.trim(),
      dueDate: input.dueDate || null,
      assignedTo: input.assignedTo || null,
    }),
  });

  return response.task;
}

/**
 * Update editable task details.
 * Assignment and department changes use their own endpoint.
 */
export async function updateTask(
  taskId: string,
  input: Partial<Pick<TaskInput, "title" | "description" | "dueDate">>,
): Promise<Task> {
  const payload: Record<string, string | null> = {};

  if (input.title !== undefined) {
    payload.title = input.title.trim();
  }

  if (input.description !== undefined) {
    payload.description = input.description.trim();
  }

  if (input.dueDate !== undefined) {
    payload.dueDate = input.dueDate || null;
  }

  const response = await apiRequest<TaskResponse>(
    `/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return response.task;
}

/**
 * Change task status.
 * The backend determines whether the current user may update it.
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  const response = await apiRequest<TaskResponse>(
    `/tasks/${encodeURIComponent(taskId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status } satisfies TaskStatusInput),
    },
  );

  return response.task;
}

/**
 * Assign a task to an employee.
 */
export async function assignTask(
  taskId: string,
  assignedTo: string,
): Promise<Task> {
  const response = await apiRequest<TaskResponse>(
    `/tasks/${encodeURIComponent(taskId)}/assign`,
    {
      method: "PATCH",
      body: JSON.stringify({
        assignedTo,
      } satisfies TaskAssignmentInput),
    },
  );

  return response.task;
}

/**
 * Delete a task.
 */
export async function deleteTask(taskId: string): Promise<void> {
  await apiRequest<MessageResponse>(
    `/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "DELETE",
    },
  );
}
