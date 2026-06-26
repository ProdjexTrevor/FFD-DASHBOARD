import { useEffect, useState } from "react";
import { useTenant } from "../context/TenantContext";
import { isDashboardTenant } from "../config/dashboard-tenants";
import { fetchTenants } from "../lib/api";
import type { Tenant } from "../types";

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No deals yet";
  return new Date(value).toLocaleDateString();
}

export function TenantPicker() {
  const { selectTenant } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants()
      .then((data) => setTenants(data.filter((tenant) => tenant.status === "active" && isDashboardTenant(tenant.id))))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading">Loading dealerships...</div>;
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <div className="tenant-picker">
      <header className="picker-header">
        <p className="eyebrow">First Dealer Direct</p>
        <h1>Select a dealership</h1>
        <p className="subtitle">
          This dashboard is tenant-based. Choose a dealership to view its DealTrack data only.
        </p>
      </header>

      <div className="tenant-grid">
        {tenants.map((tenant) => (
          <button
            key={tenant.id}
            type="button"
            className="tenant-card"
            style={{
              borderColor: tenant.primary_color,
              background: `linear-gradient(180deg, ${tenant.primary_color}14 0%, #fff 100%)`,
            }}
            onClick={() => selectTenant(tenant)}
          >
            <div className="tenant-card-accent" style={{ backgroundColor: tenant.primary_color }} />
            <div className="tenant-card-body">
              <h2>{tenant.name}</h2>
              <p className="tenant-domain">{tenant.domain}</p>
              <div className="tenant-stats">
                <div>
                  <strong>{formatNumber(tenant.deal_count)}</strong>
                  <span>Deals</span>
                </div>
                <div>
                  <strong>{formatNumber(tenant.customer_count)}</strong>
                  <span>Customers</span>
                </div>
                <div>
                  <strong>{formatNumber(tenant.vehicle_count)}</strong>
                  <span>Vehicles</span>
                </div>
              </div>
              <p className="tenant-meta">Latest deal: {formatDate(tenant.latest_deal_date)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
