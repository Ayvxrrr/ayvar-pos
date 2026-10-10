
import { Link } from "react-router-dom";
import { ArrowLeft, Wrench } from "lucide-react";

export default function ModulePage({
  title,
  description,
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-400">
          AYVAR POS / MÓDULOS
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {title}
        </h1>

        <p className="mt-2 text-slate-400">
          {description}
        </p>
      </div>

      <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="rounded-2xl bg-blue-500/10 p-5 text-blue-400">
          <Wrench size={32} />
        </div>

        <h2 className="mt-5 text-xl font-semibold">
          Módulo en desarrollo
        </h2>

        <p className="mt-3 max-w-md text-sm text-slate-400">
          Esta sección ya tiene su propia ruta.
          Próximamente implementaremos sus funcionalidades
          y conexión con Firestore.
        </p>

        <Link
          to="/panel"
          className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium transition hover:bg-blue-500"
        >
          <ArrowLeft size={17} />
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
