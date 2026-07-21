import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, query } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const sql = readFileSync(join(__dirname, "../migrations/001_Dash_VinDecodes.sql"), "utf8");
await query(sql);
console.log("Created/verified table Dash_VinDecodes");
await getPool().end();
