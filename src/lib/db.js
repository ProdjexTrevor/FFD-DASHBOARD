import mysql from "mysql2/promise";

let pool;

export function getDbConfig() {
  return {
    host: process.env.DB_HOST ?? "host07.prodjex.com",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "firstdealer_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? "firstdealer_app",
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 15000,
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
