import "dotenv/config";
import { getPool } from "../src/lib/db.js";
import { upsertDashboardUser } from "../server/lib/dashboardCreds.js";

const [, , username, password, displayName] = process.argv;

if (!username || !password) {
  console.error("Usage: npm run db:create-user -- <username> <password> [displayName]");
  process.exit(1);
}

const result = await upsertDashboardUser({
  username,
  password,
  displayName: displayName ?? username,
});

console.log(
  result.updated
    ? `Dashboard user "${username}" password updated.`
    : `Dashboard user "${username}" created.`
);
await getPool().end();
