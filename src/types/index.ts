export type UserRole = "admin" | "manager" | "employee";

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  department: string;
  createdAt?: unknown;
}