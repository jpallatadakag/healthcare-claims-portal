type Color = "blue" | "indigo" | "emerald" | "violet" | "red" | "amber" | "orange";

const colorMap: Record<Color, string> = {
  blue:    "bg-blue-50 text-blue-700 border-blue-100",
  indigo:  "bg-indigo-50 text-indigo-700 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  violet:  "bg-violet-50 text-violet-700 border-violet-100",
  red:     "bg-red-50 text-red-700 border-red-100",
  amber:   "bg-amber-50 text-amber-700 border-amber-100",
  orange:  "bg-orange-50 text-orange-700 border-orange-100",
};

export default function StatCard({
  label, value, sub, color = "blue",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: Color;
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}
