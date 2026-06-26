import { useEffect, useState } from "react";
import { useTenant } from "../context/TenantContext";
import { useDateFilter } from "../context/DateFilterContext";
import { BreakdownPieChart, KpiCard, MonthlyTrendChart, SalesKpiCard, ServiceContractChart, TopBarChart } from "../components/Charts";
import { DealsTable } from "../components/DealsTable";
import { fetchDashboardSummary, fetchDeals, fetchMonthlyTrends } from "../lib/api";
import type { DashboardSummary, Deal, MonthlyTrend, SalesMetric } from "../types";

function formatNumber(value: number | string) {
  return new Intl.NumberFormat().format(Number(value));
}

function SalesMetricRow({ title, metrics }: { title: string; metrics: { yesterday: SalesMetric; lastWeek: SalesMetric; lastMonth: SalesMetric } }) {
  return (
    <section className="sales-section">
      <h3 className="sales-section-title">{title}</h3>
      <div className="sales-kpi-grid">
        <SalesKpiCard
          label="Yesterday"
          count={metrics.yesterday.count}
          priorCount={metrics.yesterday.priorCount}
          changePct={metrics.yesterday.changePct}
          periodLabel={metrics.yesterday.periodLabel}
        />
        <SalesKpiCard
          label="Last week"
          count={metrics.lastWeek.count}
          priorCount={metrics.lastWeek.priorCount}
          changePct={metrics.lastWeek.changePct}
          periodLabel={metrics.lastWeek.periodLabel}
        />
        <SalesKpiCard
          label="Last month"
          count={metrics.lastMonth.count}
          priorCount={metrics.lastMonth.priorCount}
          changePct={metrics.lastMonth.changePct}
          periodLabel={metrics.lastMonth.periodLabel}
        />
      </div>
    </section>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

export function OverviewPage() {
  const { tenant } = useTenant();
  const { activeRange, rangeLabel } = useDateFilter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyTrend[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [recordType, setRecordType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    Promise.all([
      fetchDashboardSummary(tenant.id, activeRange),
      fetchMonthlyTrends(tenant.id, activeRange),
      fetchDeals({
        tenantId: tenant.id,
        page,
        limit: 20,
        search: search || undefined,
        vehicleType: vehicleType || undefined,
        recordType: recordType || undefined,
        startDate: activeRange.startDate,
        endDate: activeRange.endDate,
      }),
    ])
      .then(([summaryData, monthlyData, dealsData]) => {
        setSummary(summaryData);
        setMonthly(monthlyData);
        setDeals(dealsData.data);
        setTotalPages(dealsData.pagination.totalPages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenant, page, search, vehicleType, recordType, activeRange]);

  useEffect(() => {
    setPage(1);
  }, [tenant, search, vehicleType, recordType, activeRange]);

  if (!tenant) return null;

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
        </div>
      </div>

      <div className="filters">
        <label>
          Search
          <input
            type="search"
            placeholder="Deal #, VIN, customer, make..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label>
          Vehicle
          <select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}>
            <option value="">All types</option>
            <option value="N">New</option>
            <option value="U">Used</option>
          </select>
        </label>

        <label>
          Deal type
          <select value={recordType} onChange={(event) => setRecordType(event.target.value)}>
            <option value="">All deal types</option>
            <option value="F">Finance</option>
            <option value="C">Cash</option>
            <option value="L">Lease</option>
            <option value="O">Other</option>
          </select>
        </label>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="loading">Loading dashboard...</div> : null}

      {!loading && summary ? (
        <>
          {summary.summary.total_deals === 0 && tenant?.latest_deal_date ? (
            <div className="info-banner">
              No deals in <strong>{rangeLabel}</strong>. The last recorded deal was{" "}
              <strong>{formatDate(tenant.latest_deal_date)}</strong>
              {tenant.deal_count > 0 ? (
                <>
                  {" "}
                  ({formatNumber(tenant.deal_count)} total on file). Try <strong>Last 90 days</strong> or{" "}
                  <strong>All time</strong>, or check that DealTrack is syncing new deals.
                </>
              ) : null}
            </div>
          ) : null}

          <section className="kpi-grid">
            <KpiCard label="Total deals" value={formatNumber(summary.summary.total_deals)} hint={rangeLabel} />
            <KpiCard label="Customers" value={formatNumber(summary.summary.total_customers)} />
            <KpiCard label="Vehicles" value={formatNumber(summary.summary.total_vehicles)} />
            <KpiCard
              label="Service contracts"
              value={formatNumber(summary.summary.total_service_contracts)}
              detail={`${formatNumber(summary.summary.vsc_contracts)} VSC · ${summary.summary.vsc_attach_rate}% of deals`}
            />
            <KpiCard
              label="New / Used deals"
              value={`${formatNumber(summary.summary.new_vehicle_deals)} / ${formatNumber(summary.summary.used_vehicle_deals)}`}
            />
          </section>

          <SalesMetricRow title="Cars sold" metrics={summary.salesVelocity.cars} />

          <section className="chart-grid">
            <MonthlyTrendChart data={monthly} />
            <BreakdownPieChart title="Vehicle type" data={summary.vehicleTypeBreakdown} />
            <BreakdownPieChart title="Deal type" data={summary.recordTypeBreakdown} />
            <TopBarChart title="Top makes" data={summary.topMakes} />
            <TopBarChart title="Top salespeople" data={summary.topSalespeople} />
            <TopBarChart title="Top models" data={summary.topModels} labelWidth={150} />
          </section>

          <section className="sales-section">
            <ServiceContractChart title="Service contracts sold by type" data={summary.serviceContractBreakdown} />
          </section>

          <DealsTable deals={deals} page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </div>
  );
}
