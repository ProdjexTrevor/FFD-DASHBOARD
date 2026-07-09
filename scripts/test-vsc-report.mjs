import "dotenv/config";
import { buildVscReinsuranceReport } from "../server/lib/vscReinsuranceReport.js";
import { getPool } from "../src/lib/db.js";

const report = await buildVscReinsuranceReport(4, "2026-01-01", "2026-01-31", { name: "Lee's Summit Honda" });
console.log("summary:", report.summary);
console.log("sample row:", report.rows[0]);
console.log("row count:", report.rows.length);
await getPool().end();
