import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const byName = await query(`
  SELECT name, COUNT(*) AS count
  FROM service_contracts
  WHERE tenant_id = 4 AND name IS NOT NULL AND name != ''
  GROUP BY name
  ORDER BY count DESC
  LIMIT 15
`);

const byProduct = await query(`
  SELECT product_code, COUNT(*) AS count
  FROM service_contracts
  WHERE tenant_id = 4 AND product_code IS NOT NULL AND product_code != ''
  GROUP BY product_code
  ORDER BY count DESC
  LIMIT 10
`);

console.log(JSON.stringify({ byName, byProduct }, null, 2));
await getPool().end();
