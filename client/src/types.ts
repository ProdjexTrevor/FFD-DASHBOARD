export interface Tenant {
  id: number;
  name: string;
  domain: string;
  status: string;
  phone?: string | null;
  address?: string | null;
  support_email?: string | null;
  primary_color: string;
  secondary_color: string;
  logo?: string | null;
  deal_count: number;
  customer_count: number;
  vehicle_count: number;
  latest_deal_date?: string | null;
  earliest_deal_date?: string | null;
}

export interface SalesMetric {
  count: number;
  priorCount: number;
  change: number;
  changePct: number;
  periodLabel: string;
}

export interface DashboardSummary {
  tenantId: number;
  summary: {
    total_deals: number;
    active_deals: number;
    new_vehicle_deals: number;
    used_vehicle_deals: number;
    unique_vehicles: number;
    unique_customers: number;
    total_customers: number;
    total_vehicles: number;
    total_service_contracts: number;
    vsc_contracts: number;
    deals_with_vsc: number;
    vsc_attach_rate: number;
    earliest_deal_date: string | null;
    latest_deal_date: string | null;
  };
  salesVelocity: {
    cars: {
      yesterday: SalesMetric;
      lastWeek: SalesMetric;
      lastMonth: SalesMetric;
    };
  };
  serviceContractBreakdown: BreakdownItem[];
  vehicleTypeBreakdown: BreakdownItem[];
  recordTypeBreakdown: BreakdownItem[];
  topMakes: NamedCount[];
  topSalespeople: NamedCount[];
  topModels: NamedCount[];
}

export interface BreakdownItem {
  key_name: string;
  label: string;
  count: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  total: number;
  new_vehicles: number;
  used_vehicles: number;
  active_deals: number;
}

export interface Deal {
  id: number;
  tenant_id: number;
  tenant_name: string;
  tenant_domain: string;
  vin: string;
  deal_number: string;
  deal_date: string;
  customer_number: string;
  status: string;
  status_label: string;
  stock_number: string;
  salesperson: string;
  vehicle_type: string;
  vehicle_type_label: string;
  make: string;
  model: string;
  model_year: string;
  body_style: string;
  buyer_name: string;
  record_type: string;
  record_type_label: string;
  company_number: string;
  service_contracts: string[];
}

export interface DealsResponse {
  tenantId: number;
  data: Deal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AttachRateRow {
  total_deals: number;
  deals_with_contracts: number;
  attach_rate: number;
}

export interface FiAttachReport {
  summary: AttachRateRow;
  monthly: Array<AttachRateRow & { month: string }>;
  byVehicleType: Array<AttachRateRow & { label: string }>;
  bySalesperson: Array<AttachRateRow & { name: string }>;
  productMix: NamedCount[];
}

export interface SalesTeamLeaderRow {
  name: string;
  total_deals: number;
  new_deals: number;
  used_deals: number;
  deals_with_contracts: number;
  attach_rate: number;
}

export interface SalesTeamReport {
  leaderboard: SalesTeamLeaderRow[];
  monthlyTrends: Array<Record<string, string | number>>;
  topNames: string[];
}

export interface CustomersReport {
  repeatBuckets: Array<{ deal_count_bucket: string; customers: number }>;
  periodSummary: { unique_in_period: number };
  topCities: NamedCount[];
}

export interface DealershipCompareRow {
  id: number;
  name: string;
  domain: string;
  primary_color: string;
  total_deals: number;
  new_deals: number;
  used_deals: number;
  deals_with_contracts: number;
  unique_customers: number;
  attach_rate: number;
}

export interface VscReinsuranceRow {
  fdd_dealer_number: string;
  fdd_contract_number: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_name: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  odometer_on_sale: number;
  new_used: string;
  term_months: number | null;
  coverage: string;
  mileage_selected: number;
  deductible_tier: string;
  deductible_amount: number;
  effective_sale_date: string;
  deal_date: string;
  contract_name: string;
  agreement_price: number;
  total_fees_all_adds: number;
  amount_paid_to_administrator: number;
  estimated_admin_fees: number;
  amount_ceded_to_reins: number;
  term_years: number;
  interest_income: number;
  reins_profit_share: number;
  total_reins_projected: number;
  dealer_vsc_profit: number;
  projected_income: number;
  pricing_source: "package_calculations" | "estimated";
}

export interface VscReinsuranceReport {
  tenantId: number;
  dealershipName: string | null;
  fddDealerNumber: string | null;
  reportNumber: number;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  constants: {
    admin_fee_estimate: number;
    reins_interest_rate: number;
    reins_profit_pct: number;
  };
  summary: {
    total_contracts: number;
    total_agreement_price: number;
    total_fees_all_adds: number;
    total_amount_paid_to_administrator: number;
    total_amount_ceded_to_reins: number;
    total_interest_income: number;
    total_reins_projected: number;
    total_dealer_vsc_profit: number;
    total_projected_income: number;
    priced_from_packages: number;
    priced_estimated: number;
  };
  rows: VscReinsuranceRow[];
}
