import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { requireSession } from "@/app/lib/auth";
import { listarPortadoresAcessiveis, podeAcessarPortador } from "@/app/lib/portador-access";

/* ================================================================ */
/* GET — LISTAR EMERGÊNCIAS                                        */
/* ================================================================ */

export async function GET(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const portadorId = searchParams.get("portadorId");

    if (portadorId && !(await podeAcessarPortador(auth.session, portadorId))) {
      return NextResponse.json(
        { success: false, error: "Você não possui acesso a este portador." },
        { status: 403 }
      );
    }

    let result;

    if (portadorId) {
      result = await pool.query(
        `
        SELECT
          e.id,
          e.portador_id AS "portadorId",
          e.acionada_por AS "acionadaPor",
          e.latitude,
          e.longitude,
          e.status,
          e.criada_em AS "criadaEm",
          p.nome AS "portadorNome"
        FROM emergencias e
        INNER JOIN portadores p ON p.id = e.portador_id
        WHERE e.portador_id = $1
        ORDER BY e.criada_em DESC
        `,
        [portadorId]
      );
    } else if (auth.session.role === "administrador") {
      result = await pool.query(`
        SELECT
          e.id,
          e.portador_id AS "portadorId",
          e.acionada_por AS "acionadaPor",
          e.latitude,
          e.longitude,
          e.status,
          e.criada_em AS "criadaEm",
          p.nome AS "portadorNome"
        FROM emergencias e
        INNER JOIN portadores p ON p.id = e.portador_id
        ORDER BY e.criada_em DESC
      `);
    } else {
      const ids = await listarPortadoresAcessiveis(auth.session);

      if (ids.length === 0) {
        return NextResponse.json({ success: true, emergencias: [] });
      }

      result = await pool.query(
        `
        SELECT
          e.id,
          e.portador_id AS "portadorId",
          e.acionada_por AS "acionadaPor",
          e.latitude,
          e.longitude,
          e.status,
          e.criada_em AS "criadaEm",
          p.nome AS "portadorNome"
        FROM emergencias e
        INNER JOIN portadores p ON p.id = e.portador_id
        WHERE e.portador_id = ANY($1::bigint[])
        ORDER BY e.criada_em DESC
      `,
        [ids]
      );
    }

    return NextResponse.json({ success: true, emergencias: result.rows });
  } catch (error) {
    console.error("ERRO AO BUSCAR EMERGÊNCIAS:", error);

    return NextResponse.json(
      { success: false, error: "Não foi possível carregar as emergências." },
      { status: 500 }
    );
  }
}

/* ================================================================ */
/* POST — REGISTRAR EMERGÊNCIA                                     */
/* ================================================================ */

export async function POST(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const portadorId = body.portadorId;
    const acionadaPor = auth.session.id || null;
    const latitude =
      body.latitude !== undefined &&
      body.latitude !== null &&
      body.latitude !== ""
        ? Number(body.latitude)
        : null;

    const longitude =
      body.longitude !== undefined &&
      body.longitude !== null &&
      body.longitude !== ""
        ? Number(body.longitude)
        : null;

    const status = String(body.status || "aberta").trim();

    if (!portadorId) {
      return NextResponse.json(
        {
          success: false,
          error: "O portador é obrigatório.",
        },
        { status: 400 }
      );
    }

    if (
      latitude !== null &&
      !Number.isFinite(latitude)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Latitude inválida.",
        },
        { status: 400 }
      );
    }

    if (
      longitude !== null &&
      !Number.isFinite(longitude)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Longitude inválida.",
        },
        { status: 400 }
      );
    }

    const portadorExiste = await pool.query(
      `
      SELECT id, nome
      FROM portadores
      WHERE id = $1
      LIMIT 1
      `,
      [portadorId]
    );

    if (portadorExiste.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Portador não encontrado.",
        },
        { status: 404 }
      );
    }

    if (!(await podeAcessarPortador(auth.session, portadorId))) {
      return NextResponse.json(
        {
          success: false,
          error: "Você não possui permissão para registrar emergência para este portador.",
        },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO emergencias (
        portador_id,
        acionada_por,
        latitude,
        longitude,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        portador_id AS "portadorId",
        acionada_por AS "acionadaPor",
        latitude,
        longitude,
        status,
        criada_em AS "criadaEm"
      `,
      [
        portadorId,
        acionadaPor,
        latitude,
        longitude,
        status,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        emergencia: {
          ...result.rows[0],
          portadorNome:
            portadorExiste.rows[0].nome,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "ERRO AO REGISTRAR EMERGÊNCIA:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível registrar a emergência.",
      },
      { status: 500 }
    );
  }
}