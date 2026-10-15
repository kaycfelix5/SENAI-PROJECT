import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

const DEFAULT_DB = {
  users: [
    {
      id: 1,
      name: "Administrador",
      email: "admin@hearttech.com.br",
      phone: "(11) 99999-0000",
      role: "administrador",
      password: "admin",
      birthDate: "1980-01-01"
    }
  ],
  portadores: [],
  disponiveis: [],
  logs: [
    {
      id: 1,
      time: "12:00:00",
      type: "INIT",
      user: "Sistema",
      action: "Banco de dados Heart Tech inicializado. Conta Administrador ativa.",
      level: "success"
    }
  ]
};

// Ensure data folder and db.json exist
function ensureDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
  }
}

export function getDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const data = JSON.parse(raw);
    
    // Ensure administrator exists
    if (!data.users || !Array.isArray(data.users)) {
      data.users = [...DEFAULT_DB.users];
    } else if (!data.users.some(u => u.role === "administrador")) {
      data.users.push(DEFAULT_DB.users[0]);
      saveDb(data);
    }
    if (!data.portadores) data.portadores = [];
    if (!data.disponiveis) data.disponiveis = [];
    if (!data.logs) data.logs = [];

    return data;
  } catch (err) {
    console.error("Erro ao ler banco de dados:", err);
    return DEFAULT_DB;
  }
}

export function saveDb(data) {
  ensureDb();
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Erro ao salvar banco de dados:", err);
    return false;
  }
}
