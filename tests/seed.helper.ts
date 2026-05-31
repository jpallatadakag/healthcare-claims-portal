/**
 * Creates an in-memory SQLite database with schema + minimal fixture data for tests.
 * Each test file imports this instead of touching the real data/claims.db.
 */
import Database from "better-sqlite3";

export function createTestDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE claims (
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
  `);

  const insert = db.prepare(`
    INSERT INTO claims
      (claim_number, patient_name, patient_id, provider_name, provider_npi,
       facility, insurance, service_date, submitted_date, diagnosis_codes,
       procedure_codes, billed_amount, approved_amount, paid_amount, status,
       claim_type, notes, flags)
    VALUES
      (@claim_number,@patient_name,@patient_id,@provider_name,@provider_npi,
       @facility,@insurance,@service_date,@submitted_date,@diagnosis_codes,
       @procedure_codes,@billed_amount,@approved_amount,@paid_amount,@status,
       @claim_type,@notes,@flags)
  `);

  const base = {
    provider_name: "Dr. Jane Smith", provider_npi: "1234567890",
    facility: "General Hospital", insurance: "Aetna",
    diagnosis_codes: "I10", procedure_codes: "99213",
    notes: null, flags: null,
  };

  const fixtures = [
    { claim_number:"CLM0000001", patient_name:"Alice Brown",   patient_id:"PT001", service_date:"2024-01-10", submitted_date:"2024-01-12", billed_amount:500,   approved_amount:400,  paid_amount:400,  status:"approved",     claim_type:"medical",       ...base },
    { claim_number:"CLM0000002", patient_name:"Bob Davis",     patient_id:"PT002", service_date:"2024-02-05", submitted_date:"2024-02-07", billed_amount:1200,  approved_amount:null, paid_amount:null, status:"under_review",  claim_type:"dental",        ...base },
    { claim_number:"CLM0000003", patient_name:"Carol Lee",     patient_id:"PT003", service_date:"2024-03-15", submitted_date:"2024-03-16", billed_amount:250,   approved_amount:0,    paid_amount:null, status:"denied",        claim_type:"vision",        ...base },
    { claim_number:"CLM0000004", patient_name:"Alice Brown",   patient_id:"PT001", service_date:"2024-01-10", submitted_date:"2024-01-12", billed_amount:500,   approved_amount:null, paid_amount:null, status:"submitted",     claim_type:"medical",       ...base, procedure_codes:"99213" }, // duplicate of CLM0000001
    { claim_number:"CLM0000005", patient_name:"Dan Wilson",    patient_id:"PT004", service_date:"2024-04-01", submitted_date:"2024-04-02", billed_amount:25000, approved_amount:null, paid_amount:null, status:"submitted",     claim_type:"medical",       ...base, flags:"HIGH_AMOUNT" },
    { claim_number:"CLM0000006", patient_name:"Eve Martinez",  patient_id:"PT005", service_date:"2099-12-01", submitted_date:"2099-12-02", billed_amount:300,   approved_amount:null, paid_amount:null, status:"submitted",     claim_type:"pharmacy",      ...base }, // future date
    { claim_number:"CLM0000007", patient_name:"Frank Garcia",  patient_id:"PT006", service_date:"2024-06-10", submitted_date:"2024-06-05", billed_amount:800,   approved_amount:null, paid_amount:null, status:"submitted",     claim_type:"mental_health", ...base }, // submitted before service
    { claim_number:"CLM0000008", patient_name:"Grace Hill",    patient_id:"PT007", service_date:"2024-05-01", submitted_date:"2024-05-02", billed_amount:600,   approved_amount:700,  paid_amount:null, status:"approved",      claim_type:"medical",       ...base }, // approved > billed
    { claim_number:"CLM0000009", patient_name:"Henry King",    patient_id:"PT008", service_date:"2024-07-20", submitted_date:"2024-07-21", billed_amount:150,   approved_amount:120,  paid_amount:120,  status:"approved",      claim_type:"dental",        ...base },
    { claim_number:"CLM0000010", patient_name:"Iris Lopez",    patient_id:"PT009", service_date:"2024-08-15", submitted_date:"2024-08-16", billed_amount:90,    approved_amount:null, paid_amount:null, status:"draft",         claim_type:"vision",        ...base },
  ];

  const seedAll = db.transaction(() => fixtures.forEach(f => insert.run(f)));
  seedAll();

  return db;
}
