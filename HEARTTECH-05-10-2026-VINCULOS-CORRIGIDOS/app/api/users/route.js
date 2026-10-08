import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/app/lib/db";
import { requireSession } from "@/app/lib/auth";

const MANAGED_ROLES = new Set(["acompanhante", "portador"]);

export async function GET(request) {
  const auth = requireSession(request, ["administrador"]);
  if (!auth.ok) return auth.response;

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        birth_date,
        role,
        created_at
      FROM users
      ORDER BY id ASC
      `
    );

    const users = result.rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birth_date,
      role: user.role,
      createdAt: user.created_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao buscar usuários." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = requireSession(request, ["administrador"]);
  if (!auth.ok) return auth.response;

  try {
    const data = await request.json();
    const {
      name,
      email,
      role = "acompanhante",
      phone,
      birthDate,
      password,
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

    if (!MANAGED_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, error: "O administrador principal não pode ser criado por este formulário." },
        { status: 403 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email?.trim().toLowerCase() || "";
    const cleanPhone = phone?.trim() || "";

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
        { success: false, error: "Já existe um usuário com esse nome ou e-mail cadastrado." },
        { status: 409 }
      );
    }

    const senhaHash = await bcrypt.hash(password.trim(), 12);

    const result = await pool.query(
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
      await pool.query(
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
        VALUES ($1, $2, NULL, NULL, 'Calmo', '😌', 'A definir', 0, 50, 50, 150, 100)
        ON CONFLICT (user_id) DO NOTHING
        `,
        [user.id, user.name]
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          birthDate: user.birth_date,
          role: user.role,
          createdAt: user.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar usuário pelo administrador:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao criar usuário." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const auth = requireSession(request, ["administrador"]);
  if (!auth.ok) return auth.response;

  try {
    const { id, name } = await request.json();

    if (!id && !name) {
      return NextResponse.json(
        { success: false, error: "ID ou nome do usuário é obrigatório." },
        { status: 400 }
      );
    }

    const userResult = await pool.query(
      `
      SELECT id, name, role
      FROM users
      WHERE ($1 <> '' AND id::text = $1)
         OR ($2 <> '' AND LOWER(name) = LOWER($2))
      LIMIT 1
      `,
      [id ? String(id) : "", name ? String(name).trim() : ""]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (user.role === "administrador") {
      return NextResponse.json(
        { success: false, error: "O administrador principal não pode ser excluído." },
        { status: 403 }
      );
    }

    await pool.query("DELETE FROM users WHERE id = $1", [user.id]);

    return NextResponse.json({
      success: true,
      removed: user.name,
    });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao excluir usuário." },
      { status: 500 }
    );
  }
}
