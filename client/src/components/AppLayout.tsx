import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { applyTenantTheme, useTenant } from "../context/TenantContext";
import { useAuth } from "../context/AuthContext";
import { useDateFilter } from "../context/DateFilterContext";
import { DateFilterBar } from "./DateFilterBar";

const NAV_ITEMS = [
  { to: "/", label: "Overview", end: true },
  { to: "/fi-attach", label: "F&I Attach" },
  { to: "/sales-team", label: "Sales Team" },
  { to: "/customers", label: "Customers" },
  { to: "/dealerships", label: "Compare" },
];

export function AppLayout() {
  const { tenant, clearTenant } = useTenant();
  const { user, logout } = useAuth();
  const { filter, setFilter } = useDateFilter();

  useEffect(() => {
    if (!tenant) return;
    applyTenantTheme(tenant);
    return () => applyTenantTheme(null);
  }, [tenant]);

  if (!tenant) return null;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="tenant-chip" style={{ backgroundColor: tenant.primary_color }}>
            {tenant.name.slice(0, 1)}
          </span>
          <div>
            <strong>{tenant.name}</strong>
            <span className="sidebar-domain">{tenant.domain}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="switch-tenant-btn sidebar-switch" onClick={clearTenant}>
          Switch dealership
        </button>
        <div className="sidebar-user">
          <span>{user?.displayName ?? user?.username}</span>
          <button type="button" className="switch-tenant-btn sidebar-signout" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="page-header">
          <DateFilterBar filter={filter} onChange={setFilter} />
        </header>
        <Outlet />
      </div>
    </div>
  );
}
