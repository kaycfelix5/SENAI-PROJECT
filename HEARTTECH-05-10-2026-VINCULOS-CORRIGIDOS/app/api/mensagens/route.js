import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { requireSession } from "@/app/lib/auth";

/* ================================================================ */
/* GET — LISTAR MENSAGENS                                           */
/* ================================================================ */

export async function GET(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const portadorId = searchParams.get("portadorId");

    let result;

    if (portadorId) {
      result = await pool.query(
        `
        SELECT
          id,
          portador_id AS "portadorId",
          texto,
          hora,
          criado_em AS "criadoEm"
        FROM mensagens
        WHERE portador_id = $1
        ORDER BY criado_em ASC
        `,
        [portadorId]
      );
    } else {
      result = await pool.query(
        `
        SELECT
          id,
          portador_id AS "portadorId",
          texto,
          hora,
          criado_em AS "criadoEm"
        FROM mensagens
        ORDER BY criado_em ASC
        `
      );
    }

    return NextResponse.json({
      success: true,
      mensagens: result.rows,
    });
  } catch (error) {
    console.error("ERRO AO BUSCAR MENSAGENS:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível carregar as mensagens.",
      },
      { status: 500 }
    );
  }
}

/* ================================================================ */
/* POST — ENVIAR MENSAGEM                                           */
/* ================================================================ */

export async function POST(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const portadorId = body.portadorId;
    const texto = String(body.texto || "").trim();

    if (!portadorId || !texto) {
      return NextResponse.json(
        {
          success: false,
          error: "Portador e mensagem são obrigatórios.",
        },
        { status: 400 }
      );
    }

    const agora = new Date();

    const hora = agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const result = await pool.query(
      `
      INSERT INTO mensagens (
        portador_id,
        texto,
        hora
      )
      VALUES ($1, $2, $3)
      ON CONFLICT (portador_id, texto, hora)
      DO NOTHING
      RETURNING
        id,
        portador_id AS "portadorId",
        texto,
        hora,
        criado_em AS "criadoEm"
      `,
      [portadorId, texto, hora]
    );

    let mensagem = result.rows[0];

    /*
     * Caso a mesma mensagem seja enviada novamente
     * no mesmo minuto, a tabela possui uma restrição UNIQUE.
     * Nesse caso, recuperamos o registro existente.
     */
    if (!mensagem) {
      const existente = await pool.query(
        `
        SELECT
          id,
          portador_id AS "portadorId",
          texto,
          hora,
          criado_em AS "criadoEm"
        FROM mensagens
        WHERE portador_id = $1
          AND texto = $2
          AND hora = $3
        LIMIT 1
        `,
        [portadorId, texto, hora]
      );

      mensagem = existente.rows[0];
    }

    return NextResponse.json({
      success: true,
      mensagem,
    });
  } catch (error) {
    console.error("ERRO AO ENVIAR MENSAGEM:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível enviar a mensagem.",
      },
      { status: 500 }
    );
  }
}