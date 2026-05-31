const MAP: Record<string, string> = {
  draft:        "bg-slate-100 text-slate-600",
  submitted:    "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved:     "bg-emerald-100 text-emerald-700",
  denied:       "bg-red-100 text-red-700",
  appealed:     "bg-purple-100 text-purple-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${MAP[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
