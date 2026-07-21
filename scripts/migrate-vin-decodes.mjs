import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, query } from "../src/lib/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(join(__dirname, "../migrations/002_Dash_VinDecodes.sql"), "utf8");
  await query(sql);
  console.log("Created table Dash_VinDecodes");
  await getPool().end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
