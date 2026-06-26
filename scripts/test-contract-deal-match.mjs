import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const rows = await query(`
  SELECT
    d.deal_number,
    d.vin,
    d.deal_date,
    (
      SELECT GROUP_CONCAT(DISTINCT sc.name ORDER BY sc.name SEPARATOR ', ')
      FROM service_contracts sc
      WHERE sc.tenant_id = d.tenant_id
        AND sc.vin = d.vin
        AND (
          DATE(sc.start_date) = DATE(d.deal_date)
          OR DATE(sc.created_at) = DATE(d.deal_date)
        )
    ) AS contracts_on_deal,
    (
      SELECT GROUP_CONCAT(DISTINCT sc.name ORDER BY sc.name SEPARATOR ', ')
      FROM service_contracts sc
      WHERE sc.tenant_id = d.tenant_id AND sc.vin = d.vin
    ) AS all_vin_contracts
  FROM deals d
  WHERE d.tenant_id = 4
  ORDER BY d.deal_date DESC
  LIMIT 15
`);

console.log(JSON.stringify(rows, null, 2));
await getPool().end();
