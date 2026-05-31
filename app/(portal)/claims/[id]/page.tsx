import { notFound } from "next/navigation";
import Link from "next/link";
import { getClaimById } from "@/lib/queries";
import StatusBadge from "@/components/ui/StatusBadge";

function fmt$(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD" }).format(n);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const claim = getClaimById(Number(id));
  if (!claim) notFound();

  const pctApproved = claim.approved_amount != null && claim.billed_amount > 0
    ? Math.round((claim.approved_amount / claim.billed_amount) * 100)
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/claims" className="text-slate-400 hover:text-slate-600 text-sm mt-1">← Back</Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800 font-mono">{claim.claim_number}</h1>
            <StatusBadge status={claim.status} />
            {claim.flags && claim.flags.split(",").map(f => (
              <span key={f} className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded font-mono">{f}</span>
            ))}
          </div>
          <p className="text-slate-500 text-sm mt-1 capitalize">{claim.claim_type.replace("_"," ")} claim</p>
        </div>
      </div>

      {/* Amount summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Billed",    value: fmt$(claim.billed_amount),    color: "text-slate-800" },
          { label: "Approved",  value: fmt$(claim.approved_amount),  color: "text-emerald-700" },
          { label: "Paid",      value: fmt$(claim.paid_amount),      color: "text-blue-700" },
          { label: "% Approved",value: pctApproved != null ? `${pctApproved}%` : "—", color: "text-slate-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Patient</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Name"       value={claim.patient_name} />
            <Field label="Patient ID" value={claim.patient_id} />
            <Field label="Insurance"  value={claim.insurance} />
          </dl>
        </div>

        {/* Provider */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Provider</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Name"     value={claim.provider_name} />
            <Field label="NPI"      value={claim.provider_npi} />
            <Field label="Facility" value={claim.facility} />
          </dl>
        </div>

        {/* Dates & Codes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Service Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Service Date"   value={claim.service_date} />
            <Field label="Submitted Date" value={claim.submitted_date} />
            <div className="col-span-2">
              <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">Diagnosis Codes (ICD-10)</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {claim.diagnosis_codes.split(",").map(c => (
                  <span key={c} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-mono">{c}</span>
                ))}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">Procedure Codes (CPT)</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {claim.procedure_codes.split(",").map(c => (
                  <span key={c} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-mono">{c}</span>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        {/* Notes & Flags */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Notes & Flags</h2>
          <dl className="space-y-4">
            <Field label="Notes" value={claim.notes} />
            <div>
              <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">Flags</dt>
              <dd className="mt-1">
                {claim.flags
                  ? claim.flags.split(",").map(f => (
                      <span key={f} className="inline-flex mr-1 mb-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded font-mono">{f}</span>
                    ))
                  : <span className="text-slate-400 text-sm">None</span>
                }
              </dd>
            </div>
            <Field label="Created"  value={claim.created_at} />
            <Field label="Updated"  value={claim.updated_at} />
          </dl>
        </div>
      </div>
    </div>
  );
}
