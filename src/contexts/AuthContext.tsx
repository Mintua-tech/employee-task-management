// import {
//   createContext,
//   useContext,
//   useEffect,
//   useState,
//   type ReactNode,
// } from "react";
// import {
//   onAuthStateChanged,
//   signOut,
//   type User,
// } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";
// import { auth, db } from "../services/firebase";
// import type { UserProfile } from "../types";

// interface AuthContextType {
//   user: User | null;
//   profile: UserProfile | null;
//   loading: boolean;
//   profileError: string | null;
//   logout: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [profile, setProfile] = useState<UserProfile | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [profileError, setProfileError] = useState<string | null>(null);

//   useEffect(() => {
//     return onAuthStateChanged(auth, async (firebaseUser) => {
//       setUser(firebaseUser);
//       setProfile(null);
//       setProfileError(null);

//       if (!firebaseUser) {
//         setLoading(false);
//         return;
//       }

//       try {
//         const snapshot = await getDoc(
//           doc(db, "users", firebaseUser.uid)
//         );

//         if (!snapshot.exists()) {
//           setProfileError(
//             "Your account has no employee profile. Contact an administrator."
//           );
//           return;
//         }

//         const data = snapshot.data();

//         if (
//           typeof data.name !== "string" ||
//           typeof data.email !== "string" ||
//           typeof data.department !== "string" ||
//           !["admin", "manager", "employee"].includes(data.role)
//         ) {
//           setProfileError("Your employee profile contains invalid data.");
//           return;
//         }

//         setProfile(data as UserProfile);
//       } catch {
//         setProfileError(
//           "Unable to load your profile. Check your connection and permissions."
//         );
//       } finally {
//         setLoading(false);
//       }
//     });
//   }, []);

//   async function logout() {
//     await signOut(auth);
//   }

//   return (
//     <AuthContext.Provider
//       value={{ user, profile, loading, profileError, logout }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);

//   if (!context) {
//     throw new Error("useAuth must be used inside AuthProvider");
//   }

//   return context;
// }


import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import type { UserProfile } from "../types";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let requestId = 0;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentRequest = ++requestId;

      setLoading(true);
      setUser(firebaseUser);
      setProfile(null);
      setProfileError(null);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const documentPath = `users/${firebaseUser.uid}`;

      

      try {
        const snapshot = await getDoc(doc(db, "users", firebaseUser.uid));

        if (currentRequest !== requestId) return;

        

        if (!snapshot.exists()) {
          setProfileError(
            `Profile not found at ${documentPath}. Verify the document ID and Firestore database.`
          );
          return;
        }

        const data = snapshot.data();

        if (
          typeof data.name !== "string" ||
          typeof data.email !== "string" ||
          typeof data.department !== "string" ||
          !["admin", "manager", "employee"].includes(data.role)
        ) {
          setProfileError(
            "The profile exists, but its fields or role are invalid. Use role: admin, manager, or employee."
          );
          return;
        }

        setProfile(data as UserProfile);
      } catch (error) {
        if (currentRequest !== requestId) return;

        console.error("Firestore profile lookup failed:", error);

        setProfileError(
          "Unable to read your profile. Check Firestore Security Rules and the configured database."
        );
      } finally {
        if (currentRequest === requestId) {
          setLoading(false);
        }
      }
    });

    return () => {
      requestId++;
      unsubscribe();
    };
  }, []);

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, profileError, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
