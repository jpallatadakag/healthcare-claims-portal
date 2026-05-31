import { getDashboardStats } from "@/lib/queries";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function fmtN(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function DashboardPage() {
  const s = getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Self-Funded Healthcare Claims Analytics</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Claims"     value={fmtN(s.total_claims)}    sub="all time"           color="blue" />
        <StatCard label="Total Billed"     value={fmt$(s.total_billed)}    sub="gross charges"      color="indigo" />
        <StatCard label="Total Approved"   value={fmt$(s.total_approved)}  sub="eligible amount"    color="emerald" />
        <StatCard label="Total Paid"       value={fmt$(s.total_paid)}      sub="net paid out"       color="violet" />
        <StatCard label="Approval Rate"    value={`${s.approval_rate}%`}   sub="of all claims"      color="emerald" />
        <StatCard label="Denial Rate"      value={`${s.denial_rate}%`}     sub="of all claims"      color="red" />
        <StatCard label="Avg Processing"   value={`${s.avg_processing_days}d`} sub="service to submit" color="amber" />
        <StatCard label="Flagged Claims"   value={fmtN(s.flagged_count)}   sub="need review"        color="orange" />
      </div>

      {/* Status breakdown + Type breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Claims by Status</h2>
          <div className="space-y-3">
            {s.by_status.map(r => {
              const pct = Math.round((r.count / s.total_claims) * 100);
              return (
                <div key={r.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} />
                      <span className="text-slate-600">{fmtN(r.count)}</span>
                    </div>
                    <span className="text-slate-400 text-xs">{pct}% · {fmt$(r.amount)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusBarColor(r.status)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Claims by Type</h2>
          <div className="space-y-3">
            {s.by_type.map(r => {
              const pct = Math.round((r.count / s.total_claims) * 100);
              return (
                <div key={r.claim_type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-slate-700 font-medium">
                      {r.claim_type.replace("_", " ")}
                    </span>
                    <span className="text-slate-400 text-xs">{pct}% · {fmtN(r.count)} claims</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{fmt$(r.amount)} billed</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Insurance breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Insurers</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="pb-2 font-medium">Insurer</th>
                <th className="pb-2 font-medium text-right">Claims</th>
                <th className="pb-2 font-medium text-right">Billed</th>
                <th className="pb-2 font-medium text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {s.by_insurance.map(r => (
                <tr key={r.insurance} className="hover:bg-slate-50">
                  <td className="py-2.5 text-slate-700">{r.insurance}</td>
                  <td className="py-2.5 text-right text-slate-600">{fmtN(r.count)}</td>
                  <td className="py-2.5 text-right text-slate-600">{fmt$(r.amount)}</td>
                  <td className="py-2.5 text-right text-slate-400">
                    {Math.round((r.count / s.total_claims) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly trend table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Monthly Trend (last 6 months)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="pb-2 font-medium">Month</th>
                <th className="pb-2 font-medium text-right">Submitted</th>
                <th className="pb-2 font-medium text-right">Approved</th>
                <th className="pb-2 font-medium text-right">Denied</th>
                <th className="pb-2 font-medium text-right">Billed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {s.monthly_trend.slice(-6).reverse().map(r => (
                <tr key={r.month} className="hover:bg-slate-50">
                  <td className="py-2.5 text-slate-700 font-medium">{r.month}</td>
                  <td className="py-2.5 text-right text-slate-600">{fmtN(r.submitted)}</td>
                  <td className="py-2.5 text-right text-emerald-600">{fmtN(r.approved)}</td>
                  <td className="py-2.5 text-right text-red-500">{fmtN(r.denied)}</td>
                  <td className="py-2.5 text-right text-slate-600">{fmt$(r.billed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function statusBarColor(s: string) {
  switch (s) {
    case "approved":     return "bg-emerald-500";
    case "denied":       return "bg-red-500";
    case "under_review": return "bg-amber-500";
    case "submitted":    return "bg-blue-500";
    case "appealed":     return "bg-purple-500";
    default:             return "bg-slate-400";
  }
}
