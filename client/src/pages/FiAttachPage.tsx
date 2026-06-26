import { useEffect, useState } from "react";
import { AttachRateBarChart, AttachRateTrendChart, KpiCard, TopBarChart } from "../components/Charts";
import { useDateFilter } from "../context/DateFilterContext";
import { useTenant } from "../context/TenantContext";
import { fetchFiAttachReport } from "../lib/api";
import type { FiAttachReport } from "../types";

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function FiAttachPage() {
  const { tenant } = useTenant();
  const { activeRange, rangeLabel } = useDateFilter();
  const [report, setReport] = useState<FiAttachReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    fetchFiAttachReport(tenant.id, activeRange)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenant, activeRange]);

  if (!tenant) return null;

  const productMix = (report?.productMix ?? []).map((row) => ({
    name: row.name,
    count: Number(row.count),
  }));

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">F&I</p>
          <h1>Attach rate</h1>
          <p className="subtitle">Service contract penetration on closed deals · {rangeLabel}</p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="loading">Loading F&I report...</div> : null}

      {!loading && report ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="Attach rate" value={`${report.summary.attach_rate}%`} hint={rangeLabel} />
            <KpiCard label="Deals with contracts" value={formatNumber(report.summary.deals_with_contracts)} />
            <KpiCard label="Total deals" value={formatNumber(report.summary.total_deals)} />
          </section>

          <section className="chart-grid">
            <AttachRateTrendChart data={report.monthly} />
            <AttachRateBarChart title="Attach rate by vehicle type" data={report.byVehicleType} />
            <AttachRateBarChart title="Attach rate by salesperson" data={report.bySalesperson} labelKey="name" labelWidth={120} />
            <TopBarChart title="Product mix (contracts sold)" data={productMix} labelWidth={160} />
          </section>
        </>
      ) : null}
    </div>
  );
}
