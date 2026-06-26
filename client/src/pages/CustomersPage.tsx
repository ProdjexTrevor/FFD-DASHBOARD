import { useEffect, useState } from "react";
import { BreakdownPieChart, KpiCard, TopBarChart } from "../components/Charts";
import { useDateFilter } from "../context/DateFilterContext";
import { useTenant } from "../context/TenantContext";
import { fetchCustomersReport } from "../lib/api";
import type { CustomersReport } from "../types";

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function CustomersPage() {
  const { tenant } = useTenant();
  const { activeRange, rangeLabel } = useDateFilter();
  const [report, setReport] = useState<CustomersReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    fetchCustomersReport(tenant.id, activeRange)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenant, activeRange]);

  if (!tenant) return null;

  const repeatData = (report?.repeatBuckets ?? []).map((row) => ({
    key_name: row.deal_count_bucket,
    label: row.deal_count_bucket,
    count: Number(row.customers),
  }));

  const totalRepeatCustomers = repeatData.reduce((sum, row) => sum + row.count, 0);
  const repeatRate =
    totalRepeatCustomers > 0
      ? (
          (repeatData.filter((row) => row.key_name !== "1 deal").reduce((sum, row) => sum + row.count, 0) /
            totalRepeatCustomers) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Customers</p>
          <h1>Buyer analysis</h1>
          <p className="subtitle">Repeat buyers and geography · {rangeLabel}</p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="loading">Loading customer report...</div> : null}

      {!loading && report ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="Unique buyers (period)" value={formatNumber(report.periodSummary.unique_in_period)} hint={rangeLabel} />
            <KpiCard label="Repeat buyer rate" value={`${repeatRate}%`} hint="All-time deal count buckets" />
            <KpiCard label="Total tracked customers" value={formatNumber(totalRepeatCustomers)} />
          </section>

          <section className="chart-grid">
            <BreakdownPieChart title="Customers by lifetime deals" data={repeatData} />
            <TopBarChart title="Top cities" data={report.topCities} labelWidth={140} />
          </section>
        </>
      ) : null}
    </div>
  );
}
