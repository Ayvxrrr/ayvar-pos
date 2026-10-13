
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="panel max-w-lg p-7 text-center sm:p-12">
        <div className="mx-auto flex size-20 items-center justify-center rounded-3xl border border-amber-100 bg-amber-50 text-amber-600">
          <ShieldAlert size={40} />
        </div>

        <h1 className="mt-6 text-3xl font-extrabold">
          Acceso restringido
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-slate-500">
          Tu cuenta no tiene permisos para acceder
          a esta sección de Ayvar POS.
        </p>

        <Link
          to="/panel"
          className="btn btn-primary mt-7"
        >
          <ArrowLeft size={18} />
          Regresar al Dashboard
        </Link>
      </div>
    </div>
  );
}
