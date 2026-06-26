import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const statusBreakdown = await query(`
  SELECT
    JSON_UNQUOTE(JSON_EXTRACT(response, '$.Status')) AS status,
    COUNT(*) AS cnt
  FROM deals
  GROUP BY status
  ORDER BY cnt DESC
`);

const vehicleType = await query(`
  SELECT
    JSON_UNQUOTE(JSON_EXTRACT(response, '$.VehicleType')) AS vehicle_type,
    COUNT(*) AS cnt
  FROM deals
  GROUP BY vehicle_type
  ORDER BY cnt DESC
`);

const recordType = await query(`
  SELECT
    JSON_UNQUOTE(JSON_EXTRACT(response, '$.RecordType')) AS record_type,
    COUNT(*) AS cnt
  FROM deals
  GROUP BY record_type
  ORDER BY cnt DESC
`);

const topMakes = await query(`
  SELECT
    JSON_UNQUOTE(JSON_EXTRACT(response, '$.Make')) AS make,
    COUNT(*) AS cnt
  FROM deals
  GROUP BY make
  ORDER BY cnt DESC
  LIMIT 15
`);

const topSalespeople = await query(`
  SELECT
    JSON_UNQUOTE(JSON_EXTRACT(response, '$.PrimarySalesperson')) AS salesperson,
    COUNT(*) AS cnt
  FROM deals
  WHERE JSON_UNQUOTE(JSON_EXTRACT(response, '$.PrimarySalesperson')) NOT IN ('', '[]', 'null')
  GROUP BY salesperson
  ORDER BY cnt DESC
  LIMIT 15
`);

const tenants = await query(`SELECT id, name, domain FROM tenants ORDER BY id`);

console.log(JSON.stringify({
  statusBreakdown,
  vehicleType,
  recordType,
  topMakes,
  topSalespeople,
  tenants,
}, null, 2));

await getPool().end();
