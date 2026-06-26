import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isDashboardTenant } from "../config/dashboard-tenants";
import type { Tenant } from "../types";

const STORAGE_KEY = "fdd.selectedTenantId";

interface TenantContextValue {
  tenant: Tenant | null;
  selectTenant: (tenant: Tenant) => void;
  clearTenant: () => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    fetch(`/api/tenants/${stored}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && isDashboardTenant(data.id)) setTenant(data);
        else localStorage.removeItem(STORAGE_KEY);
      })
      .catch(() => localStorage.removeItem(STORAGE_KEY));
  }, []);

  const value = useMemo(
    () => ({
      tenant,
      selectTenant: (nextTenant: Tenant) => {
        localStorage.setItem(STORAGE_KEY, String(nextTenant.id));
        setTenant(nextTenant);
      },
      clearTenant: () => {
        localStorage.removeItem(STORAGE_KEY);
        setTenant(null);
      },
    }),
    [tenant]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}

export function applyTenantTheme(tenant: Tenant | null) {
  const root = document.documentElement;
  if (!tenant) {
    root.style.removeProperty("--tenant-primary");
    root.style.removeProperty("--tenant-secondary");
    return;
  }

  root.style.setProperty("--tenant-primary", tenant.primary_color || "#2563eb");
  root.style.setProperty("--tenant-secondary", tenant.secondary_color || "#059669");
}
