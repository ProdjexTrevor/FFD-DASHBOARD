import { Router } from "express";
import { query } from "../../src/lib/db.js";
import { DASHBOARD_TENANT_IDS, filterDashboardTenants } from "../../config/dashboard-tenants.js";
import {
  VEHICLE_TYPE_LABELS,
  buildDealFilters,
  dateFilterClause,
  requireTenantId,
} from "../lib/dealQueries.js";
import { buildVscReinsuranceReport } from "../lib/vscReinsuranceReport.js";

const router = Router();

function sendError(res, error) {
  res.status(error.statusCode ?? 500).json({ error: error.message });
}

const dealHasContractSql = `
  EXISTS (
    SELECT 1 FROM service_contracts sc
    WHERE sc.tenant_id = d.tenant_id
      AND sc.vin = d.vin
      AND (
        DATE(sc.start_date) = DATE(d.deal_date)
        OR DATE(sc.created_at) = DATE(d.deal_date)
      )
  )
`;

router.get("/fi-attach", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const { clause, params } = buildDealFilters(tenantId, req.query.startDate, req.query.endDate);

    const [summary] = await query(
      `
      SELECT
        COUNT(*) AS total_deals,
        SUM(CASE WHEN ${dealHasContractSql} THEN 1 ELSE 0 END) AS deals_with_contracts
      FROM deals d
      WHERE ${clause}
    `,
      params
    );

    const monthly = await query(
      `
      SELECT
        DATE_FORMAT(d.deal_date, '%Y-%m') AS month,
        COUNT(*) AS total_deals,
        SUM(CASE WHEN ${dealHasContractSql} THEN 1 ELSE 0 END) AS deals_with_contracts
      FROM deals d
      WHERE ${clause} AND d.deal_date IS NOT NULL
      GROUP BY DATE_FORMAT(d.deal_date, '%Y-%m')
      ORDER BY month ASC
    `,
      params
    );

    const byVehicleType = await query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.VehicleType')) AS key_name,
        COUNT(*) AS total_deals,
        SUM(CASE WHEN ${dealHasContractSql} THEN 1 ELSE 0 END) AS deals_with_contracts
      FROM deals d
      WHERE ${clause}
      GROUP BY key_name
      ORDER BY total_deals DESC
    `,
      params
    );

    const bySalesperson = await query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.PrimarySalesperson')) AS name,
        COUNT(*) AS total_deals,
        SUM(CASE WHEN ${dealHasContractSql} THEN 1 ELSE 0 END) AS deals_with_contracts
      FROM deals d
      WHERE ${clause}
        AND JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.PrimarySalesperson')) NOT IN ('', '[]', 'null')
      GROUP BY name
      HAVING total_deals >= 5
      ORDER BY total_deals DESC
      LIMIT 15
    `,
      params
    );

    const productMix = await query(
      `
      SELECT sc.name, COUNT(*) AS count
      FROM deals d
      INNER JOIN service_contracts sc ON sc.tenant_id = d.tenant_id AND sc.vin = d.vin
        AND (DATE(sc.start_date) = DATE(d.deal_date) OR DATE(sc.created_at) = DATE(d.deal_date))
      WHERE ${clause} AND sc.name IS NOT NULL AND sc.name != ''
      GROUP BY sc.name
      ORDER BY count DESC
      LIMIT 12
    `,
      params
    );

    const totalDeals = Number(summary.total_deals);
    const withContracts = Number(summary.deals_with_contracts);

    res.json({
      summary: {
        total_deals: totalDeals,
        deals_with_contracts: withContracts,
        attach_rate: totalDeals ? Number(((withContracts / totalDeals) * 100).toFixed(1)) : 0,
      },
      monthly: monthly.map((row) => ({
        month: row.month,
        total_deals: Number(row.total_deals),
        deals_with_contracts: Number(row.deals_with_contracts),
        attach_rate: row.total_deals
          ? Number(((Number(row.deals_with_contracts) / Number(row.total_deals)) * 100).toFixed(1))
          : 0,
      })),
      byVehicleType: byVehicleType.map((row) => ({
        label: VEHICLE_TYPE_LABELS[row.key_name] ?? row.key_name,
        total_deals: Number(row.total_deals),
        deals_with_contracts: Number(row.deals_with_contracts),
        attach_rate: row.total_deals
          ? Number(((Number(row.deals_with_contracts) / Number(row.total_deals)) * 100).toFixed(1))
          : 0,
      })),
      bySalesperson: bySalesperson.map((row) => ({
        name: row.name,
        total_deals: Number(row.total_deals),
        deals_with_contracts: Number(row.deals_with_contracts),
        attach_rate: row.total_deals
          ? Number(((Number(row.deals_with_contracts) / Number(row.total_deals)) * 100).toFixed(1))
          : 0,
      })),
      productMix: productMix.map((row) => ({
        name: row.name,
        count: Number(row.count),
      })),
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/sales-team", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const { clause, params } = buildDealFilters(tenantId, req.query.startDate, req.query.endDate);

    const leaderboard = await query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.PrimarySalesperson')) AS name,
        COUNT(*) AS total_deals,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.VehicleType')) = 'N' THEN 1 ELSE 0 END) AS new_deals,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.VehicleType')) = 'U' THEN 1 ELSE 0 END) AS used_deals,
        SUM(CASE WHEN ${dealHasContractSql} THEN 1 ELSE 0 END) AS deals_with_contracts
      FROM deals d
      WHERE ${clause}
        AND JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.PrimarySalesperson')) NOT IN ('', '[]', 'null')
      GROUP BY name
      ORDER BY total_deals DESC
      LIMIT 25
    `,
      params
    );

    const monthlyTop = await query(
      `
      SELECT
        DATE_FORMAT(d.deal_date, '%Y-%m') AS month,
        JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.PrimarySalesperson')) AS name,
        COUNT(*) AS count
      FROM deals d
      WHERE ${clause}
        AND d.deal_date IS NOT NULL
        AND JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.PrimarySalesperson')) NOT IN ('', '[]', 'null')
      GROUP BY month, name
      ORDER BY month ASC, count DESC
    `,
      params
    );

    const topNames = leaderboard.slice(0, 5).map((r) => r.name);
    const monthlyTrends = monthlyTop
      .filter((row) => topNames.includes(row.name))
      .reduce((acc, row) => {
        if (!acc[row.month]) acc[row.month] = { month: row.month };
        acc[row.month][row.name] = Number(row.count);
        return acc;
      }, {});

    res.json({
      leaderboard: leaderboard.map((row) => ({
        name: row.name,
        total_deals: Number(row.total_deals),
        new_deals: Number(row.new_deals),
        used_deals: Number(row.used_deals),
        deals_with_contracts: Number(row.deals_with_contracts),
        attach_rate: row.total_deals
          ? Number(((Number(row.deals_with_contracts) / Number(row.total_deals)) * 100).toFixed(1))
          : 0,
      })),
      monthlyTrends: Object.values(monthlyTrends),
      topNames,
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/customers", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const { clause, params } = buildDealFilters(tenantId, req.query.startDate, req.query.endDate);

    const repeatBuckets = await query(
      `
      SELECT deal_count_bucket, COUNT(*) AS customers FROM (
        SELECT
          d.customer_number,
          COUNT(*) AS deal_cnt,
          CASE
            WHEN COUNT(*) = 1 THEN '1 deal'
            WHEN COUNT(*) BETWEEN 2 AND 3 THEN '2-3 deals'
            ELSE '4+ deals'
          END AS deal_count_bucket
        FROM deals d
        WHERE d.tenant_id = ? AND d.customer_number IS NOT NULL AND d.customer_number != ''
        GROUP BY d.customer_number
      ) t
      GROUP BY deal_count_bucket
    `,
      [tenantId]
    );

    const periodCustomers = await query(
      `
      SELECT COUNT(DISTINCT d.customer_number) AS unique_in_period
      FROM deals d
      WHERE ${clause}
    `,
      params
    );

    const topCities = await query(
      `
      SELECT c.city, c.state, COUNT(DISTINCT d.id) AS deal_count
      FROM deals d
      INNER JOIN customers c ON c.tenant_id = d.tenant_id AND c.customer_number = d.customer_number
      WHERE ${clause} AND c.city IS NOT NULL AND c.city != ''
      GROUP BY c.city, c.state
      ORDER BY deal_count DESC
      LIMIT 12
    `,
      params
    );

    res.json({
      repeatBuckets,
      periodSummary: {
        unique_in_period: Number(periodCustomers[0]?.unique_in_period ?? 0),
      },
      topCities: topCities.map((row) => ({
        name: `${row.city}, ${row.state}`,
        count: Number(row.deal_count),
      })),
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/dealership-compare", async (req, res) => {
  try {
    const tenants = filterDashboardTenants(
      await query(`
      SELECT id, name, domain, primary_color, status
      FROM tenants
      ORDER BY name ASC
    `)
    );

    const date = dateFilterClause(req.query.startDate, req.query.endDate, "deal_date", "d");
    const tenantPlaceholders = DASHBOARD_TENANT_IDS.map(() => "?").join(", ");

    const queryParams = [...DASHBOARD_TENANT_IDS, ...date.params];

    const [dealStatsRows, contractStatsRows] = await Promise.all([
      query(
        `
        SELECT
          d.tenant_id,
          COUNT(*) AS total_deals,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.VehicleType')) = 'N' THEN 1 ELSE 0 END) AS new_deals,
          SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.VehicleType')) = 'U' THEN 1 ELSE 0 END) AS used_deals,
          COUNT(DISTINCT d.customer_number) AS unique_customers
        FROM deals d
        WHERE d.tenant_id IN (${tenantPlaceholders})${date.clause}
        GROUP BY d.tenant_id
      `,
        queryParams
      ),
      query(
        `
        SELECT
          d.tenant_id,
          COUNT(DISTINCT d.id) AS deals_with_contracts
        FROM deals d
        INNER JOIN service_contracts sc ON sc.tenant_id = d.tenant_id
          AND sc.vin = d.vin
          AND (
            DATE(sc.start_date) = DATE(d.deal_date)
            OR DATE(sc.created_at) = DATE(d.deal_date)
          )
        WHERE d.tenant_id IN (${tenantPlaceholders})${date.clause}
        GROUP BY d.tenant_id
      `,
        queryParams
      ),
    ]);

    const statsByTenantId = new Map(
      dealStatsRows.map((row) => [
        row.tenant_id,
        {
          ...row,
          deals_with_contracts: 0,
        },
      ])
    );

    for (const row of contractStatsRows) {
      const stats = statsByTenantId.get(row.tenant_id);
      if (stats) {
        stats.deals_with_contracts = row.deals_with_contracts;
      }
    }

    const rows = tenants.map((tenant) => {
      const stats = statsByTenantId.get(tenant.id) ?? {
        total_deals: 0,
        new_deals: 0,
        used_deals: 0,
        deals_with_contracts: 0,
        unique_customers: 0,
      };
      const totalDeals = Number(stats.total_deals);

      return {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        primary_color: tenant.primary_color,
        total_deals: totalDeals,
        new_deals: Number(stats.new_deals),
        used_deals: Number(stats.used_deals),
        deals_with_contracts: Number(stats.deals_with_contracts),
        unique_customers: Number(stats.unique_customers),
        attach_rate: totalDeals
          ? Number(((Number(stats.deals_with_contracts) / totalDeals) * 100).toFixed(1))
          : 0,
      };
    });

    rows.sort((a, b) => b.total_deals - a.total_deals);
    res.json(rows);
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/vsc-sales-reinsurance", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const [tenant] = await query(
      `
      SELECT id, name, dt_company_number
      FROM tenants
      WHERE id = ?
      LIMIT 1
    `,
      [tenantId]
    );

    const report = await buildVscReinsuranceReport(
      tenantId,
      req.query.startDate,
      req.query.endDate,
      tenant ?? {}
    );

    res.json(report);
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
