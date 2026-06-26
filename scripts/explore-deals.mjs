import "dotenv/config";
import { query, getPool } from "../src/lib/db.js";
import fs from "fs";
import path from "path";

const outDir = path.resolve("docs/db-exploration");
fs.mkdirSync(outDir, { recursive: true });

const dealTables = [
  "deals",
  "customers",
  "vehicles",
  "vehicle_notes",
  "deal_documents",
  "leads",
  "tenants",
  "users",
  "payments",
  "service_contracts",
  "warranty_purchases",
  "warranty_packages",
  "appointment_details",
  "appointments",
  "activity_logs",
  "contact_attempts",
];

async function describeTable(table) {
  try {
    const columns = await query(`DESCRIBE \`${table}\``);
    const countRows = await query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
    const sample = await query(`SELECT * FROM \`${table}\` ORDER BY 1 DESC LIMIT 3`);
    return { table, columns, count: countRows[0].cnt, sample, error: null };
  } catch (error) {
    return { table, error: error.message };
  }
}

const results = [];
for (const table of dealTables) {
  results.push(await describeTable(table));
}

const dealsColumns = await query("DESCRIBE deals");
const dealStats = await query(`
  SELECT
    COUNT(*) AS total_deals,
    COUNT(DISTINCT customer_id) AS unique_customers,
    COUNT(DISTINCT vehicle_id) AS unique_vehicles,
    COUNT(DISTINCT tenant_id) AS unique_tenants,
    MIN(created_at) AS earliest_deal,
    MAX(created_at) AS latest_deal
  FROM deals
`);

const dealStatusBreakdown = await query(`
  SELECT status, COUNT(*) AS cnt
  FROM deals
  GROUP BY status
  ORDER BY cnt DESC
  LIMIT 20
`).catch(() => []);

const dealStageBreakdown = await query(`
  SELECT stage, COUNT(*) AS cnt
  FROM deals
  GROUP BY stage
  ORDER BY cnt DESC
  LIMIT 20
`).catch(() => []);

const dealSampleJoin = await query(`
  SELECT
    d.id,
    d.status,
    d.stage,
    d.created_at,
    d.updated_at,
    d.tenant_id,
    c.first_name,
    c.last_name,
    c.email,
    v.year,
    v.make,
    v.model,
    v.vin,
    t.name AS tenant_name
  FROM deals d
  LEFT JOIN customers c ON c.id = d.customer_id
  LEFT JOIN vehicles v ON v.id = d.vehicle_id
  LEFT JOIN tenants t ON t.id = d.tenant_id
  ORDER BY d.created_at DESC
  LIMIT 10
`).catch((e) => ({ error: e.message }));

const monthlyDeals = await query(`
  SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    COUNT(*) AS deal_count
  FROM deals
  WHERE created_at IS NOT NULL
  GROUP BY DATE_FORMAT(created_at, '%Y-%m')
  ORDER BY month DESC
  LIMIT 24
`).catch(() => []);

const report = {
  generatedAt: new Date().toISOString(),
  dealStats: dealStats[0],
  dealStatusBreakdown,
  dealStageBreakdown,
  monthlyDeals,
  dealSampleJoin,
  tables: results,
};

fs.writeFileSync(path.join(outDir, "deal-exploration.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  dealStats: report.dealStats,
  dealStatusBreakdown: report.dealStatusBreakdown,
  dealStageBreakdown: report.dealStageBreakdown,
  monthlyDeals: report.monthlyDeals.slice(0, 6),
  tables: results.map((r) => ({
    table: r.table,
    count: r.count,
    error: r.error,
    columns: r.columns?.map((c) => `${c.Field} (${c.Type})`).join(", "),
  })),
}, null, 2));

await getPool().end();
