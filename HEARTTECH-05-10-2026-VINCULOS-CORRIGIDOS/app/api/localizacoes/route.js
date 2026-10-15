import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { requireSession } from "@/app/lib/auth";
import { listarPortadoresAcessiveis, podeAcessarPortador } from "@/app/lib/portador-access";

/* ================================================================ */
/* GET — ÚLTIMAS LOCALIZAÇÕES                                      */
/* ================================================================ */

export async function GET(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const portadorId = searchParams.get("portadorId");

    if (portadorId && !(await podeAcessarPortador(auth.session, portadorId))) {
      return NextResponse.json(
        { success: false, error: "Você não possui acesso à localização deste portador." },
        { status: 403 }
      );
    }

    let result;

    if (portadorId) {
      result = await pool.query(
        `
        SELECT
          l.id,
          l.portador_id AS "portadorId",
          l.latitude,
          l.longitude,
          l.bateria,
          l.precisao_metros AS "precisao",
          l.registrada_em AS "registradaEm"
        FROM localizacoes l
        WHERE l.portador_id = $1
        ORDER BY l.registrada_em DESC
        LIMIT 1
        `,
        [portadorId]
      );
    } else if (auth.session.role === "administrador") {
      result = await pool.query(`
        SELECT
          l.id,
          l.portador_id AS "portadorId",
          l.latitude,
          l.longitude,
          l.bateria,
          l.precisao_metros AS "precisao",
          l.registrada_em AS "registradaEm"
        FROM localizacoes l
        ORDER BY l.registrada_em DESC
      `);
    } else {
      const ids = await listarPortadoresAcessiveis(auth.session);

      if (ids.length === 0) {
        return NextResponse.json({ success: true, localizacoes: [] });
      }

      result = await pool.query(
        `
        SELECT
          l.id,
          l.portador_id AS "portadorId",
          l.latitude,
          l.longitude,
          l.bateria,
          l.precisao_metros AS "precisao",
          l.registrada_em AS "registradaEm"
        FROM localizacoes l
        WHERE l.portador_id = ANY($1::bigint[])
        ORDER BY l.registrada_em DESC
        `,
        [ids]
      );
    }

    return NextResponse.json({
      success: true,
      localizacoes: result.rows,
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR LOCALIZAÇÕES:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível buscar as localizações.",
      },
      { status: 500 }
    );
  }
}

/* ================================================================ */
/* POST — REGISTRAR LOCALIZAÇÃO                                    */
/* ================================================================ */

export async function POST(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const portadorId = body.portadorId;
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    const bateria =
      body.bateria !== undefined &&
      body.bateria !== null &&
      body.bateria !== ""
        ? Number(body.bateria)
        : null;

    const precisao =
      body.precisao !== undefined &&
      body.precisao !== null &&
      body.precisao !== ""
        ? Number(body.precisao)
        : null;

    const registradaEm =
      body.timestamp || body.registradaEm || null;

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
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
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
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Longitude inválida.",
        },
        { status: 400 }
      );
    }

    if (
      bateria !== null &&
      (!Number.isFinite(bateria) ||
        bateria < 0 ||
        bateria > 100)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Bateria inválida.",
        },
        { status: 400 }
      );
    }


    if (
      precisao !== null &&
      (!Number.isFinite(precisao) ||
        precisao < 0 ||
        precisao > 10000)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Precisão GPS inválida.",
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
          error: "Você não possui permissão para registrar localização deste portador.",
        },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO localizacoes (
        portador_id,
        latitude,
        longitude,
        bateria,
        precisao_metros,
        registrada_em
      )
      VALUES (
        $1, $2, $3, $4, $5,
        COALESCE($6::timestamp, CURRENT_TIMESTAMP)
      )
      RETURNING
        id,
        portador_id AS "portadorId",
        latitude,
        longitude,
        bateria,
        precisao_metros AS "precisao",
        registrada_em AS "registradaEm"
      `,
      [
        portadorId,
        latitude,
        longitude,
        bateria,
        precisao,
        registradaEm,
      ]
    );

    /*
     * Também atualiza a bateria do portador,
     * quando ela foi enviada.
     */
    if (bateria !== null) {
      await pool.query(
        `
        UPDATE portadores
        SET bateria = $1
        WHERE id = $2
        `,
        [bateria, portadorId]
      );
    }

    return NextResponse.json(
      {
        success: true,
        localizacao: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "ERRO AO REGISTRAR LOCALIZAÇÃO:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível registrar a localização.",
      },
      { status: 500 }
    );
  }
}