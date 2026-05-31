-- Users (shared across roles)
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('patient','provider','admin')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Patient profiles
CREATE TABLE IF NOT EXISTS patients (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth      TEXT NOT NULL,
  insurance_id       TEXT NOT NULL,
  insurance_provider TEXT NOT NULL,
  phone              TEXT NOT NULL,
  address            TEXT NOT NULL
);

-- Provider profiles
CREATE TABLE IF NOT EXISTS providers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  npi           TEXT NOT NULL UNIQUE,
  specialty     TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address       TEXT NOT NULL
);

-- Claims
CREATE TABLE IF NOT EXISTS claims (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_number    TEXT NOT NULL UNIQUE,
  patient_id      INTEGER NOT NULL REFERENCES patients(id),
  provider_id     INTEGER NOT NULL REFERENCES providers(id),
  service_date    TEXT NOT NULL,
  diagnosis_codes TEXT NOT NULL,
  procedure_codes TEXT NOT NULL,
  billed_amount   REAL NOT NULL,
  approved_amount REAL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK(status IN ('draft','submitted','under_review','approved','denied','appealed')),
  notes           TEXT,
  submitted_at    TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Claim audit trail
CREATE TABLE IF NOT EXISTS claim_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  claim_id   INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  old_status TEXT,
  new_status TEXT NOT NULL,
  note       TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_claims_patient   ON claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_provider  ON claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_claims_status    ON claims(status);
CREATE INDEX IF NOT EXISTS idx_history_claim    ON claim_history(claim_id);
