/** Dealerships shown in this dashboard (DB tenant id → display name). */
export const DASHBOARD_TENANTS = {
  7: "Blue Spring Ford",
  4: "Lee Summit Honda",
  5: "Lee Summit Subaru",
  6: "Smithville Ford",
};

export const DASHBOARD_TENANT_IDS = Object.keys(DASHBOARD_TENANTS).map(Number);

export function isDashboardTenant(tenantId) {
  return DASHBOARD_TENANT_IDS.includes(Number(tenantId));
}

export function applyTenantDisplayName(tenant) {
  const displayName = DASHBOARD_TENANTS[tenant.id];
  if (!displayName) return tenant;
  return { ...tenant, name: displayName };
}

export function filterDashboardTenants(tenants) {
  return tenants
    .filter((tenant) => tenant.status === "active" && isDashboardTenant(tenant.id))
    .map(applyTenantDisplayName)
    .sort((a, b) => a.name.localeCompare(b.name));
}
