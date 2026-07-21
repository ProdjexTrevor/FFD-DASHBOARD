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
  VscReinsuranceReport,
  ServiceReport,
  ServiceDetailsResponse,
} from "../types";
import type { DateRange } from "./dateFilter";

const apiBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

const api = axios.create({ baseURL: apiBaseUrl });

function apiUnavailableMessage() {
  return "Could not reach the dashboard API. Verify the API server is running and accessible.";
}

function assertArrayResponse<T>(data: unknown): T[] {
  if (!Array.isArray(data)) {
    throw new Error(apiUnavailableMessage());
  }

  return data;
}

function assertObjectResponse<T extends Record<string, unknown>>(data: unknown, keys: string[]): T {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(apiUnavailableMessage());
  }

  for (const key of keys) {
    if (!(key in data)) {
      throw new Error(apiUnavailableMessage());
    }
  }

  return data as T;
}

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
  const { data } = await api.get("/api/auth/whoami");
  return assertObjectResponse<{ username: string; displayName: string }>(data, ["username"]);
}

function withDateParams(params: Record<string, unknown>, dateRange?: DateRange) {
  return {
    ...params,
    ...(dateRange?.startDate ? { startDate: dateRange.startDate } : {}),
    ...(dateRange?.endDate ? { endDate: dateRange.endDate } : {}),
  };
}

export async function fetchTenants() {
  const { data } = await api.get("/api/tenants");
  return assertArrayResponse<Tenant>(data);
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

export async function fetchVscReinsuranceReport(tenantId: number, dateRange?: DateRange) {
  const { data } = await api.get<VscReinsuranceReport>("/api/reports/vsc-sales-reinsurance", {
    params: withDateParams({ tenantId }, dateRange),
  });
  return data;
}

export async function fetchServiceReport(tenantId: number, dateRange?: DateRange) {
  const { data } = await api.get<ServiceReport>("/api/reports/service", {
    params: withDateParams({ tenantId }, dateRange),
  });
  return data;
}

export async function fetchServiceDetails(tenantId: number, appointmentId: number) {
  const { data } = await api.get<ServiceDetailsResponse>("/api/reports/service/details", {
    params: { tenantId, appointmentId },
  });
  return data;
}
