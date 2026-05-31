/**
 * Local synthetic data seed — no external APIs used.
 * Generates 5 000 realistic healthcare claims.
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "claims.db");

fs.mkdirSync(DB_DIR, { recursive: true });
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS claims (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_number    TEXT NOT NULL UNIQUE,
    patient_name    TEXT NOT NULL,
    patient_id      TEXT NOT NULL,
    provider_name   TEXT NOT NULL,
    provider_npi    TEXT NOT NULL,
    facility        TEXT NOT NULL,
    insurance       TEXT NOT NULL,
    service_date    TEXT NOT NULL,
    submitted_date  TEXT NOT NULL,
    diagnosis_codes TEXT NOT NULL,
    procedure_codes TEXT NOT NULL,
    billed_amount   REAL NOT NULL,
    approved_amount REAL,
    paid_amount     REAL,
    status          TEXT NOT NULL DEFAULT 'submitted',
    claim_type      TEXT NOT NULL DEFAULT 'medical',
    notes           TEXT,
    flags           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_claims_status       ON claims(status);
  CREATE INDEX IF NOT EXISTS idx_claims_service_date ON claims(service_date);
  CREATE INDEX IF NOT EXISTS idx_claims_patient      ON claims(patient_id);
`);

// ── Reference data ────────────────────────────────────────────────────────────

const FIRST = ["James","Mary","John","Patricia","Robert","Jennifer","Michael","Linda",
  "William","Barbara","David","Elizabeth","Richard","Susan","Joseph","Jessica",
  "Thomas","Sarah","Charles","Karen","Christopher","Lisa","Daniel","Nancy",
  "Matthew","Betty","Anthony","Margaret","Mark","Sandra","Donald","Ashley"];

const LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis",
  "Rodriguez","Martinez","Hernandez","Lopez","Wilson","Anderson","Thomas","Taylor",
  "Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez",
  "Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright"];

const INSURANCES = ["Blue Cross Blue Shield","Aetna","UnitedHealthcare","Cigna","Humana",
  "Kaiser Permanente","Anthem","Centene","Molina Healthcare","WellCare"];

const SPECIALTIES = ["Family Medicine","Cardiology","Orthopedics","Neurology","Oncology",
  "Dermatology","Psychiatry","Pediatrics","OB/GYN","Radiology","Emergency Medicine",
  "Gastroenterology","Pulmonology","Endocrinology","Ophthalmology"];

const FACILITIES = ["General Hospital","Medical Center","Regional Hospital","Community Health Clinic",
  "University Hospital","Memorial Hospital","St. Mary's Medical","Mercy Medical Center",
  "Providence Health","Sunrise Medical","Lakeside Clinic","Valley Health System"];

const DIAGNOSIS: Record<string, string[]> = {
  medical:       ["J06.9","I10","E11.9","M54.5","J18.9","K21.0","F32.9","N39.0","M17.11","I25.10","E78.5","J44.1","R10.9","M79.3"],
  dental:        ["K02.9","K08.9","K05.10","K04.0","K08.401","K00.6"],
  vision:        ["H52.4","H25.11","H40.1130","H53.141","H18.10"],
  pharmacy:      ["E11.9","I10","F32.9","E78.5","J44.1","G43.909","N18.3"],
  mental_health: ["F32.9","F41.1","F33.0","F43.10","F90.0","F20.9","F31.9"],
};

const PROCEDURE: Record<string, string[]> = {
  medical:       ["99213","99214","99215","99232","71046","93000","85025","80053","36415","27447","43239","70553","64483","99283"],
  dental:        ["D0150","D1110","D2140","D2740","D3310","D4341","D7140","D2930"],
  vision:        ["92004","92014","92015","92083","V2020","V2100","S0500"],
  pharmacy:      ["J3490","J0696","J2270","J1100","J0130","J7030","S9430"],
  mental_health: ["90834","90837","90847","90853","99213","H0001","H0004","H2019"],
};

const STATUSES = ["draft","submitted","under_review","approved","denied","appealed"] as const;
const STATUS_WEIGHTS = [0.03, 0.15, 0.17, 0.48, 0.12, 0.05];
const CLAIM_TYPES = ["medical","dental","vision","pharmacy","mental_health"] as const;
const TYPE_WEIGHTS = [0.60, 0.12, 0.08, 0.15, 0.05];

const NOTES: Partial<Record<string, string[]>> = {
  approved:      ["Covered under plan. Payment processed.","Pre-auth confirmed. Full reimbursement.","Medically necessary. Approved."],
  denied:        ["Service not covered.","Missing prior authorization.","Duplicate claim detected.","Diagnosis doesn't support procedure.","Benefit limit exceeded."],
  under_review:  ["Additional documentation requested.","Flagged for medical review.","Awaiting EOB from primary insurer."],
  appealed:      ["Patient appealing denial.","Provider submitted appeal with clinical notes."],
  submitted:     ["Claim received and queued."],
};

const FLAGS_LIST = ["DUPLICATE","MISSING_AUTH","HIGH_AMOUNT","DATE_MISMATCH","UNUSUAL_PROCEDURE","UPCODING_RISK"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function weighted<T>(items: readonly T[], weights: number[]): T {
  let r = Math.random(), i = 0;
  for (; i < weights.length - 1; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[i];
}

function randInt(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function randDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    .toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function codes(pool: string[], n = randInt(1, 3)): string {
  const s = new Set<string>();
  while (s.size < n) s.add(pick(pool));
  return [...s].join(",");
}

function patientId(): string { return `PT${randInt(100000, 999999)}`; }
function npi(): string { return `${randInt(1000000000, 9999999999)}`; }

// ── Build stable patient/provider pools ──────────────────────────────────────

const patients = Array.from({ length: 800 }, () => ({
  name: `${pick(FIRST)} ${pick(LAST)}`,
  id:   patientId(),
  ins:  pick(INSURANCES),
}));

const providers = Array.from({ length: 80 }, () => {
  const spec = pick(SPECIALTIES);
  return {
    name:     `Dr. ${pick(FIRST)} ${pick(LAST)}`,
    npi:      npi(),
    facility: `${pick(FACILITIES)} - ${spec}`,
  };
});

// ── Seed ─────────────────────────────────────────────────────────────────────

const insert = db.prepare(`
  INSERT INTO claims
    (claim_number, patient_name, patient_id, provider_name, provider_npi, facility,
     insurance, service_date, submitted_date, diagnosis_codes, procedure_codes,
     billed_amount, approved_amount, paid_amount, status, claim_type, notes, flags)
  VALUES
    (@claim_number,@patient_name,@patient_id,@provider_name,@provider_npi,@facility,
     @insurance,@service_date,@submitted_date,@diagnosis_codes,@procedure_codes,
     @billed_amount,@approved_amount,@paid_amount,@status,@claim_type,@notes,@flags)
`);

const START = new Date("2023-01-01");
const END   = new Date("2025-05-01");

const AMOUNT_RANGES: Record<string, [number, number]> = {
  medical:       [150, 28000],
  dental:        [80,  5000],
  vision:        [50,  1200],
  pharmacy:      [20,  3500],
  mental_health: [100, 4000],
};

const seed = db.transaction(() => {
  for (let i = 1; i <= 5000; i++) {
    const type    = weighted(CLAIM_TYPES, TYPE_WEIGHTS);
    const status  = weighted(STATUSES, STATUS_WEIGHTS);
    const patient = pick(patients);
    const prov    = pick(providers);
    const svcDate = randDate(START, END);
    const subDate = addDays(svcDate, randInt(1, 14));

    const [lo, hi]  = AMOUNT_RANGES[type];
    const billed     = Math.round(randInt(lo, hi) * 100) / 100;
    const approved   = status === "approved" ? Math.round(billed * (0.55 + Math.random() * 0.40) * 100) / 100
                     : status === "denied"   ? 0
                     : null;
    const paid       = approved != null && approved > 0
                     ? Math.round(approved * (0.80 + Math.random() * 0.20) * 100) / 100
                     : null;

    // inject ~8% anomalies for validation interest
    const isAnomaly = Math.random() < 0.08;
    const flagSet: string[] = [];
    if (isAnomaly) {
      const f = pick(FLAGS_LIST);
      flagSet.push(f);
      if (Math.random() < 0.3) flagSet.push(pick(FLAGS_LIST.filter(x => x !== f)));
    }

    const notePool = NOTES[status] ?? [];

    insert.run({
      claim_number:    `CLM${String(i).padStart(7, "0")}`,
      patient_name:    patient.name,
      patient_id:      patient.id,
      provider_name:   prov.name,
      provider_npi:    prov.npi,
      facility:        prov.facility,
      insurance:       patient.ins,
      service_date:    svcDate,
      submitted_date:  subDate,
      diagnosis_codes: codes(DIAGNOSIS[type]),
      procedure_codes: codes(PROCEDURE[type]),
      billed_amount:   billed,
      approved_amount: approved,
      paid_amount:     paid,
      status,
      claim_type:      type,
      notes:           notePool.length ? pick(notePool) : null,
      flags:           flagSet.length  ? flagSet.join(",") : null,
    });
  }
});

seed();

const summary = db.prepare(`
  SELECT status, COUNT(*) as cnt FROM claims GROUP BY status ORDER BY cnt DESC
`).all() as { status: string; cnt: number }[];

console.log("\nSeed complete — 5 000 claims\n");
console.log("Status breakdown:");
summary.forEach(r => console.log(`  ${r.status.padEnd(14)} ${r.cnt}`));
console.log(`\nDatabase → ${DB_PATH}`);
db.close();
