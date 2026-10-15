import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function protegerSenhas() {
    try {
        await client.connect();

        const resultado = await client.query(
            "SELECT id, name, password FROM users"
        );

        for (const user of resultado.rows) {
            // Se já estiver protegida, não faz novamente.
            if (user.password.startsWith("$2")) {
                console.log(`- ${user.name}: senha já protegida`);
                continue;
            }

            const hash = await bcrypt.hash(user.password, 10);

            await client.query(
                "UPDATE users SET password = $1 WHERE id = $2",
                [hash, user.id]
            );

            console.log(`✓ ${user.name}: senha protegida`);
        }

        console.log("\nTodas as senhas foram processadas.");
    } catch (error) {
        console.error("Erro:", error);
    } finally {
        await client.end();
    }
}

protegerSenhas();