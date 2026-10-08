import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool, { databaseConfigured, getDatabaseConfigurationError } from "@/app/lib/db";
import { setSessionCookie } from "@/app/lib/auth";

const SELF_REGISTER_ROLES = new Set(["acompanhante", "portador"]);

export async function POST(request) {
  let client = null;

  try {
    if (!databaseConfigured) {
      const error = getDatabaseConfigurationError();
      console.error("Erro de configuração do banco:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Banco de dados não configurado. Crie o arquivo .env.local e informe DATABASE_URL.",
        },
        { status: 503 }
      );
    }

    client = await pool.connect();
    const data = await request.json();
    const {
      name,
      email,
      role = "acompanhante",
      phone,
      birthDate,
      password,
      idade,
      condicao,
    } = data;

    if (!name?.trim() || !password?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nome e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (password.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: "A senha deve ter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email?.trim().toLowerCase() || "";
    const cleanPhone = phone?.trim() || "";

    if (!SELF_REGISTER_ROLES.has(role)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "O perfil Administrador é criado apenas pela configuração administrativa do sistema.",
        },
        { status: 403 }
      );
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(name) = $1
         OR ($2 <> '' AND LOWER(email) = $2)
      LIMIT 1
      `,
      [cleanName.toLowerCase(), cleanEmail]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Já existe um usuário com esse nome ou e-mail cadastrado.",
        },
        { status: 409 }
      );
    }

    const senhaHash = await bcrypt.hash(password.trim(), 12);

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO users
        (name, email, phone, birth_date, role, password)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        name,
        email,
        phone,
        birth_date,
        role,
        created_at
      `,
      [
        cleanName,
        cleanEmail || null,
        cleanPhone || null,
        birthDate || null,
        role,
        senhaHash,
      ]
    );

    const user = result.rows[0];

    if (role === "portador") {
      await client.query(
        `
        INSERT INTO portadores (
          user_id,
          nome,
          idade,
          condicao,
          humor,
          humor_emoji,
          local,
          distancia_metros,
          pin_x,
          pin_y,
          geofence_max,
          bateria
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, 0, 50, 50, 150, 100
        )
        ON CONFLICT (user_id) DO NOTHING
        `,
        [
          user.id,
          cleanName,
          idade?.trim() || null,
          condicao?.trim() || null,
          "Calmo",
          "😌",
          "A definir",
        ]
      );
    }

    await client.query("COMMIT");

    const userSafe = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birth_date,
      role: user.role,
      createdAt: user.created_at,
    };

    const response = NextResponse.json(
      { success: true, user: userSafe },
      { status: 201 }
    );

    setSessionCookie(response, userSafe);
    return response;
  } catch (error) {
    try {
      if (client) await client.query("ROLLBACK");
    } catch {}

    console.error("Erro no cadastro:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao cadastrar usuário." },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
