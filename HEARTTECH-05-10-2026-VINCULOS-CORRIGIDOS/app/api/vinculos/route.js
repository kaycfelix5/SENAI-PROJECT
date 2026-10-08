import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { requireSession } from "@/app/lib/auth";

async function buscarPortador(id) {
  const result = await pool.query(
    `
    SELECT
      p.id,
      p.user_id AS "userId",
      p.nome,
      p.idade,
      p.condicao,
      p.device_id AS "deviceId",
      p.bateria,
      p.geofence_max AS "geofenceMax"
    FROM portadores p
    WHERE p.id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

export async function GET(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const user = auth.session;

  try {
    if (user.role === "administrador") {
      const result = await pool.query(`
        SELECT
          ap.acompanhante_id AS "acompanhanteId",
          a.name AS "acompanhanteNome",
          a.email AS "acompanhanteEmail",
          ap.portador_id AS "portadorId",
          p.nome AS "portadorNome",
          p.idade AS "portadorIdade",
          p.condicao AS "portadorCondicao",
          ap.criado_em AS "criadoEm"
        FROM acompanhante_portador ap
        INNER JOIN users a ON a.id = ap.acompanhante_id
        INNER JOIN portadores p ON p.id = ap.portador_id
        ORDER BY a.name ASC, p.nome ASC
      `);

      const disponiveis = await pool.query(`
        SELECT
          p.id,
          p.user_id AS "userId",
          p.nome,
          p.idade,
          p.condicao,
          p.device_id AS "deviceId",
          p.bateria,
          p.geofence_max AS "geofenceMax"
        FROM portadores p
        LEFT JOIN acompanhante_portador ap
          ON ap.portador_id = p.id
        WHERE ap.portador_id IS NULL
        ORDER BY p.nome ASC
      `);

      return NextResponse.json({
        success: true,
        vinculos: result.rows,
        disponiveis: disponiveis.rows,
      });
    }

    if (user.role === "acompanhante") {
      const result = await pool.query(
        `
        SELECT
          ap.acompanhante_id AS "acompanhanteId",
          a.name AS "acompanhanteNome",
          a.email AS "acompanhanteEmail",
          ap.portador_id AS "portadorId",
          p.nome AS "portadorNome",
          p.idade AS "portadorIdade",
          p.condicao AS "portadorCondicao",
          ap.criado_em AS "criadoEm"
        FROM acompanhante_portador ap
        INNER JOIN users a ON a.id = ap.acompanhante_id
        INNER JOIN portadores p ON p.id = ap.portador_id
        WHERE ap.acompanhante_id = $1
        ORDER BY p.nome ASC
        `,
        [user.id]
      );

      const disponiveis = await pool.query(`
        SELECT
          p.id,
          p.user_id AS "userId",
          p.nome,
          p.idade,
          p.condicao,
          p.device_id AS "deviceId",
          p.bateria,
          p.geofence_max AS "geofenceMax"
        FROM portadores p
        LEFT JOIN acompanhante_portador ap
          ON ap.portador_id = p.id
        WHERE ap.portador_id IS NULL
        ORDER BY p.nome ASC
      `);

      return NextResponse.json({
        success: true,
        vinculos: result.rows,
        disponiveis: disponiveis.rows,
      });
    }

    if (user.role === "portador") {
      const acompanhante = await pool.query(
        `
        SELECT
          ap.portador_id AS "portadorId",
          a.id AS "acompanhanteId",
          a.name AS "acompanhanteNome",
          a.email AS "acompanhanteEmail",
          a.phone AS "acompanhanteTelefone",
          ap.criado_em AS "criadoEm"
        FROM acompanhante_portador ap
        INNER JOIN users a ON a.id = ap.acompanhante_id
        INNER JOIN portadores p ON p.id = ap.portador_id
        WHERE p.user_id = $1
        LIMIT 1
        `,
        [user.id]
      );

      return NextResponse.json({
        success: true,
        vinculos: [],
        disponiveis: [],
        acompanhante: acompanhante.rows[0] || null,
      });
    }

    return NextResponse.json(
      { success: false, error: "Perfil não autorizado." },
      { status: 403 }
    );
  } catch (error) {
    console.error("Erro ao consultar vínculos:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível carregar os vínculos." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = requireSession(request, ["acompanhante", "administrador"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const portadorId = body.portadorId;
    const acompanhanteId =
      auth.session.role === "administrador"
        ? body.acompanhanteId
        : auth.session.id;

    if (!portadorId) {
      return NextResponse.json(
        { success: false, error: "O portador é obrigatório." },
        { status: 400 }
      );
    }

    if (!acompanhanteId) {
      return NextResponse.json(
        { success: false, error: "O acompanhante é obrigatório." },
        { status: 400 }
      );
    }

    const acompanhante = await pool.query(
      `SELECT id, name, role FROM users WHERE id = $1 LIMIT 1`,
      [acompanhanteId]
    );

    if (
      acompanhante.rows.length === 0 ||
      acompanhante.rows[0].role !== "acompanhante"
    ) {
      return NextResponse.json(
        { success: false, error: "Acompanhante inválido." },
        { status: 400 }
      );
    }

    const portador = await buscarPortador(portadorId);
    if (!portador) {
      return NextResponse.json(
        { success: false, error: "Portador não encontrado." },
        { status: 404 }
      );
    }

    const existente = await pool.query(
      `
      SELECT acompanhante_id
      FROM acompanhante_portador
      WHERE portador_id = $1
      LIMIT 1
      `,
      [portadorId]
    );

    if (existente.rows.length > 0) {
      if (String(existente.rows[0].acompanhante_id) === String(acompanhanteId)) {
        return NextResponse.json(
          { success: false, error: "Este portador já está vinculado a este acompanhante." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: "Este portador já possui um acompanhante vinculado." },
        { status: 409 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO acompanhante_portador (acompanhante_id, portador_id)
      VALUES ($1, $2)
      RETURNING
        acompanhante_id AS "acompanhanteId",
        portador_id AS "portadorId",
        criado_em AS "criadoEm"
      `,
      [acompanhanteId, portadorId]
    );

    return NextResponse.json(
      {
        success: true,
        vinculo: {
          ...result.rows[0],
          acompanhanteNome: acompanhante.rows[0].name,
          portadorNome: portador.nome,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar vínculo:", error);

    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "O portador já possui um vínculo ativo." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Não foi possível criar o vínculo." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const auth = requireSession(request, ["acompanhante", "administrador"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const portadorId = body.portadorId;
    const acompanhanteId =
      auth.session.role === "administrador"
        ? body.acompanhanteId
        : auth.session.id;

    if (!portadorId) {
      return NextResponse.json(
        { success: false, error: "O portador é obrigatório." },
        { status: 400 }
      );
    }

    if (!acompanhanteId) {
      return NextResponse.json(
        { success: false, error: "O acompanhante é obrigatório." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      DELETE FROM acompanhante_portador
      WHERE acompanhante_id = $1
        AND portador_id = $2
      RETURNING acompanhante_id AS "acompanhanteId", portador_id AS "portadorId"
      `,
      [acompanhanteId, portadorId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Vínculo não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      removed: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao remover vínculo:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível remover o vínculo." },
      { status: 500 }
    );
  }
}
