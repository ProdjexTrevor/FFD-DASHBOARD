import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const joinCount = await query(`
  SELECT COUNT(*) AS c
  FROM package_calculations pc
  INNER JOIN service_contracts sc ON sc.vehicle_id = pc.vehicle_id
  WHERE UPPER(sc.name) LIKE '%VSC%'
`);
console.log("package_calculations via sc.vehicle_id:", joinCount[0]);

const wp = await query(`
  SELECT mileage_limit, deductible, duration_months, AVG(base_price) AS avg_base
  FROM warranty_packages
  GROUP BY mileage_limit, deductible, duration_months
  ORDER BY mileage_limit DESC
  LIMIT 10
`);
console.log("warranty_packages pricing tiers:", wp);

const tenantFees = await query(`
  SELECT id, name, amt_dealer_profit, amt_fdd_fee, perc_merchant_ac_fee, perc_disc_cash_pay,
         perc_prepaid_fin_expense, affiliate_fee_1, affiliate_fee_2, affiliate_fee_3, fee_deductible_100
  FROM tenants WHERE id IN (4,5,6,7)
`);
console.log("tenant fees:", tenantFees);

await getPool().end();
