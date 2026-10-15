import { NextResponse } from "next/server";
import pool from "@/app/lib/db";

export async function GET() {
  try {
    await pool.query("SELECT 1");

    return NextResponse.json({
      ok: true,
      service: "heart-tech",
      database: "online",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("HEART-TECH HEALTH ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        service: "heart-tech",
        database: "offline",
      },
      { status: 503 }
    );
  }
}
