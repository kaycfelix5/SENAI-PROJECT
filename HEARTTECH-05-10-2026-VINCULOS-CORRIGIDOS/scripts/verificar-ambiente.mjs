import pg from "pg";

const { Client } = pg;

const REQUIRED = [
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["HEARTTECH_SESSION_SECRET", process.env.HEARTTECH_SESSION_SECRET],
  ["HEARTTECH_ADMIN_PASSWORD", process.env.HEARTTECH_ADMIN_PASSWORD],
  ["HEARTTECH_DEVICE_TOKEN", process.env.HEARTTECH_DEVICE_TOKEN],
];

let hasError = false;

console.log("\n=== HEART-TECH | DIAGNÓSTICO DE AMBIENTE ===\n");

for (const [name, value] of REQUIRED) {
  const ok = Boolean(value?.trim());
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) hasError = true;
}

if (hasError) {
  console.log("\nCrie/preencha o arquivo .env.local na raiz do projeto antes de continuar.");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

try {
  await client.connect();
  const result = await client.query("SELECT current_database() AS banco, NOW() AS agora");
  console.log(`\n✓ PostgreSQL conectado: ${result.rows[0].banco}`);
  console.log(`✓ Horário do servidor: ${result.rows[0].agora}`);
  console.log("\nAmbiente pronto para npm run dev.\n");
} catch (error) {
  hasError = true;
  console.error("\n✗ Não foi possível conectar ao PostgreSQL.");
  console.error(`  ${error.message}\n`);
} finally {
  await client.end().catch(() => {});
}

process.exit(hasError ? 1 : 0);
