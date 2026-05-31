import { runValidation } from "@/lib/validation";
import Link from "next/link";

const SEVERITY_STYLE: Record<string, string> = {
  error:   "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  info:    "bg-blue-50 border-blue-200 text-blue-700",
};
const SEVERITY_BADGE: Record<string, string> = {
  error:   "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  info:    "bg-blue-100 text-blue-700",
};

function fmt$(n: number) {
  return new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD", maximumFractionDigits:0 }).format(n);
}

export default function ValidationPage() {
  const v = runValidation();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Validation</h1>
        <p className="text-slate-500 text-sm mt-1">Duplicate detection, anomalies, and rule-based checks</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Issues</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{v.total_issues.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-100 p-4 shadow-sm">
          <p className="text-xs text-red-500 uppercase tracking-wide">Errors</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{v.errors}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 shadow-sm">
          <p className="text-xs text-amber-500 uppercase tracking-wide">Warnings</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{v.warnings}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 shadow-sm">
          <p className="text-xs text-blue-500 uppercase tracking-wide">Info</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{v.infos}</p>
        </div>
      </div>

      {/* By rule */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Issues by Rule</h2>
        <div className="space-y-2">
          {v.by_rule.map(r => (
            <div key={r.rule} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEVERITY_BADGE[r.severity]}`}>
                  {r.severity}
                </span>
                <span className="text-sm font-mono text-slate-700">{r.rule}</span>
              </div>
              <span className="text-sm font-semibold text-slate-600">{r.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Issues list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">All Issues</h2>
        </div>
        <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
          {v.issues.slice(0, 200).map((issue, i) => (
            <div key={i} className={`px-5 py-3 border-l-4 ${SEVERITY_STYLE[issue.severity]}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/claims/${issue.claim_id}`} className="font-mono text-xs font-semibold hover:underline">
                      {issue.claim_number}
                    </Link>
                    <span className="text-xs">{issue.patient_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${SEVERITY_BADGE[issue.severity]}`}>
                      {issue.rule}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{issue.detail}</p>
                </div>
                <div className="text-right shrink-0 text-xs">
                  <div className="font-semibold">{fmt$(issue.billed_amount)}</div>
                  <div className="opacity-60">{issue.service_date}</div>
                </div>
              </div>
            </div>
          ))}
          {v.issues.length > 200 && (
            <div className="px-5 py-3 text-center text-sm text-slate-400">
              Showing 200 of {v.issues.length} issues
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
