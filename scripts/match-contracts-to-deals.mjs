import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const sample = await query(`
  SELECT d.id, d.deal_number, d.vin, d.tenant_id, d.deal_date,
         v.id AS vehicle_id
  FROM deals d
  LEFT JOIN vehicles v ON v.tenant_id = d.tenant_id AND v.vin = d.vin
  WHERE d.tenant_id = 4
  ORDER BY d.deal_date DESC
  LIMIT 5
`);

for (const deal of sample) {
  const byVin = await query(
    `SELECT id, name, active, start_date FROM service_contracts WHERE tenant_id = ? AND vin = ? ORDER BY created_at DESC`,
    [deal.tenant_id, deal.vin]
  );
  const byVehicle = deal.vehicle_id
    ? await query(
        `SELECT id, name, active, start_date FROM service_contracts WHERE tenant_id = ? AND vehicle_id = ? ORDER BY created_at DESC`,
        [deal.tenant_id, deal.vehicle_id]
      )
    : [];

  console.log(JSON.stringify({ deal: { id: deal.id, deal_number: deal.deal_number, vin: deal.vin, deal_date: deal.deal_date }, byVin, byVehicleCount: byVehicle.length }, null, 2));
}

await getPool().end();
