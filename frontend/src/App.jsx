
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  ShoppingCart,
  Store,
  ShieldCheck,
  LogOut,
  Package,
  BarChart3,
  LockKeyhole,
} from "lucide-react";

import { auth } from "./firebase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        setLoading(true);
        setSession(null);

        if (!user) {
          setLoading(false);
          return;
        }

        try {
          const token = await user.getIdToken();

          const response = await fetch(`${API_URL}/api/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "No se pudo obtener el perfil"
            );
          }

          setSession(data);
          setError("");
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  async function handleLogin(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
    } catch (err) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setSession(null);
    setPassword("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">
          Verificando sesión de Ayvar POS...
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
        <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">

          <div className="flex justify-center mb-5">
            <div className="bg-blue-600 p-4 rounded-2xl">
              <ShoppingCart size={30} />
            </div>
          </div>

          <h1 className="text-center text-3xl font-bold">
            Ayvar <span className="text-blue-400">POS</span>
          </h1>

          <p className="text-center text-slate-400 mt-2 mb-8">
            Inicia sesión para administrar tu negocio
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-sm text-slate-300">
                Correo electrónico
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">
                Contraseña
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 rounded-xl font-semibold transition"
            >
              {submitting ? "Ingresando..." : "Iniciar sesión"}
            </button>

            {auth.currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-sm text-slate-400 hover:text-white"
              >
                Cerrar sesión actual
              </button>
            )}
          </form>

          <p className="text-center text-xs text-slate-500 mt-8">
            Ayvar POS · Gestión comercial
          </p>
        </div>
      </main>
    );
  }

  const { user, business } = session;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">

        <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-xl">
              <ShoppingCart size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Ayvar <span className="text-blue-400">POS</span>
              </h1>
              <p className="text-sm text-slate-400">
                Panel de administración
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </header>

        <section className="mb-8">
          <h2 className="text-3xl font-semibold">
            Bienvenido, {user.name}
          </h2>
          <p className="text-slate-400 mt-2">
            Ya tienes acceso a tu sistema de gestión comercial.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-3">

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <Store className="text-blue-400 mb-4" size={27} />
            <p className="text-slate-400 text-sm">Negocio</p>
            <h3 className="font-semibold text-xl mt-1">
              {business.name}
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              Moneda: {business.currency}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <ShieldCheck className="text-emerald-400 mb-4" size={27} />
            <p className="text-slate-400 text-sm">Rol asignado</p>
            <h3 className="font-semibold text-xl mt-1">
              {user.role}
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              Sesión validada por Firebase
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <LockKeyhole className="text-violet-400 mb-4" size={27} />
            <p className="text-slate-400 text-sm">Estado</p>
            <h3 className="font-semibold text-xl mt-1">
              Acceso autorizado
            </h3>
            <p className="text-slate-500 text-sm mt-2">
              API y Firestore conectados
            </p>
          </div>

        </div>

        <h3 className="font-semibold text-xl mt-10 mb-5">
          Próximos módulos
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Productos", icon: Package },
            { title: "Ventas", icon: ShoppingCart },
            { title: "Reportes", icon: BarChart3 },
          ].map(({ title, icon: Icon }) => (
            <div
              key={title}
              className="border border-slate-800 rounded-2xl p-6 flex items-center gap-3 text-slate-400"
            >
              <Icon size={23} />
              <span>{title} — Próximamente</span>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
