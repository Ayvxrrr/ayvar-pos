
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
          <ShieldAlert size={40} />
        </div>

        <h1 className="mt-6 text-3xl font-bold">
          Acceso restringido
        </h1>

        <p className="mt-4 text-slate-400">
          Tu cuenta no tiene permisos para acceder
          a esta sección de Ayvar POS.
        </p>

        <Link
          to="/panel"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium transition hover:bg-blue-500"
        >
          <ArrowLeft size={18} />
          Regresar al Dashboard
        </Link>
      </div>
    </div>
  );
}
