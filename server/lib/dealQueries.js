import { isDashboardTenant } from "../../config/dashboard-tenants.js";

const DEAL_STATUS_LABELS = {
  A: "Active",
  U: "Updated",
};

const VEHICLE_TYPE_LABELS = {
  N: "New",
  U: "Used",
  R: "Rental",
  D: "Demo",
};

const RECORD_TYPE_LABELS = {
  F: "Finance",
  C: "Cash",
  O: "Other",
  L: "Lease",
};

function parseTenantId(tenantId) {
  const parsed = Number(tenantId);
  if (!tenantId || Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function requireTenantId(tenantId) {
  const parsed = parseTenantId(tenantId);
  if (!parsed) {
    const error = new Error("tenantId is required");
    error.statusCode = 400;
    throw error;
  }
  if (!isDashboardTenant(parsed)) {
    const error = new Error("This dealership is not enabled for the dashboard");
    error.statusCode = 403;
    throw error;
  }
  return parsed;
}

function tenantFilterClause(tenantId, alias = "d") {
  const parsed = requireTenantId(tenantId);
  return {
    clause: ` AND ${alias}.tenant_id = ?`,
    params: [parsed],
  };
}

function dealSelectFields(alias = "d") {
  return `
    ${alias}.id,
    ${alias}.tenant_id,
    ${alias}.vin,
    ${alias}.deal_number,
    ${alias}.deal_date,
    ${alias}.customer_number,
    ${alias}.is_intrested,
    ${alias}.created_at,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.Status')) AS status,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.DealDate')) AS deal_date_raw,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.StockNumber')) AS stock_number,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.PrimarySalesperson')) AS salesperson,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.VehicleType')) AS vehicle_type,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.Make')) AS make,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.Model')) AS model,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.ModelYear')) AS model_year,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.BodyStyle')) AS body_style,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.BuyerFirstName')) AS buyer_first_name,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.BuyerLastName')) AS buyer_last_name,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.RecordType')) AS record_type,
    JSON_UNQUOTE(JSON_EXTRACT(${alias}.response, '$.CompanyNumber')) AS company_number,
    (
      SELECT GROUP_CONCAT(DISTINCT sc.name ORDER BY sc.name SEPARATOR ', ')
      FROM service_contracts sc
      WHERE sc.tenant_id = ${alias}.tenant_id
        AND sc.vin = ${alias}.vin
        AND (
          DATE(sc.start_date) = DATE(${alias}.deal_date)
          OR DATE(sc.created_at) = DATE(${alias}.deal_date)
        )
    ) AS service_contracts
  `;
}

function parseServiceContracts(value) {
  if (!value) return [];
  return String(value)
    .split(", ")
    .map((name) => name.trim())
    .filter(Boolean);
}

function formatDealRow(row) {
  return {
    ...row,
    status_label: DEAL_STATUS_LABELS[row.status] ?? row.status,
    vehicle_type_label: VEHICLE_TYPE_LABELS[row.vehicle_type] ?? row.vehicle_type,
    record_type_label: RECORD_TYPE_LABELS[row.record_type] ?? row.record_type,
    buyer_name: [row.buyer_first_name, row.buyer_last_name]
      .filter((part) => part && part !== "[]")
      .join(" ")
      .trim(),
    service_contracts: parseServiceContracts(row.service_contracts),
  };
}

function parseDateParam(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const error = new Error("Invalid date format. Use YYYY-MM-DD.");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function dateFilterClause(startDate, endDate, column, alias) {
  const start = parseDateParam(startDate);
  const end = parseDateParam(endDate);
  const parts = [];
  const params = [];

  if (start) {
    parts.push(`DATE(${alias}.${column}) >= ?`);
    params.push(start);
  }

  if (end) {
    parts.push(`DATE(${alias}.${column}) <= ?`);
    params.push(end);
  }

  return {
    clause: parts.length ? ` AND ${parts.join(" AND ")}` : "",
    params,
  };
}

function buildDealFilters(tenantId, startDate, endDate) {
  const tenant = tenantFilterClause(tenantId);
  const date = dateFilterClause(startDate, endDate, "deal_date", "d");

  return {
    clause: "1=1" + tenant.clause + date.clause,
    params: [...tenant.params, ...date.params],
  };
}

function buildServiceContractDateClause(startDate, endDate) {
  return dateFilterClause(startDate, endDate, "created_at", "sc");
}

const VSC_CONTRACT_NAME_SQL = `UPPER(sc.name) LIKE '%VSC%'`;

const dealHasVscContractSql = `
  EXISTS (
    SELECT 1 FROM service_contracts sc
    WHERE sc.tenant_id = d.tenant_id
      AND sc.vin = d.vin
      AND (
        DATE(sc.start_date) = DATE(d.deal_date)
        OR DATE(sc.created_at) = DATE(d.deal_date)
      )
      AND ${VSC_CONTRACT_NAME_SQL}
  )
`;

export {
  DEAL_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  RECORD_TYPE_LABELS,
  parseTenantId,
  requireTenantId,
  tenantFilterClause,
  dateFilterClause,
  buildDealFilters,
  buildServiceContractDateClause,
  VSC_CONTRACT_NAME_SQL,
  dealHasVscContractSql,
  dealSelectFields,
  formatDealRow,
};
