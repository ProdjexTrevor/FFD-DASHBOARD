import "dotenv/config";
import { getPool, query } from "../src/lib/db.js";

try {
  const pool = getPool();
  const connection = await pool.getConnection();

  const [versionRows] = await connection.query("SELECT VERSION() AS version");
  const [dbRows] = await connection.query("SHOW DATABASES");

  console.log("Connection successful");
  console.log("Server version:", versionRows[0].version);
  console.log("Connected as:", process.env.DB_USER);
  console.log("Default database:", process.env.DB_NAME);
  console.log("Visible databases:", dbRows.map((r) => Object.values(r)[0]).join(", "));

  const tables = await query("SHOW TABLES");
  const tableNames = tables.map((r) => Object.values(r)[0]);
  console.log(`\n${process.env.DB_NAME} (${tableNames.length} tables):`);
  console.log(tableNames.join(", "));

  connection.release();
  await pool.end();
} catch (error) {
  console.error("Connection failed:", error.message);
  process.exit(1);
}
