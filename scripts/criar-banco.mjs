import pg from "pg";
import bcrypt from "bcryptjs";

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const adminEmail =
  process.env.HEARTTECH_ADMIN_EMAIL || "admin@hearttech.com.br";
const adminPassword =
  process.env.HEARTTECH_ADMIN_PASSWORD || "Admin@HeartTech2026!";

async function criarBanco() {
  try {
    await client.connect();
    console.log("✓ Conectado ao PostgreSQL.");

    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(150) UNIQUE,
        phone VARCHAR(30),
        birth_date DATE,
        role VARCHAR(30) NOT NULL DEFAULT 'acompanhante',
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS portadores (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL UNIQUE,
        device_id VARCHAR(64) UNIQUE,
        nome VARCHAR(120) NOT NULL,
        idade VARCHAR(30),
        condicao VARCHAR(120),
        humor VARCHAR(120),
        humor_emoji VARCHAR(20),
        local VARCHAR(255),
        distancia_metros INTEGER DEFAULT 0,
        pin_x NUMERIC(8, 2) DEFAULT 50,
        pin_y NUMERIC(8, 2) DEFAULT 50,
        geofence_max INTEGER DEFAULT 150,
        bateria INTEGER DEFAULT 100,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_portador_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rotinas (
        id BIGSERIAL PRIMARY KEY,
        portador_id BIGINT NOT NULL,
        hora VARCHAR(10) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        concluida BOOLEAN DEFAULT FALSE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_rotina_portador FOREIGN KEY (portador_id)
          REFERENCES portadores(id) ON DELETE CASCADE,
        CONSTRAINT uq_rotina UNIQUE (portador_id, hora, titulo)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS metas (
        id BIGSERIAL PRIMARY KEY,
        portador_id BIGINT NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        progresso INTEGER DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_meta_portador FOREIGN KEY (portador_id)
          REFERENCES portadores(id) ON DELETE CASCADE,
        CONSTRAINT uq_meta UNIQUE (portador_id, titulo)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mensagens (
        id BIGSERIAL PRIMARY KEY,
        portador_id BIGINT NOT NULL,
        texto TEXT NOT NULL,
        hora VARCHAR(10),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_mensagem_portador FOREIGN KEY (portador_id)
          REFERENCES portadores(id) ON DELETE CASCADE,
        CONSTRAINT uq_mensagem UNIQUE (portador_id, texto, hora)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS localizacoes (
        id BIGSERIAL PRIMARY KEY,
        portador_id BIGINT NOT NULL,
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        bateria INTEGER,
        precisao_metros NUMERIC(8, 2),
        registrada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_localizacao_portador FOREIGN KEY (portador_id)
          REFERENCES portadores(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS emergencias (
        id BIGSERIAL PRIMARY KEY,
        portador_id BIGINT NOT NULL,
        acionada_por BIGINT,
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        status VARCHAR(30) DEFAULT 'aberta',
        criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_emergencia_portador FOREIGN KEY (portador_id)
          REFERENCES portadores(id) ON DELETE CASCADE,
        CONSTRAINT fk_emergencia_usuario FOREIGN KEY (acionada_por)
          REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id BIGSERIAL PRIMARY KEY,
        time VARCHAR(20),
        type VARCHAR(50),
        user_name VARCHAR(120),
        user_id BIGINT,
        action TEXT,
        level VARCHAR(30),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_log_usuario FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS disponiveis (
        id BIGSERIAL PRIMARY KEY,
        nome VARCHAR(120) NOT NULL,
        idade VARCHAR(30),
        condicao VARCHAR(120),
        local VARCHAR(255),
        geofence_max INTEGER DEFAULT 150,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS acompanhante_portador (
        acompanhante_id BIGINT NOT NULL,
        portador_id BIGINT NOT NULL UNIQUE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_acompanhante_portador
          PRIMARY KEY (acompanhante_id, portador_id),
        CONSTRAINT fk_vinculo_acompanhante
          FOREIGN KEY (acompanhante_id)
          REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_vinculo_portador
          FOREIGN KEY (portador_id)
          REFERENCES portadores(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vinculo_acompanhante
      ON acompanhante_portador(acompanhante_id);
    `);

    await client.query(`ALTER TABLE portadores ADD COLUMN IF NOT EXISTS device_id VARCHAR(64);`);
    await client.query(`ALTER TABLE portadores ADD COLUMN IF NOT EXISTS pin_x NUMERIC(8, 2) DEFAULT 50;`);
    await client.query(`ALTER TABLE portadores ADD COLUMN IF NOT EXISTS pin_y NUMERIC(8, 2) DEFAULT 50;`);
    await client.query(`ALTER TABLE localizacoes ADD COLUMN IF NOT EXISTS precisao_metros NUMERIC(8, 2);`);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_portadores_device_id
      ON portadores(device_id)
      WHERE device_id IS NOT NULL;
    `);

    const existingAdmin = await client.query(
      `SELECT id FROM users WHERE role = 'administrador' ORDER BY id ASC LIMIT 1`
    );

    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await client.query(
        `
        INSERT INTO users (name, email, phone, birth_date, role, password)
        VALUES ('Administrador', $1, NULL, NULL, 'administrador', $2)
        `,
        [adminEmail, passwordHash]
      );
      console.log(`✓ Administrador inicial criado: ${adminEmail}`);
      if (!process.env.HEARTTECH_ADMIN_PASSWORD) {
        console.warn("⚠ Use HEARTTECH_ADMIN_PASSWORD para definir uma senha própria antes da entrega.");
      }
    } else {
      console.log("✓ Administrador já existe; senha não foi alterada.");
    }

    await client.query("COMMIT");

    console.log("======================================");
    console.log(" BANCO HEART-TECH PRONTO");
    console.log("======================================");
    console.log("Tabelas verificadas: users, portadores, rotinas, metas, mensagens, localizacoes, emergencias, logs, disponiveis, acompanhante_portador");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("❌ Erro ao preparar o banco:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

criarBanco();
