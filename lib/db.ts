import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "claims.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  runMigrations(_db);
  return _db;
}

function runMigrations(db: Database.Database) {
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
      status          TEXT NOT NULL DEFAULT 'submitted'
                      CHECK(status IN ('draft','submitted','under_review','approved','denied','appealed')),
      claim_type      TEXT NOT NULL DEFAULT 'medical'
                      CHECK(claim_type IN ('medical','dental','vision','pharmacy','mental_health')),
      notes           TEXT,
      flags           TEXT,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_claims_status       ON claims(status);
    CREATE INDEX IF NOT EXISTS idx_claims_service_date ON claims(service_date);
    CREATE INDEX IF NOT EXISTS idx_claims_patient      ON claims(patient_id);
    CREATE INDEX IF NOT EXISTS idx_claims_provider     ON claims(provider_npi);
    CREATE INDEX IF NOT EXISTS idx_claims_type         ON claims(claim_type);
  `);
}
