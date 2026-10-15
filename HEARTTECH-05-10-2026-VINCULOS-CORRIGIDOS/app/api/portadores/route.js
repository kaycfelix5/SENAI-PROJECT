import { NextResponse } from "next/server";
import pool from "@/app/lib/db";
import { requireSession } from "@/app/lib/auth";
import { podeAcessarPortador } from "@/app/lib/portador-access";

const PORTADOR_FIELDS = `
  p.id,
  p.user_id AS "userId",
  p.device_id AS "deviceId",
  p.nome,
  p.idade,
  p.condicao,
  p.humor,
  p.humor_emoji AS "humorEmoji",
  p.local,
  p.distancia_metros AS "distanciaMetros",
  p.pin_x AS "pinX",
  p.pin_y AS "pinY",
  p.geofence_max AS "geofenceMax",
  p.bateria
`;

async function montarPortador(row) {
  const [rotinasResult, metasResult, mensagensResult] = await Promise.all([
    pool.query(
      `
      SELECT id, hora, titulo, concluida
      FROM rotinas
      WHERE portador_id = $1
      ORDER BY hora ASC, id ASC
      `,
      [row.id]
    ),
    pool.query(
      `
      SELECT id, titulo, progresso
      FROM metas
      WHERE portador_id = $1
      ORDER BY id ASC
      `,
      [row.id]
    ),
    pool.query(
      `
      SELECT id, texto, hora, criado_em AS "criadoEm"
      FROM mensagens
      WHERE portador_id = $1
      ORDER BY criado_em ASC
      `,
      [row.id]
    ),
  ]);

  return {
    ...row,
    rotinas: rotinasResult.rows,
    metas: metasResult.rows,
    mensagens: mensagensResult.rows,
  };
}

/* ================================================================ */
/* GET — LISTAR PORTADORES ACESSÍVEIS AO USUÁRIO                   */
/* ================================================================ */
export async function GET(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const user = auth.session;

  try {
    let result;

    if (user.role === "administrador") {
      result = await pool.query(`
        SELECT
          ${PORTADOR_FIELDS},
          (
            SELECT l.latitude
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS latitude,
          (
            SELECT l.precisao_metros
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS "precisao",
          (
            SELECT l.longitude
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS longitude
        FROM portadores p
        ORDER BY p.id ASC
      `);
    } else if (user.role === "acompanhante") {
      result = await pool.query(
        `
        SELECT
          ${PORTADOR_FIELDS},
          (
            SELECT l.latitude
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS latitude,
          (
            SELECT l.precisao_metros
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS "precisao",
          (
            SELECT l.longitude
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS longitude
        FROM portadores p
        INNER JOIN acompanhante_portador ap
          ON ap.portador_id = p.id
        WHERE ap.acompanhante_id = $1
        ORDER BY p.id ASC
        `,
        [user.id]
      );
    } else if (user.role === "portador") {
      result = await pool.query(
        `
        SELECT
          ${PORTADOR_FIELDS},
          (
            SELECT l.latitude
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS latitude,
          (
            SELECT l.precisao_metros
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS "precisao",
          (
            SELECT l.longitude
            FROM localizacoes l
            WHERE l.portador_id = p.id
            ORDER BY l.registrada_em DESC
            LIMIT 1
          ) AS longitude
        FROM portadores p
        WHERE p.user_id = $1
        ORDER BY p.id ASC
        `,
        [user.id]
      );
    } else {
      return NextResponse.json(
        { success: false, error: "Perfil não autorizado." },
        { status: 403 }
      );
    }

    const portadores = await Promise.all(
      result.rows.map((row) => montarPortador(row))
    );

    return NextResponse.json({ success: true, portadores });
  } catch (error) {
    console.error("ERRO AO BUSCAR PORTADORES:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível carregar os portadores.",
      },
      { status: 500 }
    );
  }
}

/* ================================================================ */
/* POST — CRIAR/CONFIGURAR PERFIL DE PORTADOR (ADMIN)              */
/* ================================================================ */
export async function POST(request) {
  const auth = requireSession(request, ["administrador"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "O usuário portador é obrigatório." },
        { status: 400 }
      );
    }

    const userResult = await pool.query(
      `
      SELECT id, name, role
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    const user = userResult.rows[0];

    if (!user || user.role !== "portador") {
      return NextResponse.json(
        { success: false, error: "O usuário selecionado precisa ter o perfil Portador." },
        { status: 400 }
      );
    }

    const deviceId = String(body.deviceId || "").trim() || null;
    if (deviceId && (deviceId.length < 3 || deviceId.length > 64)) {
      return NextResponse.json(
        { success: false, error: "device_id inválido." },
        { status: 400 }
      );
    }

    if (deviceId) {
      const duplicate = await pool.query(
        `
        SELECT id
        FROM portadores
        WHERE device_id = $1
          AND user_id <> $2
        LIMIT 1
        `,
        [deviceId, userId]
      );

      if (duplicate.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: "Este dispositivo já está vinculado a outro portador." },
          { status: 409 }
        );
      }
    }

    const idade = body.idade === undefined || body.idade === ""
      ? null
      : String(body.idade).trim();
    const condicao = body.condicao === undefined || body.condicao === ""
      ? null
      : String(body.condicao).trim();
    const local = String(body.local || "A definir").trim() || "A definir";
    const geofenceMax = Number(body.geofenceMax ?? 150);

    if (!Number.isFinite(geofenceMax) || geofenceMax < 30 || geofenceMax > 500) {
      return NextResponse.json(
        { success: false, error: "A cerca deve estar entre 30 e 500 metros." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `
      INSERT INTO portadores (
        user_id,
        device_id,
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
      VALUES ($1, $2, $3, $4, $5, 'Calmo', '😌', $6, 0, 50, 50, $7, 100)
      ON CONFLICT (user_id)
      DO UPDATE SET
        device_id = EXCLUDED.device_id,
        nome = EXCLUDED.nome,
        idade = EXCLUDED.idade,
        condicao = EXCLUDED.condicao,
        local = EXCLUDED.local,
        geofence_max = EXCLUDED.geofence_max
      RETURNING
        id,
        user_id AS "userId",
        device_id AS "deviceId",
        nome,
        idade,
        condicao,
        humor,
        humor_emoji AS "humorEmoji",
        local,
        distancia_metros AS "distanciaMetros",
        pin_x AS "pinX",
        pin_y AS "pinY",
        geofence_max AS "geofenceMax",
        bateria
      `,
      [userId, deviceId, user.name, idade, condicao, local, geofenceMax]
    );

    return NextResponse.json(
      {
        success: true,
        portador: {
          ...result.rows[0],
          rotinas: [],
          metas: [],
          mensagens: [],
        },
        message: "Perfil do portador salvo sem criar nenhum vínculo automático.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ERRO AO CRIAR/CONFIGURAR PORTADOR:", error);

    return NextResponse.json(
      { success: false, error: "Não foi possível salvar o perfil do portador." },
      { status: 500 }
    );
  }
}

/* ================================================================ */
/* PUT — ATUALIZAR PORTADOR                                         */
/* ================================================================ */
export async function PUT(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const portadorId = body.portadorId;

    if (!portadorId) {
      return NextResponse.json(
        { success: false, error: "O portador é obrigatório." },
        { status: 400 }
      );
    }

    if (!(await podeAcessarPortador(auth.session, portadorId))) {
      return NextResponse.json(
        { success: false, error: "Você não possui acesso a este portador." },
        { status: 403 }
      );
    }

    if (body.humor !== undefined || body.humorEmoji !== undefined) {
      const humor = String(body.humor || "").trim();
      const humorEmoji = String(body.humorEmoji || "").trim();

      if (!humor || !humorEmoji) {
        return NextResponse.json(
          { success: false, error: "Humor e emoji são obrigatórios." },
          { status: 400 }
        );
      }

      const result = await pool.query(
        `
        UPDATE portadores
        SET humor = $1, humor_emoji = $2
        WHERE id = $3
        RETURNING
          id,
          user_id AS "userId",
          device_id AS "deviceId",
          nome,
          idade,
          condicao,
          humor,
          humor_emoji AS "humorEmoji",
          local,
          distancia_metros AS "distanciaMetros",
          pin_x AS "pinX",
          pin_y AS "pinY",
          geofence_max AS "geofenceMax",
          bateria
        `,
        [humor, humorEmoji, portadorId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Portador não encontrado." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, portador: result.rows[0] });
    }

    if (body.deviceId !== undefined) {
      const deviceId = String(body.deviceId || "").trim();

      if (deviceId.length < 3 || deviceId.length > 64) {
        return NextResponse.json(
          { success: false, error: "device_id inválido." },
          { status: 400 }
        );
      }

      const duplicate = await pool.query(
        `SELECT id FROM portadores WHERE device_id = $1 AND id <> $2 LIMIT 1`,
        [deviceId, portadorId]
      );

      if (duplicate.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: "Este dispositivo já está vinculado a outro portador." },
          { status: 409 }
        );
      }

      const result = await pool.query(
        `
        UPDATE portadores
        SET device_id = $1
        WHERE id = $2
        RETURNING
          id,
          user_id AS "userId",
          device_id AS "deviceId",
          nome,
          idade,
          condicao,
          humor,
          humor_emoji AS "humorEmoji",
          local,
          distancia_metros AS "distanciaMetros",
          pin_x AS "pinX",
          pin_y AS "pinY",
          geofence_max AS "geofenceMax",
          bateria
        `,
        [deviceId, portadorId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Portador não encontrado." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, portador: result.rows[0] });
    }

    if (body.geofenceMax !== undefined) {
      const geofenceMax = Number(body.geofenceMax);

      if (!Number.isFinite(geofenceMax) || geofenceMax < 30 || geofenceMax > 500) {
        return NextResponse.json(
          { success: false, error: "A cerca deve estar entre 30 e 500 metros." },
          { status: 400 }
        );
      }

      const result = await pool.query(
        `
        UPDATE portadores
        SET geofence_max = $1
        WHERE id = $2
        RETURNING
          id,
          user_id AS "userId",
          device_id AS "deviceId",
          nome,
          idade,
          condicao,
          humor,
          humor_emoji AS "humorEmoji",
          local,
          distancia_metros AS "distanciaMetros",
          pin_x AS "pinX",
          pin_y AS "pinY",
          geofence_max AS "geofenceMax",
          bateria
        `,
        [geofenceMax, portadorId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Portador não encontrado." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, portador: result.rows[0] });
    }

    return NextResponse.json(
      { success: false, error: "Nenhum campo válido foi enviado para atualização." },
      { status: 400 }
    );
  } catch (error) {
    console.error("ERRO AO ATUALIZAR PORTADOR:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível atualizar o portador." },
      { status: 500 }
    );
  }
}
