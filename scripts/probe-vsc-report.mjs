import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const rows = await query(`
  SELECT
    sc.response,
    sc.tax_part_cost,
    sc.name,
    sc.deductible,
    sc.miles,
    t.amt_fdd_fee,
    t.amt_dealer_profit,
    JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.CompanyNumber')) AS company_number
  FROM service_contracts sc
  INNER JOIN deals d
    ON sc.tenant_id = d.tenant_id AND sc.vin = d.vin
    AND (DATE(sc.start_date) = DATE(d.deal_date) OR DATE(sc.created_at) = DATE(d.deal_date))
  INNER JOIN tenants t ON t.id = d.tenant_id
  WHERE d.tenant_id = 4
    AND UPPER(sc.name) LIKE '%VSC%'
    AND sc.miles > 0
  LIMIT 3
`);

for (const row of rows) {
  let parsed = row.response;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = row.response;
    }
  }
  console.log(JSON.stringify({ ...row, response: parsed }, null, 2));
}

await getPool().end();
