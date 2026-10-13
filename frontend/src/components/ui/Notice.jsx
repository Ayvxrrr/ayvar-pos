import { CircleAlert, CircleCheck } from "lucide-react";

export default function Notice({ message, type = "error" }) {
  if (!message) return null;
  const Icon = type === "error" ? CircleAlert : CircleCheck;
  return (
    <div role={type === "error" ? "alert" : "status"}
      className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed ${type === "error"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-brand-200 bg-brand-50 text-brand-700"}`}>
      <Icon size={19} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
