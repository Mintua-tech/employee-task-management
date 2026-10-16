import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function testFirestoreConnection() {
  console.log("Firebase project ID:", db.app.options.projectId);
  console.log("Authenticated user:", auth.currentUser?.uid ?? "Not signed in");

  const user = auth.currentUser;

  if (!user) {
    console.log("Sign in first, then run this test.");
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));

    console.log("Firestore connection successful.");
    console.log("User profile exists:", snapshot.exists());
  } catch (error) {
    console.error("Firestore connection failed:", error);
  }
}