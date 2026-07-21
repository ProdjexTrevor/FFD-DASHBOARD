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

router.get("/service", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const date = dateFilterClause(req.query.startDate, req.query.endDate, "appointment_date_time", "a");
    const whereClause = `a.tenant_id = ?${date.clause}`;
    const params = [tenantId, ...date.params];

    const [summary] = await query(
      `
      SELECT
        COUNT(DISTINCT a.id) AS appointment_count,
        COUNT(ad.id) AS detail_line_count,
        COUNT(DISTINCT NULLIF(ad.vin, '')) AS unique_vins,
        COALESCE(SUM(a.total_estimate), 0) AS total_estimate,
        COALESCE(SUM(ad.actual_retail_amount), 0) AS total_retail,
        COALESCE(SUM(ad.labor_hours), 0) AS total_labor_hours,
        COALESCE(AVG(NULLIF(a.odometer_in, 0)), 0) AS avg_odometer_in
      FROM appointments a
      LEFT JOIN appointment_details ad ON ad.appointment_id = a.id
      WHERE ${whereClause}
    `,
      params
    );

    const byStatus = await query(
      `
      SELECT
        COALESCE(NULLIF(a.ro_status, ''), 'Unknown') AS status,
        COUNT(*) AS count
      FROM appointments a
      WHERE ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `,
      params
    );

    const byServiceType = await query(
      `
      SELECT
        COALESCE(NULLIF(ad.service_type, ''), 'Unknown') AS service_type,
        COUNT(*) AS count,
        COALESCE(SUM(ad.actual_retail_amount), 0) AS retail_total
      FROM appointments a
      INNER JOIN appointment_details ad ON ad.appointment_id = a.id
      WHERE ${whereClause}
      GROUP BY service_type
      ORDER BY count DESC
      LIMIT 12
    `,
      params
    );

    const appointments = await query(
      `
      SELECT
        a.id,
        a.appointment_number,
        a.appointment_id AS dealertrack_appointment_id,
        a.appointment_date_time,
        a.open_transaction_date,
        a.service_writer_id,
        a.franchise_code,
        a.total_estimate,
        a.ro_status,
        a.customer_key,
        a.stock_number,
        a.odometer_in,
        c.name AS customer_name,
        c.phone AS customer_phone,
        COUNT(ad.id) AS line_count,
        COUNT(DISTINCT NULLIF(ad.vin, '')) AS vin_count,
        MAX(ad.vin) AS sample_vin,
        COALESCE(SUM(ad.actual_retail_amount), 0) AS retail_total,
        COALESCE(SUM(ad.labor_hours), 0) AS labor_hours
      FROM appointments a
      LEFT JOIN appointment_details ad ON ad.appointment_id = a.id
      LEFT JOIN customers c
        ON c.tenant_id = a.tenant_id
       AND c.customer_number = a.customer_key
      WHERE ${whereClause}
      GROUP BY a.id
      ORDER BY a.appointment_date_time DESC, a.id DESC
      LIMIT 200
    `,
      params
    );

    res.json({
      tenantId,
      summary: {
        appointment_count: Number(summary.appointment_count ?? 0),
        detail_line_count: Number(summary.detail_line_count ?? 0),
        unique_vins: Number(summary.unique_vins ?? 0),
        total_estimate: Number(summary.total_estimate ?? 0),
        total_retail: Number(summary.total_retail ?? 0),
        total_labor_hours: Number(summary.total_labor_hours ?? 0),
        avg_odometer_in: Number(Number(summary.avg_odometer_in ?? 0).toFixed(0)),
      },
      byStatus: byStatus.map((row) => ({
        name: row.status,
        count: Number(row.count),
      })),
      byServiceType: byServiceType.map((row) => ({
        name: row.service_type,
        count: Number(row.count),
        retail_total: Number(row.retail_total),
      })),
      appointments: appointments.map((row) => ({
        id: row.id,
        appointment_number: row.appointment_number,
        dealertrack_appointment_id: row.dealertrack_appointment_id,
        appointment_date_time: row.appointment_date_time,
        open_transaction_date: row.open_transaction_date,
        service_writer_id: row.service_writer_id,
        franchise_code: row.franchise_code,
        total_estimate: Number(row.total_estimate ?? 0),
        ro_status: row.ro_status,
        customer_key: row.customer_key,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        stock_number: row.stock_number,
        odometer_in: Number(row.odometer_in ?? 0),
        line_count: Number(row.line_count ?? 0),
        vin_count: Number(row.vin_count ?? 0),
        sample_vin: row.sample_vin,
        retail_total: Number(row.retail_total ?? 0),
        labor_hours: Number(row.labor_hours ?? 0),
      })),
    });
  } catch (error) {
    sendError(res, error);
  }
});

router.get("/service/details", async (req, res) => {
  try {
    const tenantId = requireTenantId(req.query.tenantId);
    const appointmentId = Number(req.query.appointmentId);
    if (!appointmentId || Number.isNaN(appointmentId)) {
      const error = new Error("appointmentId is required");
      error.statusCode = 400;
      throw error;
    }

    const [appointment] = await query(
      `
      SELECT id, appointment_number, appointment_date_time, customer_key, odometer_in, ro_status
      FROM appointments
      WHERE id = ? AND tenant_id = ?
      LIMIT 1
    `,
      [appointmentId, tenantId]
    );

    if (!appointment) {
      const error = new Error("Appointment not found for this dealership");
      error.statusCode = 404;
      throw error;
    }

    const details = await query(
      `
      SELECT
        ad.id,
        ad.appointment_id,
        ad.vin,
        ad.service_line_number,
        ad.line_type,
        ad.sequence_number,
        ad.trans_date,
        ad.comments,
        ad.service_type,
        ad.line_payment_method,
        ad.technician_id,
        ad.labor_op_code,
        ad.labor_hours,
        ad.labor_cost_hours,
        ad.actual_retail_amount,
        ad.part_number,
        ad.counter_person_id,
        ad.stock_group,
        ad.manufacturer,
        ad.quantity,
        ad.cost,
        ad.list_price,
        ad.net_price,
        ad.trade_price
      FROM appointment_details ad
      WHERE ad.appointment_id = ?
      ORDER BY ad.service_line_number ASC, ad.id ASC
    `,
      [appointmentId]
    );

    res.json({
      appointment: {
        id: appointment.id,
        appointment_number: appointment.appointment_number,
        appointment_date_time: appointment.appointment_date_time,
        customer_key: appointment.customer_key,
        odometer_in: Number(appointment.odometer_in ?? 0),
        ro_status: appointment.ro_status,
      },
      details: details.map((row) => ({
        id: row.id,
        appointment_id: row.appointment_id,
        vin: row.vin,
        service_line_number: row.service_line_number,
        line_type: row.line_type,
        sequence_number: row.sequence_number,
        trans_date: row.trans_date,
        comments: row.comments,
        service_type: row.service_type,
        line_payment_method: row.line_payment_method,
        technician_id: row.technician_id,
        labor_op_code: row.labor_op_code,
        labor_hours: Number(row.labor_hours ?? 0),
        labor_cost_hours: Number(row.labor_cost_hours ?? 0),
        actual_retail_amount: Number(row.actual_retail_amount ?? 0),
        part_number: row.part_number,
        counter_person_id: row.counter_person_id,
        stock_group: row.stock_group,
        manufacturer: row.manufacturer,
        quantity: Number(row.quantity ?? 0),
        cost: Number(row.cost ?? 0),
        list_price: Number(row.list_price ?? 0),
        net_price: Number(row.net_price ?? 0),
        trade_price: Number(row.trade_price ?? 0),
      })),
    });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
