import fs from "fs";
import path from "path";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

const dbPath = path.join(process.cwd(), "data", "db.json");

async function migrarUsuarios() {
    try {
        const arquivo = fs.readFileSync(dbPath, "utf-8");
        const db = JSON.parse(arquivo);

        if (!Array.isArray(db.users)) {
            throw new Error("A lista de usuários não foi encontrada no db.json.");
        }

        await client.connect();

        console.log("Conectado ao PostgreSQL.");

        // Permite que a coluna ID trabalhe com números grandes.
        await client.query(`
      ALTER SEQUENCE IF EXISTS users_id_seq AS bigint;
    `);

        await client.query(`
      ALTER TABLE users
      ALTER COLUMN id TYPE BIGINT;
    `);

        let cadastrados = 0;
        let ignorados = 0;

        for (const user of db.users) {
            const resultado = await client.query(
                `
        INSERT INTO users
          (name, email, phone, birth_date, role, password)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, name, email;
        `,
                [
                    user.name,
                    user.email || null,
                    user.phone || null,
                    user.birthDate || null,
                    user.role || "acompanhante",
                    String(user.password || "").startsWith("$2")
                      ? String(user.password)
                      : await bcrypt.hash(String(user.password || ""), 12)
                ]
            );

            if (resultado.rowCount > 0) {
                cadastrados++;
                console.log(
                    `✓ Usuário migrado: ${resultado.rows[0].name}`
                );
            } else {
                ignorados++;
                console.log(
                    `- Usuário já existente: ${user.name}`
                );
            }
        }

        console.log("");
        console.log(`Usuários cadastrados: ${cadastrados}`);
        console.log(`Usuários ignorados: ${ignorados}`);
        console.log("Migração concluída!");
    } catch (error) {
        console.error("Erro na migração:", error);
    } finally {
        await client.end();
    }
}

migrarUsuarios();