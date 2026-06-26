import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const multi = await query(`
  SELECT vin, COUNT(*) AS cnt, GROUP_CONCAT(name SEPARATOR ' | ') AS names
  FROM service_contracts
  WHERE tenant_id = 4
  GROUP BY vin
  HAVING cnt > 1
  ORDER BY cnt DESC
  LIMIT 5
`);

const dealWithMany = multi[0]?.vin;
if (dealWithMany) {
  const contracts = await query(`SELECT name, start_date, created_at FROM service_contracts WHERE tenant_id = 4 AND vin = ?`, [dealWithMany]);
  console.log("VIN with multiple:", dealWithMany, contracts);
}

console.log("Multi count sample:", multi);
await getPool().end();
