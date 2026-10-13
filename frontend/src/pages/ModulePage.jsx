
import { Link } from "react-router-dom";
import { ArrowLeft, Wrench } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";

export default function ModulePage({
  title,
  description,
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description}/>

      <div className="panel flex min-h-80 flex-col items-center justify-center p-8 text-center">
        <div className="rounded-2xl bg-brand-50 p-5 text-brand-600">
          <Wrench size={32} />
        </div>

        <h2 className="mt-5 text-xl font-semibold">
          Módulo en desarrollo
        </h2>

        <p className="mt-3 max-w-md text-sm text-slate-500">
          Esta sección ya tiene su propia ruta.
          Próximamente implementaremos sus funcionalidades
          y conexión con Firestore.
        </p>

        <Link
          to="/panel"
          className="btn btn-primary mt-6"
        >
          <ArrowLeft size={17} />
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
