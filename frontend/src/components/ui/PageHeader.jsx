export default function PageHeader({ eyebrow = "AYVAR POS", title, description, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>
      {children}
    </div>
  );
}
