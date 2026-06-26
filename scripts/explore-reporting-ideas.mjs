import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const tenantId = 4;

const dealsWithContracts = await query(`
  SELECT
    COUNT(DISTINCT d.id) AS total_deals,
    COUNT(DISTINCT CASE WHEN sc.id IS NOT NULL THEN d.id END) AS deals_with_any_contract,
    COUNT(DISTINCT CASE WHEN sc.id IS NOT NULL AND DATE(sc.start_date) = DATE(d.deal_date) THEN d.id END) AS deals_with_contract_same_day
  FROM deals d
  LEFT JOIN service_contracts sc ON sc.tenant_id = d.tenant_id AND sc.vin = d.vin
  WHERE d.tenant_id = ?
`, [tenantId]);

const warrantyOnVehicles = await query(`
  SELECT warranty_status, COUNT(*) AS cnt FROM vehicles WHERE tenant_id = ? GROUP BY warranty_status ORDER BY cnt DESC
`, [tenantId]);

const appointmentsByMonth = await query(`
  SELECT DATE_FORMAT(appointment_date_time, '%Y-%m') AS month, COUNT(*) AS cnt
  FROM appointments WHERE tenant_id = ? AND appointment_date_time IS NOT NULL
  GROUP BY month ORDER BY month DESC LIMIT 12
`, [tenantId]);

const repeatCustomers = await query(`
  SELECT deal_count_bucket, COUNT(*) AS customers FROM (
    SELECT customer_number, COUNT(*) AS deal_cnt,
      CASE
        WHEN COUNT(*) = 1 THEN '1 deal'
        WHEN COUNT(*) BETWEEN 2 AND 3 THEN '2-3 deals'
        ELSE '4+ deals'
      END AS deal_count_bucket
    FROM deals WHERE tenant_id = ? AND customer_number IS NOT NULL
    GROUP BY customer_number
  ) t GROUP BY deal_count_bucket
`, [tenantId]);

const newVsUsedMonthly = await query(`
  SELECT DATE_FORMAT(deal_date, '%Y-%m') AS month,
    SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(response, '$.VehicleType')) = 'N' THEN 1 ELSE 0 END) AS new_cars,
    SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(response, '$.VehicleType')) = 'U' THEN 1 ELSE 0 END) AS used_cars
  FROM deals WHERE tenant_id = ? AND deal_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
  GROUP BY month ORDER BY month
`, [tenantId]);

const pgPayments = await query(`SELECT status, COUNT(*) AS cnt, SUM(amount) AS total FROM pg_payments GROUP BY status`);
const hyfin = await query(`SELECT type, COUNT(*) AS cnt FROM hyfin_payments GROUP BY type`);

const vehicleAge = await query(`
  SELECT
    CASE
      WHEN year >= YEAR(CURDATE()) THEN 'Current year'
      WHEN year >= YEAR(CURDATE()) - 3 THEN '1-3 years old'
      WHEN year >= YEAR(CURDATE()) - 7 THEN '4-7 years old'
      ELSE '8+ years old'
    END AS age_bucket,
    COUNT(*) AS cnt
  FROM vehicles WHERE tenant_id = ? AND year IS NOT NULL AND year > 1980
  GROUP BY age_bucket
`, [tenantId]);

const interestedFlag = await query(`
  SELECT is_intrested, COUNT(*) AS cnt FROM deals WHERE tenant_id = ? GROUP BY is_intrested
`, [tenantId]);

console.log(JSON.stringify({
  dealsWithContracts: dealsWithContracts[0],
  warrantyOnVehicles,
  appointmentsByMonth,
  repeatCustomers,
  newVsUsedMonthly: newVsUsedMonthly.slice(-6),
  pgPayments,
  hyfin,
  vehicleAge,
  interestedFlag,
}, null, 2));

await getPool().end();
