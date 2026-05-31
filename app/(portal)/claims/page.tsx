import ClaimsList from "@/components/claims/ClaimsList";

export default function ClaimsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Claims</h1>
        <p className="text-slate-500 text-sm mt-1">Browse, search, and filter all claims</p>
      </div>
      <ClaimsList />
    </div>
  );
}
