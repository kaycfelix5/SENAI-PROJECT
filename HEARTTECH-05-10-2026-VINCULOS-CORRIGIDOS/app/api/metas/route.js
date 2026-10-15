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
          titulo,
          progresso,
          criado_em
        FROM metas
        WHERE portador_id = $1
        ORDER BY id ASC
        `,
                [portadorId]
            );
        } else {
            result = await pool.query(`
        SELECT
          id,
          portador_id,
          titulo,
          progresso,
          criado_em
        FROM metas
        ORDER BY portador_id ASC, id ASC
      `);
        }

        const metas = result.rows.map((meta) => ({
            id: String(meta.id),
            portadorId: String(meta.portador_id),
            titulo: meta.titulo,
            progresso: Number(meta.progresso) || 0,
            criadoEm: meta.criado_em,
        }));

        return NextResponse.json({
            success: true,
            metas,
        });
    } catch (error) {
        console.error("Erro ao buscar metas:", error);

        return NextResponse.json(
            {
                success: false,
                error: "Erro ao buscar metas.",
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
            titulo,
            progresso = 0,
        } = data;

        if (!portadorId || !titulo?.trim()) {
            return NextResponse.json(
                {
                    error: "Portador e título da meta são obrigatórios.",
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

        const progressoSeguro = Math.min(
            100,
            Math.max(0, Number(progresso) || 0)
        );

        const result = await pool.query(
            `
      INSERT INTO metas (
        portador_id,
        titulo,
        progresso
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        portador_id,
        titulo,
        progresso,
        criado_em
      `,
            [
                portadorId,
                titulo.trim(),
                progressoSeguro,
            ]
        );

        const meta = result.rows[0];

        return NextResponse.json(
            {
                success: true,
                meta: {
                    id: String(meta.id),
                    portadorId: String(meta.portador_id),
                    titulo: meta.titulo,
                    progresso: Number(meta.progresso) || 0,
                    criadoEm: meta.criado_em,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Erro ao criar meta:", error);

        if (error.code === "23505") {
            return NextResponse.json(
                {
                    error:
                        "Essa meta já está cadastrada para esse portador.",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            {
                error: "Erro ao criar meta.",
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
            titulo,
            progresso,
        } = data;

        if (!id) {
            return NextResponse.json(
                {
                    error: "ID da meta é obrigatório.",
                },
                { status: 400 }
            );
        }

        const atual = await pool.query(
            `
      SELECT
        id,
        titulo,
        progresso
      FROM metas
      WHERE id = $1
      `,
            [id]
        );

        if (atual.rows.length === 0) {
            return NextResponse.json(
                {
                    error: "Meta não encontrada.",
                },
                { status: 404 }
            );
        }

        const metaAtual = atual.rows[0];

        const novoTitulo =
            titulo !== undefined
                ? titulo.trim()
                : metaAtual.titulo;

        let novoProgresso =
            progresso !== undefined
                ? Number(progresso)
                : Number(metaAtual.progresso);

        novoProgresso = Math.min(
            100,
            Math.max(0, novoProgresso || 0)
        );

        const result = await pool.query(
            `
      UPDATE metas
      SET
        titulo = $1,
        progresso = $2
      WHERE id = $3
      RETURNING
        id,
        portador_id,
        titulo,
        progresso,
        criado_em
      `,
            [
                novoTitulo,
                novoProgresso,
                id,
            ]
        );

        const meta = result.rows[0];

        return NextResponse.json({
            success: true,
            meta: {
                id: String(meta.id),
                portadorId: String(meta.portador_id),
                titulo: meta.titulo,
                progresso: Number(meta.progresso) || 0,
                criadoEm: meta.criado_em,
            },
        });
    } catch (error) {
        console.error("Erro ao atualizar meta:", error);

        return NextResponse.json(
            {
                error: "Erro ao atualizar meta.",
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
                    error: "ID da meta é obrigatório.",
                },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `
      DELETE FROM metas
      WHERE id = $1
      RETURNING id
      `,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                {
                    error: "Meta não encontrada.",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            deletedId: String(result.rows[0].id),
        });
    } catch (error) {
        console.error("Erro ao excluir meta:", error);

        return NextResponse.json(
            {
                error: "Erro ao excluir meta.",
            },
            { status: 500 }
        );
    }
}