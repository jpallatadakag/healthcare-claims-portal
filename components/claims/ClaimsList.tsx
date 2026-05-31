"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";

interface Claim {
  id: number;
  claim_number: string;
  patient_name: string;
  patient_id: string;
  provider_name: string;
  facility: string;
  insurance: string;
  service_date: string;
  submitted_date: string;
  billed_amount: number;
  approved_amount: number | null;
  status: string;
  claim_type: string;
  flags: string | null;
}

const STATUSES = ["","draft","submitted","under_review","approved","denied","appealed"];
const TYPES    = ["","medical","dental","vision","pharmacy","mental_health"];
const PAGE_SIZES = [10, 20, 50];

function fmt$(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US",{ style:"currency", currency:"USD", maximumFractionDigits:0 }).format(n);
}

export default function ClaimsList() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);

  const [search,    setSearch]    = useState("");
  const [status,    setStatus]    = useState("");
  const [claimType, setClaimType] = useState("");
  const [flagged,   setFlagged]   = useState(false);
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(20);
  const [sortBy,    setSortBy]    = useState("submitted_date");
  const [sortDir,   setSortDir]   = useState<"asc"|"desc">("desc");

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), pageSize: String(pageSize),
      sortBy, sortDir,
      ...(search    && { search }),
      ...(status    && { status }),
      ...(claimType && { claim_type: claimType }),
      ...(flagged   && { flagged: "true" }),
      ...(dateFrom  && { dateFrom }),
      ...(dateTo    && { dateTo }),
    });
    const res = await fetch(`/api/claims?${params}`);
    const json = await res.json();
    setClaims(json.data ?? []);
    setTotal(json.total ?? 0);
    setLoading(false);
  }, [search, status, claimType, flagged, dateFrom, dateTo, page, pageSize, sortBy, sortDir]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  // reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, status, claimType, flagged, dateFrom, dateTo]);

  const totalPages = Math.ceil(total / pageSize);

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortBy !== col) return <span className="opacity-20">↕</span>;
    return <span>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search patient, claim #, provider…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="col-span-1 sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s ? s.replace("_"," ") : "All Statuses"}</option>
            ))}
          </select>
          <select
            value={claimType}
            onChange={e => setClaimType(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TYPES.map(t => (
              <option key={t} value={t}>{t ? t.replace("_"," ") : "All Types"}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer col-span-1">
            <input type="checkbox" checked={flagged} onChange={e => setFlagged(e.target.checked)}
              className="rounded" />
            Flagged only
          </label>
          <button
            onClick={() => { setSearch(""); setStatus(""); setClaimType(""); setFlagged(false); setDateFrom(""); setDateTo(""); }}
            className="text-xs text-slate-400 hover:text-slate-600 text-left"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <span className="text-sm text-slate-500">
            {loading ? "Loading…" : `${total.toLocaleString()} claims`}
          </span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                {[
                  { label:"Claim #",    col:"claim_number" },
                  { label:"Patient",    col:"patient_name" },
                  { label:"Provider",   col:"provider_name" },
                  { label:"Type",       col:"claim_type" },
                  { label:"Status",     col:"status" },
                  { label:"Svc Date",   col:"service_date" },
                  { label:"Billed",     col:"billed_amount" },
                  { label:"Approved",   col:null },
                  { label:"Flags",      col:null },
                ].map(({ label, col }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 font-medium ${col ? "cursor-pointer hover:text-slate-600 select-none" : ""}`}
                    onClick={() => col && toggleSort(col)}
                  >
                    {label} {col && <SortIcon col={col} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading claims…</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">No claims found</td></tr>
              ) : claims.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/claims/${c.id}`} className="text-blue-600 hover:underline font-medium">
                      {c.claim_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{c.patient_name}</div>
                    <div className="text-xs text-slate-400">{c.patient_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700 max-w-[160px] truncate">{c.provider_name}</div>
                    <div className="text-xs text-slate-400 max-w-[160px] truncate">{c.facility}</div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{c.claim_type.replace("_"," ")}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.service_date}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt$(c.billed_amount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{fmt$(c.approved_amount)}</td>
                  <td className="px-4 py-3">
                    {c.flags && (
                      <div className="flex flex-wrap gap-1">
                        {c.flags.split(",").map(f => (
                          <span key={f} className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded font-mono">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages || 1}
          </span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(1)}
              className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50">
              «
            </button>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50">
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-2.5 py-1 text-xs rounded border ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}>
                  {p}
                </button>
              );
            })}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50">
              ›
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(totalPages)}
              className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-30 hover:bg-slate-50">
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
