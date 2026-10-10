
import { useState } from "react";
import { ShoppingCart, LockKeyhole } from "lucide-react";

import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, logout, error: sessionError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      await login(email, password);
    } catch (err) {
      if (
        [
          "auth/invalid-credential",
          "auth/wrong-password",
          "auth/user-not-found",
        ].includes(err.code)
      ) {
        setFormError("Correo o contraseña incorrectos.");
      } else {
        setFormError(
          "No se pudo iniciar sesión. Inténtalo nuevamente."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
          <ShoppingCart size={30} />
        </div>

        <h1 className="text-center text-3xl font-bold">
          Ayvar <span className="text-blue-400">POS</span>
        </h1>

        <p className="mt-2 mb-8 text-center text-sm text-slate-400">
          Accede a tu sistema de gestión comercial
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="text-sm text-slate-300">
              Correo electrónico
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="correo@ejemplo.com"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm text-slate-300">
              Contraseña
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Tu contraseña"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          {(formError || sessionError) && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {formError || sessionError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold transition hover:bg-blue-500 disabled:opacity-50"
          >
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>

          {auth.currentUser && sessionError && (
            <button
              type="button"
              onClick={() => logout()}
              className="w-full text-sm text-slate-400 hover:text-white"
            >
              Cerrar sesión actual
            </button>
          )}
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <LockKeyhole size={14} />
          Acceso protegido por Firebase Authentication
        </div>
      </div>
    </main>
  );
}
