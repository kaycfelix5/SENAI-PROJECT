import { NextResponse } from "next/server";
import { getDb, saveDb } from "@/app/lib/server-db";
import pool from "@/app/lib/db";
import { requireSession } from "@/app/lib/auth";

export async function GET(request) {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const isAdmin = auth.session.role === "administrador";
  let users = [];
  let logs = [];
  let portadores = [];
  let disponiveis = [];

  try {
    if (isAdmin) {
      const [pgUsers, pgLogs, pgPortadores, pgDisponiveis] = await Promise.all([
        pool.query(`
          SELECT
            id,
            name,
            email,
            phone,
            birth_date AS "birthDate",
            role,
            created_at AS "createdAt"
          FROM users
          ORDER BY id ASC
        `),
        pool.query(`
          SELECT
            id,
            time,
            type,
            user_name AS "user",
            action,
            level,
            criado_em AS "criadoEm"
          FROM logs
          ORDER BY id DESC
          LIMIT 50
        `),
        pool.query(`
          SELECT
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
            p.geofence_max AS "geofenceMax",
            p.bateria
          FROM portadores p
          ORDER BY p.nome ASC
        `),
        pool.query(`
          SELECT
            p.id,
            p.user_id AS "userId",
            p.device_id AS "deviceId",
            p.nome,
            p.idade,
            p.condicao,
            p.geofence_max AS "geofenceMax",
            p.bateria
          FROM portadores p
          LEFT JOIN acompanhante_portador ap
            ON ap.portador_id = p.id
          WHERE ap.portador_id IS NULL
          ORDER BY p.nome ASC
        `),
      ]);

      users = pgUsers.rows || [];
      logs = pgLogs.rows || [];
      portadores = pgPortadores.rows || [];
      disponiveis = pgDisponiveis.rows || [];
    }

    return NextResponse.json({
      users: isAdmin ? users : [],
      portadores: isAdmin ? portadores : [],
      disponiveis: isAdmin ? disponiveis : [],
      logs: isAdmin ? logs : [],
    });
  } catch (error) {
    console.error("Erro ao carregar dados administrativos:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível carregar os dados administrativos.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = requireSession(request, ["administrador"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    // Portadores e disponíveis não são mais persistidos pelo banco JSON.
    // O vínculo oficial está em PostgreSQL (/api/portadores e /api/vinculos).
    if (Array.isArray(body.portadores) || Array.isArray(body.disponiveis)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A persistência de portadores e vínculos agora é feita exclusivamente pelo PostgreSQL.",
        },
        { status: 410 }
      );
    }

    const db = getDb();

    if (body.newLog) {
      const logEntry = {
        id: Date.now(),
        time: new Date().toLocaleTimeString("pt-BR"),
        ...body.newLog,
      };

      db.logs.unshift(logEntry);
      if (db.logs.length > 50) db.logs = db.logs.slice(0, 50);

      try {
        await pool.query(
          `
          INSERT INTO logs (time, type, user_name, action, level)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            logEntry.time,
            logEntry.type || "INFO",
            logEntry.user || "Sistema",
            logEntry.action || "",
            logEntry.level || "info",
          ]
        );
      } catch (logErr) {
        console.warn("Não foi possível persistir log no PostgreSQL:", logErr.message);
      }
    }

    saveDb(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no /api/db:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao registrar operação administrativa." },
      { status: 500 }
    );
  }
}
