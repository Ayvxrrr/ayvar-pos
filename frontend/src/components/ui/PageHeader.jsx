export default function PageHeader({ eyebrow = "Gestión comercial", title, description, children }) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        <span className="eyebrow inline-flex items-center gap-2"><span className="h-1.5 w-4 rounded-full bg-brand-500" />{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
