import { getDb } from "./db";

export interface Claim {
  id: number;
  claim_number: string;
  patient_name: string;
  patient_id: string;
  provider_name: string;
  provider_npi: string;
  facility: string;
  insurance: string;
  service_date: string;
  submitted_date: string;
  diagnosis_codes: string;
  procedure_codes: string;
  billed_amount: number;
  approved_amount: number | null;
  paid_amount: number | null;
  status: string;
  claim_type: string;
  notes: string | null;
  flags: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_claims: number;
  total_billed: number;
  total_approved: number;
  total_paid: number;
  approval_rate: number;
  denial_rate: number;
  avg_processing_days: number;
  flagged_count: number;
  by_status: { status: string; count: number; amount: number }[];
  by_type: { claim_type: string; count: number; amount: number }[];
  by_insurance: { insurance: string; count: number; amount: number }[];
  monthly_trend: { month: string; submitted: number; approved: number; denied: number; billed: number }[];
}

export interface ClaimsFilter {
  status?: string;
  claim_type?: string;
  insurance?: string;
  search?: string;
  flagged?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export function getDashboardStats(): DashboardStats {
  const db = getDb();

  const totals = db.prepare(`
    SELECT
      COUNT(*)                                              AS total_claims,
      ROUND(SUM(billed_amount), 2)                        AS total_billed,
      ROUND(SUM(COALESCE(approved_amount, 0)), 2)         AS total_approved,
      ROUND(SUM(COALESCE(paid_amount, 0)), 2)             AS total_paid,
      ROUND(100.0 * SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) / COUNT(*), 1) AS approval_rate,
      ROUND(100.0 * SUM(CASE WHEN status='denied'   THEN 1 ELSE 0 END) / COUNT(*), 1) AS denial_rate,
      COUNT(CASE WHEN flags IS NOT NULL THEN 1 END)       AS flagged_count
    FROM claims
  `).get() as any;

  const avgDays = db.prepare(`
    SELECT ROUND(AVG(
      CAST(julianday(submitted_date) - julianday(service_date) AS REAL)
    ), 1) AS avg_days
    FROM claims WHERE submitted_date IS NOT NULL
  `).get() as any;

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) as count, ROUND(SUM(billed_amount),2) as amount
    FROM claims GROUP BY status ORDER BY count DESC
  `).all() as any[];

  const byType = db.prepare(`
    SELECT claim_type, COUNT(*) as count, ROUND(SUM(billed_amount),2) as amount
    FROM claims GROUP BY claim_type ORDER BY count DESC
  `).all() as any[];

  const byInsurance = db.prepare(`
    SELECT insurance, COUNT(*) as count, ROUND(SUM(billed_amount),2) as amount
    FROM claims GROUP BY insurance ORDER BY count DESC LIMIT 10
  `).all() as any[];

  const monthlyTrend = db.prepare(`
    SELECT
      strftime('%Y-%m', service_date) AS month,
      COUNT(*) AS submitted,
      SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status='denied'   THEN 1 ELSE 0 END) AS denied,
      ROUND(SUM(billed_amount), 2) AS billed
    FROM claims
    GROUP BY month
    ORDER BY month
  `).all() as any[];

  return {
    total_claims:        totals.total_claims,
    total_billed:        totals.total_billed,
    total_approved:      totals.total_approved,
    total_paid:          totals.total_paid,
    approval_rate:       totals.approval_rate,
    denial_rate:         totals.denial_rate,
    avg_processing_days: avgDays.avg_days,
    flagged_count:       totals.flagged_count,
    by_status:           byStatus,
    by_type:             byType,
    by_insurance:        byInsurance,
    monthly_trend:       monthlyTrend,
  };
}

export function getClaims(filter: ClaimsFilter = {}) {
  const db = getDb();
  const {
    status, claim_type, insurance, search, flagged,
    dateFrom, dateTo,
    page = 1, pageSize = 20,
    sortBy = "submitted_date", sortDir = "desc",
  } = filter;

  const allowed = new Set(["id","claim_number","patient_name","provider_name",
    "service_date","submitted_date","billed_amount","status","claim_type"]);
  const col = allowed.has(sortBy) ? sortBy : "submitted_date";
  const dir = sortDir === "asc" ? "ASC" : "DESC";

  const where: string[] = [];
  const params: any[] = [];

  if (status)     { where.push("status = ?");      params.push(status); }
  if (claim_type) { where.push("claim_type = ?");  params.push(claim_type); }
  if (insurance)  { where.push("insurance = ?");   params.push(insurance); }
  if (flagged)    { where.push("flags IS NOT NULL"); }
  if (dateFrom)   { where.push("service_date >= ?"); params.push(dateFrom); }
  if (dateTo)     { where.push("service_date <= ?"); params.push(dateTo); }
  if (search) {
    where.push("(patient_name LIKE ? OR claim_number LIKE ? OR provider_name LIKE ? OR patient_id LIKE ?)");
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = (db.prepare(`SELECT COUNT(*) as n FROM claims ${clause}`).get(...params) as any).n;
  const offset = (page - 1) * pageSize;

  const rows = db.prepare(`
    SELECT * FROM claims ${clause}
    ORDER BY ${col} ${dir}
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as Claim[];

  return { data: rows, total, page, pageSize };
}

export function getClaimById(id: number): Claim | null {
  const db = getDb();
  return db.prepare("SELECT * FROM claims WHERE id = ?").get(id) as Claim | null;
}
