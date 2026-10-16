
import type { UserRole, UserProfile } from "./index";

export type { UserRole, UserProfile };

export interface Employee extends UserProfile {
  id: string;
}
