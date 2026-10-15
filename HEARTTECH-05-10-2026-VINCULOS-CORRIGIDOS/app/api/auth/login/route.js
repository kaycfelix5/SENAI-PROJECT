import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool, { databaseConfigured, getDatabaseConfigurationError } from "@/app/lib/db";
import { setSessionCookie } from "@/app/lib/auth";

export async function POST(request) {
  try {
    const { name, password } = await request.json();

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

    if (!name?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "Preencha o nome/e-mail e a senha." },
        { status: 400 }
      );
    }

    const cleanInput = name.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        birth_date,
        role,
        password,
        created_at
      FROM users
      WHERE LOWER(name) = $1
         OR LOWER(email) = $1
         OR ($1 = 'admin' AND role = 'administrador')
      LIMIT 1
      `,
      [cleanInput]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nome/e-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const passwordHash = String(user.password || "");

    if (!passwordHash.startsWith("$2")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A conta ainda não está com a senha protegida. Execute a migração de senhas do projeto.",
        },
        { status: 503 }
      );
    }

    const passwordOk = await bcrypt.compare(password, passwordHash);

    if (!passwordOk) {
      return NextResponse.json(
        { success: false, error: "Nome/e-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    const userSafe = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birth_date,
      role: user.role,
      createdAt: user.created_at,
    };

    const response = NextResponse.json({
      success: true,
      user: userSafe,
    });

    setSessionCookie(response, userSafe);
    return response;
  } catch (error) {
    console.error("Erro no login:", error);

    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
