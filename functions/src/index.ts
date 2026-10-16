
import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { FieldValue } from "firebase-admin/firestore";



setGlobalOptions({ maxInstances: 10 });

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

type AppRole = "admin" | "manager" | "employee";
const validRoles: AppRole[] = ["admin", "manager", "employee"];

const taskStatuses = ["pending", "in-progress", "completed"] as const;
type TaskStatus = (typeof taskStatuses)[number];

interface UserProfile {
  name?: string;
  email?: string;
  role: AppRole;
  department?: string;
}

interface AuthenticatedRequest extends Request {
  authUser?: admin.auth.DecodedIdToken;
  userProfile?: UserProfile;
}

/**
 * Validate the task ID from an Express route parameter.
 * Express types may define params.id as string | string[].
 */
function getTaskId(req: Request): string | null {
  const id = req.params.id;

  if (typeof id !== "string" || id.trim() === "") {
    return null;
  }

  return id;
}

/**
 * Verify the Firebase ID token and load the user's profile.
 */
async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing authentication token." });
      return;
    }

    const token = authorization.slice("Bearer ".length);
    const decoded = await admin.auth().verifyIdToken(token);
    const profileSnapshot = await db.collection("users").doc(decoded.uid).get();

    if (!profileSnapshot.exists) {
      res.status(403).json({ error: "User profile not found." });
      return;
    }

    const profile = profileSnapshot.data();

    if (!profile || !validRoles.includes(profile.role as AppRole)) {
      res.status(403).json({ error: "Invalid user role." });
      return;
    }

    req.authUser = decoded;
    req.userProfile = {
      name: profile.name,
      email: profile.email ?? decoded.email,
      role: profile.role as AppRole,
      department: profile.department,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      error: "Invalid or expired authentication token.",
    });
  }
}

/**
 * Restrict an endpoint to specified roles.
 */
function allowRoles(...roles: AppRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.userProfile || !roles.includes(req.userProfile.role)) {
      res.status(403).json({ error: "You do not have permission." });
      return;
    }

    next();
  };
}

/**
 * Load a task and enforce department/assignment access.
 * Admins can access any task.
 * Managers can access tasks in their department.
 * Employees can access tasks assigned to them.
 */
async function getAuthorizedTask(
  taskId: string,
  req: AuthenticatedRequest,
  res: Response,
) {
  const snapshot = await db.collection("tasks").doc(taskId).get();

  if (!snapshot.exists) {
    res.status(404).json({ error: "Task not found." });
    return null;
  }

  const task = snapshot.data()!;
  const profile = req.userProfile;

  if (!profile || !req.authUser) {
    res.status(401).json({ error: "User profile not available." });
    return null;
  }

  if (
    profile.role === "manager" &&
    (!profile.department || task.department !== profile.department)
  ) {
    res.status(403).json({
      error: "You cannot access tasks outside your department.",
    });
    return null;
  }

  if (
    profile.role === "employee" &&
    task.assignedTo !== req.authUser.uid
  ) {
    res.status(403).json({
      error: "You can only access tasks assigned to you.",
    });
    return null;
  }

  return { ref: snapshot.ref, task };
}

/**
 * Validate that a UID identifies an employee in the given department.
 */
async function isEmployeeInDepartment(
  uid: string,
  department: string,
): Promise<boolean> {
  const snapshot = await db.collection("users").doc(uid).get();
  const employee = snapshot.data();

  return Boolean(
    snapshot.exists &&
      employee &&
      employee.role === "employee" &&
      employee.department === department,
  );
}

/**
 * GET /health
 * Public API health check.
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "employee-task-management-api",
  });
});

/**
 * GET /me
 * Return the authenticated user's profile.
 */
app.get(
  "/me",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    res.json({
      uid: req.authUser?.uid,
      ...req.userProfile,
    });
  },
);

/**
 * GET /employees
 * Admins can view all user profiles.
 * Managers can view profiles in their department.
 */
app.get(
  "/employees",
  requireAuth,
  allowRoles("admin", "manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      let query: FirebaseFirestore.Query = db.collection("users");

      if (req.userProfile?.role === "manager") {
        const department = req.userProfile.department;

        if (!department) {
          res.status(403).json({
            error: "Manager department is not configured.",
          });
          return;
        }

        query = query.where("department", "==", department);
      }

      const snapshot = await query.get();

      const employees = snapshot.docs.map((document) => ({
        uid: document.id,
        ...document.data(),
      }));

      res.json({ employees });
    } catch (error) {
      console.error("Employees endpoint error:", error);
      res.status(500).json({ error: "Failed to retrieve employees." });
    }
  },
);

/**
 * GET /tasks
 * Admins see all tasks.
 * Managers see tasks in their department.
 * Employees see tasks assigned to them.
 */
app.get(
  "/tasks",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      let query: FirebaseFirestore.Query = db.collection("tasks");
      const profile = req.userProfile;

      if (!profile || !req.authUser) {
        res.status(401).json({ error: "User profile not available." });
        return;
      }

      if (profile.role === "manager") {
        if (!profile.department) {
          res.status(403).json({
            error: "Manager department is not configured.",
          });
          return;
        }

        query = query.where("department", "==", profile.department);
      } else if (profile.role === "employee") {
        query = query.where("assignedTo", "==", req.authUser.uid);
      }

      const snapshot = await query.get();

      const tasks = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      res.json({ tasks });
    } catch (error) {
      console.error("Tasks endpoint error:", error);
      res.status(500).json({ error: "Failed to retrieve tasks." });
    }
  },
);

/**
 * POST /tasks
 * Admins and managers can create tasks.
 */
app.post(
  "/tasks",
  requireAuth,
  allowRoles("admin", "manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, assignedTo, department, dueDate } = req.body;
      const profile = req.userProfile!;

      if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "A task title is required." });
        return;
      }

      let taskDepartment: string;

      if (profile.role === "manager") {
        if (!profile.department) {
          res.status(403).json({
            error: "Manager department is not configured.",
          });
          return;
        }

        taskDepartment = profile.department;

        if (department && department !== taskDepartment) {
          res.status(403).json({
            error: "Managers can only create tasks in their department.",
          });
          return;
        }
      } else {
        if (typeof department !== "string" || !department.trim()) {
          res.status(400).json({ error: "A department is required." });
          return;
        }

        taskDepartment = department.trim();
      }

      if (
        assignedTo !== undefined &&
        assignedTo !== null &&
        (typeof assignedTo !== "string" || !assignedTo.trim())
      ) {
        res.status(400).json({
          error: "assignedTo must be a valid employee UID or null.",
        });
        return;
      }

      if (
        dueDate !== undefined &&
        dueDate !== null &&
        (typeof dueDate !== "string" ||
          Number.isNaN(Date.parse(dueDate)))
      ) {
        res.status(400).json({
          error: "dueDate must be a valid date string or null.",
        });
        return;
      }

      if (
        assignedTo &&
        !(await isEmployeeInDepartment(assignedTo, taskDepartment))
      ) {
        res.status(400).json({
          error: "Assignee must be an employee in the task department.",
        });
        return;
      }

      const now = FieldValue.serverTimestamp()

      const taskData = {
        title: title.trim(),
        description:
          typeof description === "string" ? description.trim() : "",
        status: "pending" as TaskStatus,
        assignedTo: assignedTo || null,
        department: taskDepartment,
        dueDate: dueDate || null,
        createdBy: req.authUser!.uid,
        createdAt: now,
        updatedAt: now,
      };

      const taskRef = await db.collection("tasks").add(taskData);
      const created = await taskRef.get();

      res.status(201).json({
        id: taskRef.id,
        ...created.data(),
      });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task." });
    }
  },
);

/**
 * GET /tasks/:id
 * Retrieve one task if the user has access.
 */
app.get(
  "/tasks/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = getTaskId(req);

      if (!taskId) {
        res.status(400).json({ error: "Invalid task ID." });
        return;
      }

      const result = await getAuthorizedTask(taskId, req, res);

      if (!result) return;

      res.json({ id: result.ref.id, ...result.task });
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({ error: "Failed to retrieve task." });
    }
  },
);

/**
 * PATCH /tasks/:id
 * Admins and managers can update task details.
 */
app.patch(
  "/tasks/:id",
  requireAuth,
  allowRoles("admin", "manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = getTaskId(req);

      if (!taskId) {
        res.status(400).json({ error: "Invalid task ID." });
        return;
      }

      const result = await getAuthorizedTask(taskId, req, res);

      if (!result) return;

      const { title, description, dueDate } = req.body;
      const updates: Record<string, unknown> = {};

      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          res.status(400).json({
            error: "Title must be a non-empty string.",
          });
          return;
        }

        updates.title = title.trim();
      }

      if (description !== undefined) {
        if (typeof description !== "string") {
          res.status(400).json({
            error: "Description must be a string.",
          });
          return;
        }

        updates.description = description.trim();
      }

      if (dueDate !== undefined) {
        if (
          dueDate !== null &&
          (typeof dueDate !== "string" ||
            Number.isNaN(Date.parse(dueDate)))
        ) {
          res.status(400).json({
            error: "dueDate must be a valid date string or null.",
          });
          return;
        }

        updates.dueDate = dueDate;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          error: "No valid task fields provided.",
        });
        return;
      }

      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await result.ref.update(updates);

      const updated = await result.ref.get();
      res.json({ id: updated.id, ...updated.data() });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task." });
    }
  },
);

/**
 * PATCH /tasks/:id/status
 * Admins/managers can update status within their scope.
 * Employees can update status on tasks assigned to them.
 */
app.patch(
  "/tasks/:id/status",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status } = req.body;

      if (
        typeof status !== "string" ||
        !taskStatuses.includes(status as TaskStatus)
      ) {
        res.status(400).json({
          error: "Status must be pending, in-progress, or completed.",
        });
        return;
      }

      const taskId = getTaskId(req);

      if (!taskId) {
        res.status(400).json({ error: "Invalid task ID." });
        return;
      }

      const result = await getAuthorizedTask(taskId, req, res);

      if (!result) return;

      await result.ref.update({
        status: status as TaskStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updated = await result.ref.get();
      res.json({ id: updated.id, ...updated.data() });
    } catch (error) {
      console.error("Update task status error:", error);
      res.status(500).json({
        error: "Failed to update task status.",
      });
    }
  },
);

/**
 * PATCH /tasks/:id/assign
 * Admins and managers can assign tasks to employees
 * in the task's department.
 */
app.patch(
  "/tasks/:id/assign",
  requireAuth,
  allowRoles("admin", "manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { assignedTo } = req.body;

      if (typeof assignedTo !== "string" || !assignedTo.trim()) {
        res.status(400).json({
          error: "An employee UID is required.",
        });
        return;
      }

      const taskId = getTaskId(req);

      if (!taskId) {
        res.status(400).json({ error: "Invalid task ID." });
        return;
      }

      const result = await getAuthorizedTask(taskId, req, res);

      if (!result) return;

      if (
        !(await isEmployeeInDepartment(
          assignedTo,
          result.task.department,
        ))
      ) {
        res.status(400).json({
          error: "Assignee must be an employee in the task department.",
        });
        return;
      }

      await result.ref.update({
        assignedTo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updated = await result.ref.get();
      res.json({ id: updated.id, ...updated.data() });
    } catch (error) {
      console.error("Assign task error:", error);
      res.status(500).json({ error: "Failed to assign task." });
    }
  },
);

/**
 * DELETE /tasks/:id
 * Admins can delete any task.
 * Managers can delete tasks in their department.
 */
app.delete(
  "/tasks/:id",
  requireAuth,
  allowRoles("admin", "manager"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskId = getTaskId(req);

      if (!taskId) {
        res.status(400).json({ error: "Invalid task ID." });
        return;
      }

      const result = await getAuthorizedTask(taskId, req, res);

      if (!result) return;

      await result.ref.delete();
      res.status(204).send();
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task." });
    }
  },
);

/**
 * Return a JSON 404 for unknown API routes.
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found." });
});

export const api = onRequest(
  { region: "us-central1", cors: true },
  app,
);
