import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const tenants = await query(`
  SELECT id, name, domain, status, logo, primary_color, secondary_color,
         dt_username, dt_company_number, dt_entrprise_code
  FROM tenants
  ORDER BY id
`);

for (const t of tenants) {
  const dealCount = await query("SELECT COUNT(*) AS cnt FROM deals WHERE tenant_id = ?", [t.id]);
  const customerCount = await query("SELECT COUNT(*) AS cnt FROM customers WHERE tenant_id = ?", [t.id]);
  const vehicleCount = await query("SELECT COUNT(*) AS cnt FROM vehicles WHERE tenant_id = ?", [t.id]);
  console.log(JSON.stringify({ ...t, dealCount: dealCount[0].cnt, customerCount: customerCount[0].cnt, vehicleCount: vehicleCount[0].cnt }, null, 2));
}

const tenantUsers = await query(`
  SELECT tu.tenant_id, t.name, u.email, u.first_name, u.last_name, u.role
  FROM tenant_users tu
  JOIN tenants t ON t.id = tu.tenant_id
  JOIN users u ON u.id = tu.user_id
`);

console.log("\nTenant users:", JSON.stringify(tenantUsers, null, 2));

await getPool().end();
