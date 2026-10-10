export default function Notice({ message, type = "error" }) {
  if (!message) return null;
  return (
    <div role={type === "error" ? "alert" : "status"}
      className={`mb-5 rounded-xl border p-3 text-sm ${type === "error"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
      {message}
    </div>
  );
}
