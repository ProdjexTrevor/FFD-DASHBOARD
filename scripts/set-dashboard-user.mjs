import "dotenv/config";
import { getPool } from "../src/lib/db.js";
import { upsertDashboardUser } from "../server/lib/dashboardCreds.js";

const username = process.env.DASHBOARD_USER ?? "admin";
const password = process.env.DASHBOARD_PASSWORD;

if (!password) {
  console.error("Set DASHBOARD_USER and DASHBOARD_PASSWORD environment variables.");
  process.exit(1);
}

const result = await upsertDashboardUser({
  username,
  password,
  displayName: "Dashboard Admin",
});

console.log(
  result.updated
    ? `Dashboard user "${username}" password updated.`
    : `Dashboard user "${username}" created.`
);

await getPool().end();
