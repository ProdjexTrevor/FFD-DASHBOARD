import axios from "axios";
import { clearStoredAuth, getAuthHeader } from "./auth";
import type {
  CustomersReport,
  DashboardSummary,
  DealershipCompareRow,
  DealsResponse,
  FiAttachReport,
  MonthlyTrend,
  SalesTeamReport,
  Tenant,
} from "../types";
import type { DateRange } from "./dateFilter";

const api = axios.create({ baseURL: "" });

api.interceptors.request.use((config) => {
  const authHeader = getAuthHeader();
  if (authHeader) {
    config.headers.Authorization = authHeader;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth();
    }
    return Promise.reject(error);
  }
);

export async function fetchWhoami() {
  const { data } = await api.get<{ username: string; displayName: string }>("/api/auth/whoami");
  return data;
}

function withDateParams(params: Record<string, unknown>, dateRange?: DateRange) {
  return {
    ...params,
    ...(dateRange?.startDate ? { startDate: dateRange.startDate } : {}),
    ...(dateRange?.endDate ? { endDate: dateRange.endDate } : {}),
  };
}

export async function fetchTenants() {
  const { data } = await api.get<Tenant[]>("/api/tenants");
  return data;
}

export async function fetchTenant(tenantId: number) {
  const { data } = await api.get<Tenant>(`/api/tenants/${tenantId}`);
  return data;
}

export async function fetchDashboardSummary(tenantId: number, dateRange?: DateRange) {
  const { data } = await api.get<DashboardSummary>("/api/dashboard/summary", {
    params: withDateParams({ tenantId }, dateRange),
  });
  return data;
}

export async function fetchMonthlyTrends(tenantId: number, dateRange?: DateRange) {
  const { data } = await api.get<{ tenantId: number; data: MonthlyTrend[] }>("/api/dashboard/monthly-trends", {
    params: withDateParams({ tenantId }, dateRange),
  });
  return data.data;
}

export interface DealFilters {
  tenantId: number;
  status?: string;
  vehicleType?: string;
  recordType?: string;
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export async function fetchDeals(filters: DealFilters) {
  const { data } = await api.get<DealsResponse>("/api/deals", { params: filters });
  return data;
}

export async function fetchFiAttachReport(tenantId: number, dateRange?: DateRange) {
  const { data } = await api.get<FiAttachReport>("/api/reports/fi-attach", {
    params: withDateParams({ tenantId }, dateRange),
  });
  return data;
}

export async function fetchSalesTeamReport(tenantId: number, dateRange?: DateRange) {
  const { data } = await api.get<SalesTeamReport>("/api/reports/sales-team", {
    params: withDateParams({ tenantId }, dateRange),
  });
  return data;
}

export async function fetchCustomersReport(tenantId: number, dateRange?: DateRange) {
  const { data } = await api.get<CustomersReport>("/api/reports/customers", {
    params: withDateParams({ tenantId }, dateRange),
  });
  return data;
}

export async function fetchDealershipCompareReport(dateRange?: DateRange) {
  const { data } = await api.get<DealershipCompareRow[]>("/api/reports/dealership-compare", {
    params: withDateParams({}, dateRange),
  });
  return data;
}
