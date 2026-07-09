import { query } from "../../src/lib/db.js";
import { VEHICLE_TYPE_LABELS, VSC_CONTRACT_NAME_SQL } from "./dealQueries.js";

const ADMIN_FEE_ESTIMATE = 200;
const REINS_INTEREST_RATE = 0.041;
const REINS_PROFIT_PCT = 0.25;

function roundCurrency(value) {
  return Number(Number(value ?? 0).toFixed(2));
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function cleanText(value) {
  if (value == null || value === "[]" || value === "null") return "";
  return String(value).trim();
}

function termYearsFromDates(startDate, expirationDate, durationMonths) {
  if (durationMonths) {
    return Math.max(1, Math.round(Number(durationMonths) / 12));
  }

  if (!startDate || !expirationDate) return 1;

  const start = new Date(startDate);
  const end = new Date(expirationDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  const years = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(1, Math.round(years));
}

function tenantSurcharges(tenant) {
  return (
    Number(tenant.perc_merchant_ac_fee ?? 0) +
    Number(tenant.perc_disc_cash_pay ?? 0) +
    Number(tenant.perc_prepaid_fin_expense ?? 0)
  );
}

function tenantAffiliateFees(tenant) {
  return (
    Number(tenant.affiliate_fee_1 ?? 0) +
    Number(tenant.affiliate_fee_2 ?? 0) +
    Number(tenant.affiliate_fee_3 ?? 0)
  );
}

function deductibleTier(deductible) {
  const amount = Number(deductible ?? 0);
  if (amount <= 0) return "";
  return amount <= 100 ? "$100" : "$200";
}

function coverageLabel(name, planCode) {
  const label = cleanText(planCode) || cleanText(name);
  if (!label) return "";
  return label.replace(/\s+VSC$/i, "").trim();
}

function estimateBasePrice(miles, fallbackBase) {
  const mileage = Number(miles ?? 0);
  if (fallbackBase) return Number(fallbackBase);

  if (mileage >= 100000) return 1800;
  if (mileage >= 75000) return 1600;
  if (mileage >= 48000) return 1425;
  if (mileage > 0) return 1200;
  return 1425;
}

function buildPricing(row) {
  const tenantDealerProfit = Number(row.tenant_dealer_profit ?? 0);
  const tenantFfdFee = Number(row.tenant_ffd_fee ?? 0);
  const surcharges = Number(row.pc_surcharges ?? row.tenant_surcharges ?? 0);
  const addOnsPrice = Number(row.pc_add_ons_price ?? 0);
  const affiliateFees = Number(row.pc_affiliate_fees ?? row.tenant_affiliate_fees ?? 0);
  const deductible100Fee = Number(row.pc_deductible_100_fee ?? row.tenant_deductible_100_fee ?? 0);
  const dealerProfit = Number(row.pc_dealer_profit ?? tenantDealerProfit);
  const ffdFee = Number(row.pc_ffd_fee ?? tenantFfdFee);
  const basePrice = Number(row.pc_base_price ?? estimateBasePrice(row.miles, row.wp_base_price));

  const totalFeesAllAdds = roundCurrency(
    surcharges + ffdFee + addOnsPrice + affiliateFees + deductible100Fee
  );

  const agreementPrice = roundCurrency(
    row.pc_calculated_price ??
      basePrice + dealerProfit + ffdFee + surcharges + addOnsPrice + affiliateFees + deductible100Fee
  );

  const amountPaidToAdministrator = roundCurrency(agreementPrice - totalFeesAllAdds);
  const estimatedAdminFees = ADMIN_FEE_ESTIMATE;
  const amountCededToReins = roundCurrency(amountPaidToAdministrator - estimatedAdminFees);
  const termYears = termYearsFromDates(row.start_date, row.expiration_date, row.duration_months);
  const interestIncome = roundCurrency(amountCededToReins * REINS_INTEREST_RATE * termYears);
  const reinsProfitShare = roundCurrency(amountCededToReins * REINS_PROFIT_PCT);
  const totalReinsProjected = roundCurrency(interestIncome + reinsProfitShare);
  const dealerVscProfit = roundCurrency(dealerProfit);
  const projectedIncome = roundCurrency(dealerVscProfit + totalReinsProjected);

  return {
    agreement_price: agreementPrice,
    total_fees_all_adds: totalFeesAllAdds,
    amount_paid_to_administrator: amountPaidToAdministrator,
    estimated_admin_fees: estimatedAdminFees,
    amount_ceded_to_reins: amountCededToReins,
    term_years: termYears,
    interest_income: interestIncome,
    reins_profit_share: reinsProfitShare,
    total_reins_projected: totalReinsProjected,
    dealer_vsc_profit: dealerVscProfit,
    projected_income: projectedIncome,
    pricing_source: row.pc_calculated_price ? "package_calculations" : "estimated",
  };
}

function formatVscReinsuranceRow(row) {
  const pricing = buildPricing(row);
  const buyerFirst = cleanText(row.buyer_first);
  const buyerLast = cleanText(row.buyer_last);

  return {
    fdd_dealer_number: cleanText(row.company_number) || cleanText(row.fdd_dealer_number),
    fdd_contract_number: cleanText(row.service_contract_sequence_number),
    customer_first_name: buyerFirst,
    customer_last_name: buyerLast,
    customer_name: [buyerFirst, buyerLast].filter(Boolean).join(" ").trim(),
    make: cleanText(row.make),
    model: cleanText(row.model),
    year: cleanText(row.model_year),
    vin: cleanText(row.vin),
    odometer_on_sale: Number(row.starting_odometer ?? 0),
    new_used: VEHICLE_TYPE_LABELS[row.vehicle_type] ?? cleanText(row.vehicle_type),
    term_months: row.duration_months ? Number(row.duration_months) : null,
    coverage: coverageLabel(row.contract_name, row.plan_code),
    mileage_selected: Number(row.miles ?? 0),
    deductible_tier: deductibleTier(row.deductible),
    deductible_amount: roundCurrency(row.deductible),
    effective_sale_date: row.start_date,
    deal_date: row.deal_date,
    contract_name: cleanText(row.contract_name),
    ...pricing,
  };
}

async function fetchVscReinsuranceRows(tenantId, startDate, endDate) {
  const params = [tenantId];
  let dateClause = "";

  if (startDate) {
    dateClause += " AND DATE(COALESCE(sc.start_date, d.deal_date)) >= ?";
    params.push(startDate);
  }

  if (endDate) {
    dateClause += " AND DATE(COALESCE(sc.start_date, d.deal_date)) <= ?";
    params.push(endDate);
  }

  const rows = await query(
    `
    SELECT
      t.dt_company_number AS fdd_dealer_number,
      t.amt_dealer_profit AS tenant_dealer_profit,
      t.amt_fdd_fee AS tenant_ffd_fee,
      t.perc_merchant_ac_fee,
      t.perc_disc_cash_pay,
      t.perc_prepaid_fin_expense,
      t.affiliate_fee_1,
      t.affiliate_fee_2,
      t.affiliate_fee_3,
      t.fee_deductible_100 AS tenant_deductible_100_fee,
      sc.service_contract_sequence_number,
      sc.name AS contract_name,
      sc.plan_code,
      sc.start_date,
      sc.expiration_date,
      sc.deductible,
      sc.miles,
      sc.starting_odometer,
      d.deal_date,
      d.vin,
      JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.BuyerFirstName')) AS buyer_first,
      JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.BuyerLastName')) AS buyer_last,
      JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.Make')) AS make,
      JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.Model')) AS model,
      JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.ModelYear')) AS model_year,
      JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.VehicleType')) AS vehicle_type,
      JSON_UNQUOTE(JSON_EXTRACT(d.response, '$.CompanyNumber')) AS company_number,
      pc.calculated_price AS pc_calculated_price,
      pc.dealer_profit AS pc_dealer_profit,
      pc.ffd_fee AS pc_ffd_fee,
      pc.surcharges AS pc_surcharges,
      pc.add_ons_price AS pc_add_ons_price,
      pc.base_price AS pc_base_price,
      wp.duration_months,
      wp.base_price AS wp_base_price,
      JSON_UNQUOTE(JSON_EXTRACT(pc.details, '$.affiliate_fees.total_affiliate_fee')) AS pc_affiliate_fees,
      JSON_UNQUOTE(JSON_EXTRACT(pc.details, '$.deductible_100_fee')) AS pc_deductible_100_fee
    FROM deals d
    INNER JOIN service_contracts sc
      ON sc.tenant_id = d.tenant_id
      AND sc.vin = d.vin
      AND (
        DATE(sc.start_date) = DATE(d.deal_date)
        OR DATE(sc.created_at) = DATE(d.deal_date)
      )
      AND ${VSC_CONTRACT_NAME_SQL}
    INNER JOIN tenants t ON t.id = d.tenant_id
    LEFT JOIN vehicles v ON v.tenant_id = d.tenant_id AND v.vin = d.vin
    LEFT JOIN (
      SELECT vehicle_id, MAX(id) AS latest_id
      FROM package_calculations
      GROUP BY vehicle_id
    ) latest_pc ON latest_pc.vehicle_id = COALESCE(sc.vehicle_id, v.id)
    LEFT JOIN package_calculations pc ON pc.id = latest_pc.latest_id
    LEFT JOIN warranty_packages wp ON wp.id = pc.package_id
    WHERE d.tenant_id = ?${dateClause}
    ORDER BY COALESCE(sc.start_date, d.deal_date) DESC, d.id DESC
  `,
    params
  );

  return rows.map((row) => ({
    ...row,
    tenant_surcharges: tenantSurcharges(row),
    tenant_affiliate_fees: tenantAffiliateFees(row),
  }));
}

function summarizeRows(rows) {
  const totals = rows.reduce(
    (acc, row) => {
      acc.total_contracts += 1;
      acc.total_agreement_price += row.agreement_price;
      acc.total_fees_all_adds += row.total_fees_all_adds;
      acc.total_amount_paid_to_administrator += row.amount_paid_to_administrator;
      acc.total_amount_ceded_to_reins += row.amount_ceded_to_reins;
      acc.total_interest_income += row.interest_income;
      acc.total_reins_projected += row.total_reins_projected;
      acc.total_dealer_vsc_profit += row.dealer_vsc_profit;
      acc.total_projected_income += row.projected_income;
      if (row.pricing_source === "package_calculations") acc.priced_from_packages += 1;
      else acc.priced_estimated += 1;
      return acc;
    },
    {
      total_contracts: 0,
      total_agreement_price: 0,
      total_fees_all_adds: 0,
      total_amount_paid_to_administrator: 0,
      total_amount_ceded_to_reins: 0,
      total_interest_income: 0,
      total_reins_projected: 0,
      total_dealer_vsc_profit: 0,
      total_projected_income: 0,
      priced_from_packages: 0,
      priced_estimated: 0,
    }
  );

  for (const key of Object.keys(totals)) {
    if (key.startsWith("total_") && key !== "total_contracts") {
      totals[key] = roundCurrency(totals[key]);
    }
  }

  return totals;
}

async function buildVscReinsuranceReport(tenantId, startDate, endDate, tenantMeta = {}) {
  const rawRows = await fetchVscReinsuranceRows(tenantId, startDate, endDate);
  const rows = rawRows.map(formatVscReinsuranceRow);

  return {
    tenantId,
    dealershipName: tenantMeta.name ?? null,
    fddDealerNumber: rows[0]?.fdd_dealer_number ?? null,
    reportNumber: 1,
    period: {
      startDate: startDate ?? null,
      endDate: endDate ?? null,
    },
    constants: {
      admin_fee_estimate: ADMIN_FEE_ESTIMATE,
      reins_interest_rate: REINS_INTEREST_RATE,
      reins_profit_pct: REINS_PROFIT_PCT,
    },
    summary: summarizeRows(rows),
    rows,
  };
}

export {
  ADMIN_FEE_ESTIMATE,
  REINS_INTEREST_RATE,
  REINS_PROFIT_PCT,
  buildVscReinsuranceReport,
  formatVscReinsuranceRow,
};
