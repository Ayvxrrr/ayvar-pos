
const colors = {
  blue: "bg-blue-500/10 text-blue-400",
  green: "bg-emerald-500/10 text-emerald-400",
  purple: "bg-violet-500/10 text-violet-400",
  orange: "bg-orange-500/10 text-orange-400",
};

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = "blue",
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {title}
          </p>

          <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </h3>
        </div>

        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={23} />
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}
