import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const sample = await query(`
  SELECT id, tenant_id, start_date, created_at, active, name, plan_code
  FROM service_contracts
  WHERE tenant_id = 4
  ORDER BY created_at DESC
  LIMIT 5
`);

const dateStats = await query(`
  SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN start_date IS NOT NULL THEN 1 ELSE 0 END) AS with_start_date,
    SUM(CASE WHEN DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS created_yesterday,
    SUM(CASE WHEN start_date IS NOT NULL AND DATE(start_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS start_yesterday
  FROM service_contracts
  WHERE tenant_id = 4
`);

console.log(JSON.stringify({ sample, dateStats }, null, 2));
await getPool().end();
