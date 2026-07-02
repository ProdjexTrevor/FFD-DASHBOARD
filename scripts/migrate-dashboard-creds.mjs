import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, query } from "../src/lib/db.js";
import { createDashboardUser } from "../server/lib/dashboardCreds.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(join(__dirname, "../migrations/001_dashboard_creds.sql"), "utf8");
  await query(sql);
  console.log("Created table dashboard_creds (Dashboard-Creds)");

  const username = process.env.DASHBOARD_BOOTSTRAP_USER;
  const password = process.env.DASHBOARD_BOOTSTRAP_PASSWORD;

  if (username && password) {
    const [existing] = await query("SELECT id FROM dashboard_creds WHERE username = ?", [username]);
    if (existing) {
      console.log(`Bootstrap user "${username}" already exists — skipped.`);
    } else {
      await createDashboardUser({
        username,
        password,
        displayName: process.env.DASHBOARD_BOOTSTRAP_DISPLAY_NAME ?? username,
      });
      console.log(`Created bootstrap user "${username}".`);
    }
  } else {
    console.log("No bootstrap user in env. Create one with: npm run db:create-user -- <username> <password>");
  }

  await getPool().end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
