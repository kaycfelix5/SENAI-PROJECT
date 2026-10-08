import crypto from "crypto";
import { NextResponse } from "next/server";
import pool from "@/app/lib/db";

function tokenValido(recebido) {
  const esperado = process.env.HEARTTECH_DEVICE_TOKEN;
  if (!esperado || !recebido) return false;

  const a = Buffer.from(String(recebido));
  const b = Buffer.from(String(esperado));

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request) {
  try {
    const deviceToken = request.headers.get("x-device-token");

    if (!tokenValido(deviceToken)) {
      return NextResponse.json(
        { success: false, error: "Dispositivo não autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const deviceId = String(body.device_id || "").trim();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const battery =
      body.battery === undefined || body.battery === null || body.battery === ""
        ? null
        : Number(body.battery);
    const precisao =
      body.accuracy === undefined || body.accuracy === null || body.accuracy === ""
        ? null
        : Number(body.accuracy);
    const timestamp = body.timestamp || null;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "device_id é obrigatório." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { success: false, error: "Coordenadas inválidas." },
        { status: 400 }
      );
    }

    if (
      battery !== null &&
      (!Number.isFinite(battery) || battery < 0 || battery > 100)
    ) {
      return NextResponse.json(
        { success: false, error: "Nível de bateria inválido." },
        { status: 400 }
      );
    }

    if (
      precisao !== null &&
      (!Number.isFinite(precisao) || precisao < 0 || precisao > 10000)
    ) {
      return NextResponse.json(
        { success: false, error: "Precisão GPS inválida." },
        { status: 400 }
      );
    }

    const portadorResult = await pool.query(
      `
      SELECT id, nome
      FROM portadores
      WHERE device_id = $1
      LIMIT 1
      `,
      [deviceId]
    );

    if (portadorResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "device_id não vinculado a um portador." },
        { status: 404 }
      );
    }

    const portador = portadorResult.rows[0];

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
        $1,
        $2,
        $3,
        $4,
        $5,
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
      [portador.id, latitude, longitude, battery, precisao, timestamp]
    );

    if (battery !== null) {
      await pool.query(
        `UPDATE portadores SET bateria = $1 WHERE id = $2`,
        [battery, portador.id]
      );
    }

    return NextResponse.json({
      success: true,
      deviceId,
      portador: {
        id: portador.id,
        nome: portador.nome,
      },
      localizacao: result.rows[0],
    });
  } catch (error) {
    console.error("ERRO AO RECEBER LOCALIZAÇÃO DA PULSEIRA:", error);

    return NextResponse.json(
      { success: false, error: "Não foi possível processar a localização do dispositivo." },
      { status: 500 }
    );
  }
}
