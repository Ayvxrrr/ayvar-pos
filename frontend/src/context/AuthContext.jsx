
import {createContext,useContext,useEffect,useState,} from "react";
import {onAuthStateChanged,signInWithEmailAndPassword,signOut,} from "firebase/auth";

import { auth } from "../firebase";

const AuthContext = createContext(null);

// En producción Firebase Hosting redirige /api/** a Cloud Run.
// En desarrollo se utiliza el backend de Express.
const API_ROOT = import.meta.env.PROD
  ? ""
  : (import.meta.env.VITE_API_URL || "http://localhost:4000");

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!active) return;

        setLoading(true);
        setError("");

        if (!firebaseUser) {
          setSession(null);
          setLoading(false);
          return;
        }

        try {
          const token = await firebaseUser.getIdToken();

          const response = await fetch(
            `${API_ROOT}/api/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "No se pudo obtener el perfil"
            );
          }

          if (active) {
            setSession(data);
          }
        } catch (err) {
          if (active) {
            setSession(null);
            setError(
              err.message || "Error al verificar la sesión"
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function login(email, password) {
    return signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );
  }

  async function logout() {
    await signOut(auth);
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        error,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return context;
}
