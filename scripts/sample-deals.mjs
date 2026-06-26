import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";

const sampleDeals = await query(`
  SELECT id, tenant_id, vin, deal_number, deal_date, customer_number, is_intrested, created_at,
         LEFT(response, 2000) AS response_preview
  FROM deals
  ORDER BY deal_date DESC
  LIMIT 5
`);

console.log("=== SAMPLE DEALS (preview) ===");
for (const d of sampleDeals) {
  console.log("\n--- Deal", d.id, "---");
  console.log({ tenant_id: d.tenant_id, vin: d.vin, deal_number: d.deal_number, deal_date: d.deal_date, customer_number: d.customer_number });
  try {
    const full = await query("SELECT response FROM deals WHERE id = ?", [d.id]);
    const parsed = JSON.parse(full[0].response);
    console.log("Top-level keys:", Object.keys(parsed));
    console.log(JSON.stringify(parsed, null, 2).slice(0, 4000));
  } catch (e) {
    console.log("Parse error:", e.message);
    console.log(d.response_preview);
  }
}

const stats = await query(`
  SELECT
    COUNT(*) AS total_deals,
    COUNT(DISTINCT tenant_id) AS tenants,
    COUNT(DISTINCT vin) AS unique_vins,
    COUNT(DISTINCT customer_number) AS unique_customers,
    MIN(deal_date) AS earliest,
    MAX(deal_date) AS latest
  FROM deals
`);

const byTenant = await query(`
  SELECT t.name, t.id, COUNT(d.id) AS deal_count
  FROM deals d
  JOIN tenants t ON t.id = d.tenant_id
  GROUP BY t.id, t.name
  ORDER BY deal_count DESC
`);

const monthly = await query(`
  SELECT DATE_FORMAT(deal_date, '%Y-%m') AS month, COUNT(*) AS cnt
  FROM deals
  WHERE deal_date IS NOT NULL
  GROUP BY DATE_FORMAT(deal_date, '%Y-%m')
  ORDER BY month DESC
  LIMIT 24
`);

const interested = await query(`
  SELECT is_intrested, COUNT(*) AS cnt FROM deals GROUP BY is_intrested
`);

console.log("\n=== STATS ===");
console.log(JSON.stringify({ stats: stats[0], byTenant, monthly: monthly.slice(0, 12), interested }, null, 2));

await getPool().end();
