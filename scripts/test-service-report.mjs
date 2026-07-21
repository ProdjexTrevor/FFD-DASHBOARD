import "dotenv/config";
import { createServer } from "node:http";

// Directly exercise the query helpers by importing the router isn't easy.
// Smoke-test the SQL via the same shapes used in the route.
import { query, getPool } from "../src/lib/db.js";

const tenantId = 7;
const [summary] = await query(
  `
  SELECT
    COUNT(DISTINCT a.id) AS appointment_count,
    COUNT(ad.id) AS detail_line_count,
    COUNT(DISTINCT NULLIF(ad.vin, '')) AS unique_vins,
    COALESCE(SUM(ad.actual_retail_amount), 0) AS total_retail
  FROM appointments a
  LEFT JOIN appointment_details ad ON ad.appointment_id = a.id
  WHERE a.tenant_id = ?
`,
  [tenantId]
);
console.log("summary", summary);

const appointments = await query(
  `
  SELECT a.id, a.appointment_number, COUNT(ad.id) AS line_count
  FROM appointments a
  LEFT JOIN appointment_details ad ON ad.appointment_id = a.id
  WHERE a.tenant_id = ?
  GROUP BY a.id
  ORDER BY a.appointment_date_time DESC
  LIMIT 2
`,
  [tenantId]
);
console.log("appointments", appointments);

const details = await query(
  `
  SELECT id, vin, service_line_number, service_type, actual_retail_amount
  FROM appointment_details
  WHERE appointment_id = ?
  LIMIT 5
`,
  [appointments[0].id]
);
console.log("details", details);

await getPool().end();
