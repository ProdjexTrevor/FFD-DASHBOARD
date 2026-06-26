import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const tables = await query("SHOW TABLES");
const tableNames = tables.map((r) => Object.values(r)[0]);

for (const table of tableNames) {
  const cols = await query(`DESCRIBE \`${table}\``);
  const count = await query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
  console.log(`\n=== ${table} (${count[0].cnt} rows) ===`);
  console.log(cols.map((c) => c.Field).join(", "));
}

await getPool().end();
