import pool from "@/app/lib/db";

/**
 * Verifica se o usuário autenticado pode acessar um portador.
 *
 * Regras de negócio do Heart-Tech:
 * - administrador: acesso total;
 * - portador: somente o próprio registro;
 * - acompanhante: somente portadores explicitamente vinculados.
 */
export async function podeAcessarPortador(user, portadorId) {
  if (!user?.id || !portadorId) return false;

  if (user.role === "administrador") return true;

  if (user.role === "portador") {
    const result = await pool.query(
      `
      SELECT 1
      FROM portadores
      WHERE id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [portadorId, user.id]
    );

    return result.rows.length > 0;
  }

  if (user.role === "acompanhante") {
    const result = await pool.query(
      `
      SELECT 1
      FROM acompanhante_portador ap
      INNER JOIN portadores p ON p.id = ap.portador_id
      WHERE ap.acompanhante_id = $1
        AND p.id = $2
      LIMIT 1
      `,
      [user.id, portadorId]
    );

    return result.rows.length > 0;
  }

  return false;
}

export async function listarPortadoresAcessiveis(user) {
  if (!user?.id) return [];

  if (user.role === "administrador") {
    const result = await pool.query(`
      SELECT p.id
      FROM portadores p
      ORDER BY p.id ASC
    `);

    return result.rows.map((row) => row.id);
  }

  if (user.role === "portador") {
    const result = await pool.query(
      `
      SELECT p.id
      FROM portadores p
      WHERE p.user_id = $1
      ORDER BY p.id ASC
      `,
      [user.id]
    );

    return result.rows.map((row) => row.id);
  }

  if (user.role === "acompanhante") {
    const result = await pool.query(
      `
      SELECT p.id
      FROM acompanhante_portador ap
      INNER JOIN portadores p ON p.id = ap.portador_id
      WHERE ap.acompanhante_id = $1
      ORDER BY p.id ASC
      `,
      [user.id]
    );

    return result.rows.map((row) => row.id);
  }

  return [];
}
