export const DASHBOARD_TENANT_IDS = [7, 4, 5, 6] as const;

export function isDashboardTenant(tenantId: number) {
  return (DASHBOARD_TENANT_IDS as readonly number[]).includes(tenantId);
}
