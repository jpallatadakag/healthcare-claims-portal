import { getDashboardStats } from "@/lib/queries";

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function HBar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 truncate text-slate-600 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-28 text-right text-slate-700 font-medium shrink-0">{sub ?? value.toLocaleString()}</span>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  approved:     "bg-emerald-500",
  denied:       "bg-red-500",
  under_review: "bg-amber-500",
  submitted:    "bg-blue-500",
  appealed:     "bg-purple-500",
  draft:        "bg-slate-400",
};

export default function AnalyticsPage() {
  const s = getDashboardStats();
  const maxInsurance  = Math.max(...s.by_insurance.map(r => r.amount));
  const maxType       = Math.max(...s.by_type.map(r => r.count));
  const maxMonthly    = Math.max(...s.monthly_trend.map(r => r.submitted));

  const last12 = s.monthly_trend.slice(-12);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Visual breakdown of claims data</p>
      </div>

      {/* Claims by Status — donut-style legend + bars */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-5">Claims by Status</h2>
        <div className="flex flex-wrap gap-3 mb-5">
          {s.by_status.map(r => (
            <div key={r.status} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLOR[r.status] ?? "bg-slate-400"}`} />
              <span className="capitalize">{r.status.replace("_", " ")}</span>
              <span className="text-slate-400">({r.count})</span>
            </div>
          ))}
        </div>
        {/* Stacked bar */}
        <div className="h-8 flex rounded-full overflow-hidden w-full">
          {s.by_status.map(r => {
            const pct = (r.count / s.total_claims) * 100;
            return (
              <div
                key={r.status}
                title={`${r.status}: ${r.count}`}
                className={`${STATUS_COLOR[r.status] ?? "bg-slate-400"} h-full`}
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0</span>
          <span>{s.total_claims.toLocaleString()} total</span>
        </div>
      </div>

      {/* Claims by Type */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Claims by Type</h2>
        <div className="space-y-3">
          {s.by_type.map(r => (
            <HBar
              key={r.claim_type}
              label={r.claim_type.replace("_", " ")}
              value={r.count}
              max={maxType}
              sub={`${r.count.toLocaleString()} · ${fmt$(r.amount)}`}
            />
          ))}
        </div>
      </div>

      {/* Monthly volume — simple column chart using CSS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Monthly Claims Volume (last 12 months)</h2>
        <div className="flex items-end gap-1.5 h-40">
          {last12.map(r => {
            const heightPct = maxMonthly > 0 ? (r.submitted / maxMonthly) * 100 : 0;
            return (
              <div key={r.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex justify-center">
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-default"
                    style={{ height: `${(heightPct / 100) * 128}px` }}
                    title={`${r.month}: ${r.submitted} claims`}
                  />
                  <span className="absolute -top-5 text-xs text-slate-500 hidden group-hover:block whitespace-nowrap">
                    {r.submitted}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 rotate-45 origin-left mt-1 w-8 overflow-hidden">
                  {r.month.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top insurers by billed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Insurers by Billed Amount</h2>
        <div className="space-y-3">
          {s.by_insurance.map(r => (
            <HBar
              key={r.insurance}
              label={r.insurance}
              value={r.amount}
              max={maxInsurance}
              sub={fmt$(r.amount)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
