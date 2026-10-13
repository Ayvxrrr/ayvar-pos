
const colors = {
  blue: "bg-sky-50 text-sky-600",
  green: "bg-brand-50 text-brand-600",
  purple: "bg-violet-50 text-violet-600",
  orange: "bg-amber-50 text-amber-600",
};
const accents = { blue: "#0284c7", green: "#128064", purple: "#7c3aed", orange: "#d97706" };

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = "blue",
}) {
  return (
    <div className="stat-card" style={{ "--stat-accent": accents[color] }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            {title}
          </p>

          <h3 className="stat-value">
            {value}
          </h3>
        </div>

        <div className={`rounded-xl p-2.5 ${colors[color]}`}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}
