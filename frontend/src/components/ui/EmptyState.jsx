import { Inbox, LoaderCircle } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, loading = false }) {
  return (
    <div className="empty-state" role={loading ? "status" : undefined}>
      <div className="empty-state-icon">
        {loading ? <LoaderCircle size={24} className="animate-spin text-brand-600" /> : <Icon size={25} strokeWidth={1.5} />}
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {description && <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">{description}</p>}
    </div>
  );
}
