import express from "express";
import cors from "cors";
import "dotenv/config";
import { query } from "../src/lib/db.js";
import {
  RECORD_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
  buildDealFilters,
  buildServiceContractDateClause,
  dealHasVscContractSql,
  dealSelectFields,
  formatDealRow,
  requireTenantId,
  tenantFilterClause,
  VSC_CONTRACT_NAME_SQL,
} from "./lib/dealQueries.js";
import reportsRouter from "./routes/reports.js";
import { applyTenantDisplayName, filterDashboardTenants } from "../config/dashboard-tenants.js";
import { dashboardBasicAuth } from "./middleware/basicAuth.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/health") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", dashboardBasicAuth);

app.get("/api/auth/whoami", (req, res) => {
  res.json({
    username: req.dashboardUser.username,
    displayName: req.dashboardUser.display_name ?? req.dashboardUser.username,
  });
});

function sendError(res, error) {
  res.status(error.statusCode ?? 500).json({ error: error.message });
}

const tenantSelectFields = `
  t.id,
  t.name,
  t.domain,
  t.status,
  t.phone,
  t.address,
  t.support_email,
  t.primary_color,
  t.secondary_color,
  t.logo,
  t.dt_company_number,
  t.dt_entrprise_code
`;

app.get("/api/tenants", async (_req, res) => {
  try {
    const tenants = await query(`
      SELECT
        ${tenantSelectFields},
        (SELECT COUNT(*) FROM deals d WHERE d.tenant_id = t.id) AS deal_count,
        (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id) AS customer_count,
        (SELECT COUNT(*) FROM vehicles v WHERE v.tenant_id = t.id) AS vehicle_count,
        (SELECT MAX(d.deal_date) FROM deals d WHERE d.tenant_id = t.id) AS latest_deal_date
      FROM tenants t
      ORDER BY deal_count DESC, t.name ASC
    `);
    res.json(filterDashboardTenants(tenants));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/tenants/:id", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.params.id);
    const [tenant] = await query(
      `
      SELECT
        ${tenantSelectFields},
        (SELECT COUNT(*) FROM deals d WHERE d.tenant_id = t.id) AS deal_count,
        (SELECT COUNT(*) FROM customers c WHERE c.tenant_id = t.id) AS customer_count,
        (SELECT COUNT(*) FROM vehicles v WHERE v.tenant_id = t.id) AS vehicle_count,
        (SELECT MIN(d.deal_date) FROM deals d WHERE d.tenant_id = t.id) AS earliest_deal_date,
        (SELECT MAX(d.deal_date) FROM deals d WHERE d.tenant_id = t.id) AS latest_deal_date
      FROM tenants t
      WHERE t.id = ?
    `,
      [tenantId]
    );

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json(applyTenantDisplayName(tenant));
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/dashboard/summary", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const { clause, params } = buildDealFilters(tenantId, startDate, endDate);
    const scDate = buildServiceContractDateClause(startDate, endDate);

    const [summary] = await query(
      `
      SELECT
        COUNT(*) AS total_deals,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(response, '$.Status')) = 'A' THEN 1 ELSE 0 END) AS active_deals,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(response, '$.VehicleType')) = 'N' THEN 1 ELSE 0 END) AS new_vehicle_deals,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(response, '$.VehicleType')) = 'U' THEN 1 ELSE 0 END) AS used_vehicle_deals,
        COUNT(DISTINCT vin) AS unique_vehicles,
        COUNT(DISTINCT customer_number) AS unique_customers,
        MIN(deal_date) AS earliest_deal_date,
        MAX(deal_date) AS latest_deal_date
      FROM deals d
      WHERE ${clause}
    `,
      params
    );

    const [tenantCounts] = await query(
      `
      SELECT
        COUNT(DISTINCT d.customer_number) AS total_customers,
        COUNT(DISTINCT d.vin) AS total_vehicles,
        (
          SELECT COUNT(*)
          FROM service_contracts sc
          WHERE sc.tenant_id = ?
            AND sc.name IS NOT NULL
            AND sc.name != ''${scDate.clause}
        ) AS total_service_contracts,
        (
          SELECT COUNT(*)
          FROM service_contracts sc
          WHERE sc.tenant_id = ?
            AND sc.name IS NOT NULL
            AND sc.name != ''
            AND ${VSC_CONTRACT_NAME_SQL}${scDate.clause}
        ) AS vsc_contracts
      FROM deals d
      WHERE ${clause}
    `,
      [tenantId, ...scDate.params, tenantId, ...scDate.params, ...params]
    );

    const [vscDealStats] = await query(
      `
      SELECT COUNT(DISTINCT d.id) AS deals_with_vsc
      FROM deals d
      WHERE ${clause}
        AND ${dealHasVscContractSql}
    `,
      params
    );

    const vehicleTypeBreakdown = await query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(response, '$.VehicleType')) AS key_name,
        COUNT(*) AS count
      FROM deals d
      WHERE ${clause}
      GROUP BY key_name
      ORDER BY count DESC
    `,
      params
    );

    const recordTypeBreakdown = await query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(response, '$.RecordType')) AS key_name,
        COUNT(*) AS count
      FROM deals d
      WHERE ${clause}
      GROUP BY key_name
      ORDER BY count DESC
    `,
      params
    );

    const topMakes = await query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(response, '$.Make')) AS name,
        COUNT(*) AS count
      FROM deals d
      WHERE ${clause}
      GROUP BY name
      HAVING name IS NOT NULL AND name != '' AND name != '[]'
      ORDER BY count DESC
      LIMIT 10
    `,
      params
    );

    const topSalespeople = await query(
      `
      SELECT
        JSON_UNQUOTE(JSON_EXTRACT(response, '$.PrimarySalesperson')) AS name,
        COUNT(*) AS count
      FROM deals d
      WHERE ${clause}
        AND JSON_UNQUOTE(JSON_EXTRACT(response, '$.PrimarySalesperson')) NOT IN ('', '[]', 'null')
      GROUP BY name
      ORDER BY count DESC
      LIMIT 10
    `,
      params
    );

    const topModels = await query(
      `
      SELECT
        TRIM(CONCAT_WS(' ',
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(response, '$.ModelYear')), '[]'),
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(response, '$.Make')), '[]'),
          NULLIF(JSON_UNQUOTE(JSON_EXTRACT(response, '$.Model')), '[]')
        )) AS name,
        COUNT(*) AS count
      FROM deals d
      WHERE ${clause}
      GROUP BY name
      HAVING name IS NOT NULL AND name != ''
      ORDER BY count DESC
      LIMIT 10
    `,
      params
    );

    const [salesVelocity] = await query(
      `
      SELECT
        (SELECT COUNT(*)
         FROM deals
         WHERE tenant_id = ?
           AND deal_date IS NOT NULL
           AND DATE(deal_date) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)) AS yesterday,
        (SELECT COUNT(*)
         FROM deals
         WHERE tenant_id = ?
           AND deal_date IS NOT NULL
           AND DATE(deal_date) = DATE_SUB(DATE_SUB(CURDATE(), INTERVAL 1 DAY), INTERVAL 1 YEAR)) AS yesterday_yoy,
        (SELECT COUNT(*)
         FROM deals
         WHERE tenant_id = ?
           AND deal_date IS NOT NULL
           AND DATE(deal_date) BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND DATE_SUB(CURDATE(), INTERVAL 1 DAY)) AS last_week,
        (SELECT COUNT(*)
         FROM deals
         WHERE tenant_id = ?
           AND deal_date IS NOT NULL
           AND DATE(deal_date) BETWEEN DATE_SUB(DATE_SUB(CURDATE(), INTERVAL 7 DAY), INTERVAL 1 YEAR)
             AND DATE_SUB(DATE_SUB(CURDATE(), INTERVAL 1 DAY), INTERVAL 1 YEAR)) AS last_week_yoy,
        (SELECT COUNT(*)
         FROM deals
         WHERE tenant_id = ?
           AND deal_date IS NOT NULL
           AND deal_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
           AND deal_date < DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS last_month,
        (SELECT COUNT(*)
         FROM deals
         WHERE tenant_id = ?
           AND deal_date IS NOT NULL
           AND deal_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 13 MONTH), '%Y-%m-01')
           AND deal_date < DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 12 MONTH), '%Y-%m-01')) AS last_month_yoy
    `,
      [tenantId, tenantId, tenantId, tenantId, tenantId, tenantId]
    );

    const serviceContractTypes = await query(
      `
      SELECT name, COUNT(*) AS count
      FROM service_contracts sc
      WHERE sc.tenant_id = ? AND sc.name IS NOT NULL AND sc.name != ''${scDate.clause}
      GROUP BY name
      ORDER BY count DESC
    `,
      [tenantId, ...scDate.params]
    );

    function buildSalesMetric(current, prior, periodLabel) {
      const currentValue = Number(current ?? 0);
      const priorValue = Number(prior ?? 0);
      const change = currentValue - priorValue;
      const changePct =
        priorValue === 0 ? (currentValue > 0 ? 100 : 0) : Number(((change / priorValue) * 100).toFixed(1));

      return {
        count: currentValue,
        priorCount: priorValue,
        change,
        changePct,
        periodLabel,
      };
    }

    function buildTopBreakdown(rows, limit = 8) {
      const top = rows.slice(0, limit);
      const otherCount = rows.slice(limit).reduce((sum, row) => sum + Number(row.count), 0);
      const breakdown = top.map((row) => ({
        key_name: row.name,
        label: row.name,
        count: Number(row.count),
      }));

      if (otherCount > 0) {
        breakdown.push({ key_name: "Other", label: "Other", count: otherCount });
      }

      return breakdown;
    }

    res.json({
      tenantId,
      dateFilter: {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
      summary: {
        ...summary,
        ...tenantCounts,
        deals_with_vsc: Number(vscDealStats.deals_with_vsc ?? 0),
        vsc_attach_rate: summary.total_deals
          ? Number(
              (
                (Number(vscDealStats.deals_with_vsc ?? 0) / Number(summary.total_deals)) *
                100
              ).toFixed(1)
            )
          : 0,
      },
      salesVelocity: {
        cars: {
          yesterday: buildSalesMetric(salesVelocity.yesterday, salesVelocity.yesterday_yoy, "vs same day last year"),
          lastWeek: buildSalesMetric(salesVelocity.last_week, salesVelocity.last_week_yoy, "vs same week last year"),
          lastMonth: buildSalesMetric(salesVelocity.last_month, salesVelocity.last_month_yoy, "vs same month last year"),
        },
      },
      serviceContractBreakdown: buildTopBreakdown(serviceContractTypes),
      vehicleTypeBreakdown: vehicleTypeBreakdown.map((row) => ({
        ...row,
        label: VEHICLE_TYPE_LABELS[row.key_name] ?? row.key_name,
      })),
      recordTypeBreakdown: recordTypeBreakdown.map((row) => ({
        ...row,
        label: RECORD_TYPE_LABELS[row.key_name] ?? row.key_name,
      })),
      topMakes,
      topSalespeople,
      topModels,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/dashboard/monthly-trends", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const { clause, params } = buildDealFilters(tenantId, req.query.startDate, req.query.endDate);

    const monthly = await query(
      `
      SELECT
        DATE_FORMAT(deal_date, '%Y-%m') AS month,
        COUNT(*) AS total,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(response, '$.VehicleType')) = 'N' THEN 1 ELSE 0 END) AS new_vehicles,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(response, '$.VehicleType')) = 'U' THEN 1 ELSE 0 END) AS used_vehicles,
        SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(response, '$.Status')) = 'A' THEN 1 ELSE 0 END) AS active_deals
      FROM deals d
      WHERE ${clause} AND deal_date IS NOT NULL
      GROUP BY DATE_FORMAT(deal_date, '%Y-%m')
      ORDER BY month ASC
    `,
      params
    );

    res.json({
      tenantId,
      dateFilter: {
        startDate: req.query.startDate ?? null,
        endDate: req.query.endDate ?? null,
      },
      data: monthly,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/deals", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const status = req.query.status;
    const vehicleType = req.query.vehicleType;
    const recordType = req.query.recordType;
    const search = req.query.search?.trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const offset = (page - 1) * limit;

    const dealFilters = buildDealFilters(tenantId, req.query.startDate, req.query.endDate);
    const filters = [dealFilters.clause];
    const params = [...dealFilters.params];

    if (status) {
      filters.push("JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.Status')) = ?");
      params.push(status);
    }

    if (vehicleType) {
      filters.push("JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.VehicleType')) = ?");
      params.push(vehicleType);
    }

    if (recordType) {
      filters.push("JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.RecordType')) = ?");
      params.push(recordType);
    }

    if (search) {
      filters.push(`(
        d.deal_number LIKE ?
        OR d.vin LIKE ?
        OR d.customer_number LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.BuyerLastName')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.BuyerFirstName')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.Make')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.Model')) LIKE ?
      )`);
      const like = `%${search}%`;
      params.push(like, like, like, like, like, like, like);
    }

    const whereClause = filters.join(" AND ");

    const [countRow] = await query(
      `
      SELECT COUNT(*) AS total
      FROM deals d
      WHERE ${whereClause}
    `,
      params
    );

    const rows = await query(
      `
      SELECT
        ${dealSelectFields("d")},
        t.name AS tenant_name,
        t.domain AS tenant_domain
      FROM deals d
      INNER JOIN tenants t ON t.id = d.tenant_id
      WHERE ${whereClause}
      ORDER BY d.deal_date DESC, d.id DESC
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset]
    );

    res.json({
      tenantId,
      data: rows.map((row) => formatDealRow(row)),
      pagination: {
        page,
        limit,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / limit),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/deals/:id", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);

    const [deal] = await query(
      `
      SELECT
        ${dealSelectFields("d")},
        d.response,
        t.name AS tenant_name,
        t.domain AS tenant_domain
      FROM deals d
      INNER JOIN tenants t ON t.id = d.tenant_id
      WHERE d.id = ? AND d.tenant_id = ?
    `,
      [req.params.id, tenantId]
    );

    if (!deal) {
      return res.status(404).json({ error: "Deal not found for this tenant" });
    }

    let parsedResponse = null;
    try {
      parsedResponse = JSON.parse(deal.response);
    } catch {
      parsedResponse = deal.response;
    }

    res.json({
      ...formatDealRow(deal),
      response: parsedResponse,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.use("/api/reports", reportsRouter);

export default app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
    console.log("Report routes: /api/reports/fi-attach, /sales-team, /customers, /dealership-compare");
  });
}
