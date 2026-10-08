import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL?.trim() || "";

export const databaseConfigured = Boolean(databaseUrl);

export function getDatabaseConfigurationError() {
  if (databaseConfigured) return null;

  return new Error(
    "DATABASE_URL não foi configurada. Crie o arquivo .env.local na raiz do projeto e defina a conexão do PostgreSQL."
  );
}

const pool = new Pool({
  connectionString: databaseUrl || undefined,
  connectionTimeoutMillis: 5000,
  max: 10,
  idleTimeoutMillis: 30000,
});

export default pool;
