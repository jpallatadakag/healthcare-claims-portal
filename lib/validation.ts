import { getDb } from "./db";

export interface ValidationIssue {
  claim_id: number;
  claim_number: string;
  patient_name: string;
  billed_amount: number;
  service_date: string;
  rule: string;
  severity: "error" | "warning" | "info";
  detail: string;
}

export interface ValidationSummary {
  total_issues: number;
  errors: number;
  warnings: number;
  infos: number;
  by_rule: { rule: string; count: number; severity: string }[];
  issues: ValidationIssue[];
}

export function runValidation(): ValidationSummary {
  const db = getDb();

  const issues: ValidationIssue[] = [];

  // Rule 1 — Duplicate claims: same patient + provider + service_date + procedure_codes
  const duplicates = db.prepare(`
    SELECT
      c.id, c.claim_number, c.patient_name, c.billed_amount, c.service_date,
      c.patient_id, c.provider_npi, c.procedure_codes
    FROM claims c
    WHERE EXISTS (
      SELECT 1 FROM claims c2
      WHERE c2.patient_id      = c.patient_id
        AND c2.provider_npi    = c.provider_npi
        AND c2.service_date    = c.service_date
        AND c2.procedure_codes = c.procedure_codes
        AND c2.id              < c.id
    )
    ORDER BY c.patient_id, c.service_date
  `).all() as any[];

  duplicates.forEach(r => issues.push({
    claim_id:     r.id,
    claim_number: r.claim_number,
    patient_name: r.patient_name,
    billed_amount: r.billed_amount,
    service_date: r.service_date,
    rule:     "DUPLICATE_CLAIM",
    severity: "error",
    detail:   `Duplicate: same patient, provider, date, and procedure codes as an earlier claim.`,
  }));

  // Rule 2 — Approved amount exceeds billed
  const overApproved = db.prepare(`
    SELECT id, claim_number, patient_name, billed_amount, approved_amount, service_date
    FROM claims
    WHERE approved_amount IS NOT NULL AND approved_amount > billed_amount
  `).all() as any[];

  overApproved.forEach(r => issues.push({
    claim_id: r.id, claim_number: r.claim_number, patient_name: r.patient_name,
    billed_amount: r.billed_amount, service_date: r.service_date,
    rule: "APPROVED_EXCEEDS_BILLED", severity: "error",
    detail: `Approved $${r.approved_amount} exceeds billed $${r.billed_amount}.`,
  }));

  // Rule 3 — Future service date
  const futureDates = db.prepare(`
    SELECT id, claim_number, patient_name, billed_amount, service_date
    FROM claims
    WHERE service_date > date('now')
  `).all() as any[];

  futureDates.forEach(r => issues.push({
    claim_id: r.id, claim_number: r.claim_number, patient_name: r.patient_name,
    billed_amount: r.billed_amount, service_date: r.service_date,
    rule: "FUTURE_SERVICE_DATE", severity: "error",
    detail: `Service date ${r.service_date} is in the future.`,
  }));

  // Rule 4 — Submitted before service date
  const submittedBeforeService = db.prepare(`
    SELECT id, claim_number, patient_name, billed_amount, service_date, submitted_date
    FROM claims
    WHERE submitted_date < service_date
  `).all() as any[];

  submittedBeforeService.forEach(r => issues.push({
    claim_id: r.id, claim_number: r.claim_number, patient_name: r.patient_name,
    billed_amount: r.billed_amount, service_date: r.service_date,
    rule: "SUBMITTED_BEFORE_SERVICE", severity: "error",
    detail: `Submitted ${r.submitted_date} is before service date ${r.service_date}.`,
  }));

  // Rule 5 — High-value claims (>$20 000) without approval
  const highValue = db.prepare(`
    SELECT id, claim_number, patient_name, billed_amount, service_date, status
    FROM claims
    WHERE billed_amount > 20000 AND status NOT IN ('approved','denied')
  `).all() as any[];

  highValue.forEach(r => issues.push({
    claim_id: r.id, claim_number: r.claim_number, patient_name: r.patient_name,
    billed_amount: r.billed_amount, service_date: r.service_date,
    rule: "HIGH_VALUE_PENDING", severity: "warning",
    detail: `Claim for $${r.billed_amount.toLocaleString()} is ${r.status} — high-value claims need priority review.`,
  }));

  // Rule 6 — Stale submitted claims (>30 days, still submitted)
  const stale = db.prepare(`
    SELECT id, claim_number, patient_name, billed_amount, service_date, submitted_date
    FROM claims
    WHERE status = 'submitted'
      AND julianday('now') - julianday(submitted_date) > 30
  `).all() as any[];

  stale.forEach(r => issues.push({
    claim_id: r.id, claim_number: r.claim_number, patient_name: r.patient_name,
    billed_amount: r.billed_amount, service_date: r.service_date,
    rule: "STALE_CLAIM", severity: "warning",
    detail: `Submitted on ${r.submitted_date} — no action for >30 days.`,
  }));

  // Rule 7 — Unusually high billed (>2 std deviations above mean per claim type)
  const typeStats = db.prepare(`
    SELECT claim_type, AVG(billed_amount) as avg, AVG(billed_amount*billed_amount) - AVG(billed_amount)*AVG(billed_amount) as variance
    FROM claims GROUP BY claim_type
  `).all() as any[];

  typeStats.forEach(({ claim_type, avg, variance }) => {
    const stdDev = Math.sqrt(Math.max(0, variance));
    const threshold = avg + 2 * stdDev;
    const anomalies = db.prepare(`
      SELECT id, claim_number, patient_name, billed_amount, service_date
      FROM claims WHERE claim_type = ? AND billed_amount > ?
    `).all(claim_type, threshold) as any[];

    anomalies.forEach(r => issues.push({
      claim_id: r.id, claim_number: r.claim_number, patient_name: r.patient_name,
      billed_amount: r.billed_amount, service_date: r.service_date,
      rule: "STATISTICAL_ANOMALY", severity: "warning",
      detail: `Billed $${r.billed_amount.toLocaleString()} is >2σ above avg for ${claim_type} claims (avg: $${Math.round(avg).toLocaleString()}).`,
    }));
  });

  // Rule 8 — Claims with existing FLAG markers needing review
  const flagged = db.prepare(`
    SELECT id, claim_number, patient_name, billed_amount, service_date, flags
    FROM claims WHERE flags IS NOT NULL AND status NOT IN ('approved','denied')
  `).all() as any[];

  flagged.forEach(r => issues.push({
    claim_id: r.id, claim_number: r.claim_number, patient_name: r.patient_name,
    billed_amount: r.billed_amount, service_date: r.service_date,
    rule: "FLAGGED_UNRESOLVED",
    severity: "info",
    detail: `Claim flagged [${r.flags}] but not yet resolved.`,
  }));

  const errors   = issues.filter(i => i.severity === "error").length;
  const warnings = issues.filter(i => i.severity === "warning").length;
  const infos    = issues.filter(i => i.severity === "info").length;

  const ruleMap = new Map<string, { count: number; severity: string }>();
  issues.forEach(i => {
    const e = ruleMap.get(i.rule) ?? { count: 0, severity: i.severity };
    e.count++;
    ruleMap.set(i.rule, e);
  });
  const by_rule = [...ruleMap.entries()]
    .map(([rule, { count, severity }]) => ({ rule, count, severity }))
    .sort((a, b) => b.count - a.count);

  return { total_issues: issues.length, errors, warnings, infos, by_rule, issues };
}
