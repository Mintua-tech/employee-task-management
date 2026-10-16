import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";
import type { Employee, UserRole, UserProfile } from "../types/user";

const USERS_COLLECTION = "users";

export interface EmployeeInput {
  name: string;
  email: string;
  department: string;
  role: UserRole;
}

export async function getEmployees(
  role: UserRole,
  department: string
): Promise<Employee[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  let employeesQuery;

  if (role === "admin") {
    // Admin can view all employees.
    employeesQuery = usersRef;
  } else if (role === "manager") {
    // Manager can view employees in their own department only.
    employeesQuery = query(
      usersRef,
      where("department", "==", department)
    );
  } else {
    // Employees cannot list the users collection.
    throw new Error("You do not have permission to view employees.");
  }

    const snapshot = await getDocs(employeesQuery);

  return snapshot.docs.map((employeeDoc) => ({
    id: employeeDoc.id,
    ...employeeDoc.data(),
  })) as Employee[];

  
}

export async function createEmployee(
  uid: string,
  input: EmployeeInput,
): Promise<void> {
  const employeeRef = doc(db, USERS_COLLECTION, uid);

  const profile: UserProfile = {
    name: input.name.trim(),
    email: input.email.trim(),
    department: input.department.trim(),
    role: input.role,
    createdAt: serverTimestamp(),
  };

  await setDoc(employeeRef, profile);
}

export async function updateEmployee(
  uid: string,
  input: EmployeeInput,
): Promise<void> {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    name: input.name.trim(),
    email: input.email.trim(),
    department: input.department.trim(),
    role: input.role,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEmployee(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
}
