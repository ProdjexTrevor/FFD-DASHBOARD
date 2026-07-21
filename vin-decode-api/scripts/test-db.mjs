import "dotenv/config";
import { getDbConfig, getPool, query } from "../src/db.js";

const config = getDbConfig();
console.log("Connecting to", `${config.host}:${config.port}/${config.database} as ${config.user}`);

const [row] = await query("SELECT VERSION() AS version, DATABASE() AS db");
console.log("Connected:", row);
await getPool().end();
