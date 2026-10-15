import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import pool, { databaseConfigured, getDatabaseConfigurationError } from "@/app/lib/db";

export async function GET(request) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 }
    );
  }

  try {
    if (!databaseConfigured) {
      const error = getDatabaseConfigurationError();
      console.error("Erro de configuração do banco:", error);
      return NextResponse.json(
        { authenticated: false, user: null, error: "Banco de dados não configurado." },
        { status: 503 }
      );
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        birth_date AS "birthDate",
        role,
        created_at AS "createdAt"
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [session.id]
    );

    if (result.rows.length === 0) {
      const response = NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
      response.cookies.set({
        name: "hearttech_session",
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao validar sessão:", error);
    return NextResponse.json(
      { authenticated: false, user: null, error: "Não foi possível validar a sessão." },
      { status: 500 }
    );
  }
}
