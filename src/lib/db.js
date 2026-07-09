import mysql from "mysql2/promise";

let pool;

function parseDatabaseUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ""),
    };
  } catch {
    return null;
  }
}

export function getDbConfig() {
  const fromUrl = parseDatabaseUrl(process.env.DATABASE_URL);
  if (fromUrl) {
    return {
      ...fromUrl,
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: process.env.VERCEL ? 5000 : 15000,
    };
  }

  return {
    host: process.env.DB_HOST ?? "host07.prodjex.com",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "firstdealer_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? "firstdealer_app",
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: process.env.VERCEL ? 5000 : 15000,
  };
}

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }

  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}
