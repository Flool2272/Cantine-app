import { Pool, type QueryResultRow } from "pg";
import bcrypt from "bcryptjs";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __dbInitPromise: Promise<void> | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL n'est pas défini");
  }
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
}

export const pool = global.__pgPool ?? createPool();
global.__pgPool = pool;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matricule du badge cantine, saisi à l'import ou modifiable ensuite. Optionnel
-- (NULL tant qu'il n'est pas renseigné) : un index unique partiel autorise
-- plusieurs employés sans matricule sans permettre de doublon entre deux badges.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS matricule TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_matricule ON employees(matricule) WHERE matricule IS NOT NULL;

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, meal_date)
);

-- 'yes' = mange à la cantine, 'no' = a explicitement indiqué ne pas manger.
-- L'absence de ligne = pas encore répondu (distinct d'un "non" explicite).
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'yes';

CREATE INDEX IF NOT EXISTS idx_registrations_date ON registrations(meal_date);
CREATE INDEX IF NOT EXISTS idx_registrations_employee ON registrations(employee_id);

CREATE TABLE IF NOT EXISTS provider_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS actual_attendance (
  meal_date DATE PRIMARY KEY,
  actual_count INTEGER NOT NULL,
  entered_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Passages badge individuels à la cantine (un jour donné). Pas encore alimentée
-- par une intégration automatique : structure préparée en amont pour le futur
-- rapprochement "inscrit vs a réellement badgé", quelle que soit la source
-- (export du terminal du prestataire, webhook, ou import manuel).
CREATE TABLE IF NOT EXISTS badge_scans (
  id SERIAL PRIMARY KEY,
  matricule TEXT NOT NULL,
  meal_date DATE NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(matricule, meal_date)
);

CREATE INDEX IF NOT EXISTS idx_badge_scans_date ON badge_scans(meal_date);
`;

async function bootstrapAccount(
  table: "admin_accounts" | "provider_accounts",
  nameEnv: string,
  codeEnv: string
) {
  const name = process.env[nameEnv];
  const code = process.env[codeEnv];
  if (!name || !code) return;

  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
  if (rows[0].count > 0) return;

  const hash = await bcrypt.hash(code, 10);
  await pool.query(`INSERT INTO ${table} (name, code_hash) VALUES ($1, $2)`, [name, hash]);
}

async function initSchema(): Promise<void> {
  await pool.query(SCHEMA_SQL);
  await bootstrapAccount("admin_accounts", "ADMIN_BOOTSTRAP_NAME", "ADMIN_BOOTSTRAP_CODE");
  await bootstrapAccount("provider_accounts", "PROVIDER_BOOTSTRAP_NAME", "PROVIDER_BOOTSTRAP_CODE");
}

export function ensureSchema(): Promise<void> {
  if (!global.__dbInitPromise) {
    global.__dbInitPromise = initSchema().catch((err) => {
      global.__dbInitPromise = undefined;
      throw err;
    });
  }
  return global.__dbInitPromise;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureSchema();
  const res = await pool.query<T>(text, params);
  return res.rows;
}
