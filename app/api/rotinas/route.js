import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { requireSession } from "@/app/lib/auth";

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
          portador_id,
          hora,
          titulo,
          concluida,
          criado_em
        FROM rotinas
        WHERE portador_id = $1
        ORDER BY hora ASC, id ASC
        `,
                [portadorId]
            );
        } else {
            result = await pool.query(`
        SELECT
          id,
          portador_id,
          hora,
          titulo,
          concluida,
          criado_em
        FROM rotinas
        ORDER BY portador_id ASC, hora ASC, id ASC
      `);
        }

        const rotinas = result.rows.map((rotina) => ({
            id: String(rotina.id),
            portadorId: String(rotina.portador_id),
            hora: rotina.hora,
            titulo: rotina.titulo,
            concluida: rotina.concluida,
            criadoEm: rotina.criado_em,
        }));

        return NextResponse.json({
            success: true,
            rotinas,
        });
    } catch (error) {
        console.error("Erro ao buscar rotinas:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Erro ao buscar rotinas.",
            },
            { status: 500 }
        );
    }
}

export async function POST(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

    try {
        const data = await request.json();

        const {
            portadorId,
            hora,
            titulo,
        } = data;

        if (!portadorId || !hora || !titulo?.trim()) {
            return NextResponse.json(
                {
                    error:
                        "Portador, horário e título são obrigatórios.",
                },
                { status: 400 }
            );
        }

        const portador = await pool.query(
            `
      SELECT id
      FROM portadores
      WHERE id = $1
      `,
            [portadorId]
        );

        if (portador.rows.length === 0) {
            return NextResponse.json(
                {
                    error: "Portador não encontrado.",
                },
                { status: 404 }
            );
        }

        const result = await pool.query(
            `
      INSERT INTO rotinas (
        portador_id,
        hora,
        titulo,
        concluida
      )
      VALUES ($1, $2, $3, FALSE)
      RETURNING
        id,
        portador_id,
        hora,
        titulo,
        concluida,
        criado_em
      `,
            [
                portadorId,
                hora,
                titulo.trim(),
            ]
        );

        const rotina = result.rows[0];

        return NextResponse.json(
            {
                success: true,
                rotina: {
                    id: String(rotina.id),
                    portadorId: String(rotina.portador_id),
                    hora: rotina.hora,
                    titulo: rotina.titulo,
                    concluida: rotina.concluida,
                    criadoEm: rotina.criado_em,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Erro ao criar rotina:", error);

        if (error.code === "23505") {
            return NextResponse.json(
                {
                    error:
                        "Essa rotina já está cadastrada para esse horário.",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                error: "Erro ao criar rotina.",
            },
            { status: 500 }
        );
    }
}

export async function PUT(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

    try {
        const data = await request.json();

        const {
            id,
            hora,
            titulo,
            concluida,
        } = data;

        if (!id) {
            return NextResponse.json(
                {
                    error: "ID da rotina é obrigatório.",
                },
                { status: 400 }
            );
        }

        const atual = await pool.query(
            `
      SELECT
        id,
        hora,
        titulo,
        concluida
      FROM rotinas
      WHERE id = $1
      `,
            [id]
        );

        if (atual.rows.length === 0) {
            return NextResponse.json(
                {
                    error: "Rotina não encontrada.",
                },
                { status: 404 }
            );
        }

        const rotinaAtual = atual.rows[0];

        const novaHora =
            hora !== undefined
                ? hora
                : rotinaAtual.hora;

        const novoTitulo =
            titulo !== undefined
                ? titulo.trim()
                : rotinaAtual.titulo;

        const novaConcluida =
            concluida !== undefined
                ? Boolean(concluida)
                : rotinaAtual.concluida;

        const result = await pool.query(
            `
      UPDATE rotinas
      SET
        hora = $1,
        titulo = $2,
        concluida = $3
      WHERE id = $4
      RETURNING
        id,
        portador_id,
        hora,
        titulo,
        concluida,
        criado_em
      `,
            [
                novaHora,
                novoTitulo,
                novaConcluida,
                id,
            ]
        );

        const rotina = result.rows[0];

        return NextResponse.json({
            success: true,
            rotina: {
                id: String(rotina.id),
                portadorId: String(rotina.portador_id),
                hora: rotina.hora,
                titulo: rotina.titulo,
                concluida: rotina.concluida,
                criadoEm: rotina.criado_em,
            },
        });
    } catch (error) {
        console.error("Erro ao atualizar rotina:", error);

        return NextResponse.json(
            {
                error: "Erro ao atualizar rotina.",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                {
                    error: "ID da rotina é obrigatório.",
                },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `
      DELETE FROM rotinas
      WHERE id = $1
      RETURNING id
      `,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                {
                    error: "Rotina não encontrada.",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            deletedId: String(result.rows[0].id),
        });
    } catch (error) {
        console.error("Erro ao excluir rotina:", error);

        return NextResponse.json(
            {
                error: "Erro ao excluir rotina.",
            },
            { status: 500 }
        );
    }
}