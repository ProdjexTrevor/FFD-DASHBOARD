import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const counts = await query(`
  SELECT a.tenant_id, t.name,
    COUNT(DISTINCT a.id) AS appointments,
    COUNT(ad.id) AS detail_lines,
    MIN(a.appointment_date_time) AS earliest,
    MAX(a.appointment_date_time) AS latest
  FROM appointments a
  LEFT JOIN appointment_details ad ON ad.appointment_id = a.id
  LEFT JOIN tenants t ON t.id = a.tenant_id
  GROUP BY a.tenant_id, t.name
  ORDER BY appointments DESC
`);
console.log("by tenant:", counts);

const sample = await query(`
  SELECT a.id, a.tenant_id, a.appointment_number, a.appointment_date_time, a.odometer_in,
         a.total_estimate, a.ro_status, a.customer_key, a.stock_number, a.service_writer_id,
         c.name AS customer_name,
         COUNT(ad.id) AS line_count,
         SUM(ad.actual_retail_amount) AS retail_total
  FROM appointments a
  LEFT JOIN appointment_details ad ON ad.appointment_id = a.id
  LEFT JOIN customers c ON c.tenant_id = a.tenant_id AND c.customer_number = a.customer_key
  WHERE a.tenant_id = 7
  GROUP BY a.id
  ORDER BY a.appointment_date_time DESC
  LIMIT 3
`);
console.log("sample appts:", JSON.stringify(sample, null, 2));

const details = await query(`
  SELECT ad.*
  FROM appointment_details ad
  INNER JOIN appointments a ON a.id = ad.appointment_id
  WHERE a.tenant_id = 7
  ORDER BY ad.id DESC
  LIMIT 3
`);
console.log("sample details:", JSON.stringify(details, null, 2));

await getPool().end();
