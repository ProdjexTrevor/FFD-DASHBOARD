import { useEffect, useState } from "react";
import { KpiCard, SalesTeamTrendChart } from "../components/Charts";
import { useDateFilter } from "../context/DateFilterContext";
import { useTenant } from "../context/TenantContext";
import { fetchSalesTeamReport } from "../lib/api";
import type { SalesTeamReport } from "../types";

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function SalesTeamPage() {
  const { tenant } = useTenant();
  const { activeRange, rangeLabel } = useDateFilter();
  const [report, setReport] = useState<SalesTeamReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    fetchSalesTeamReport(tenant.id, activeRange)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenant, activeRange]);

  if (!tenant) return null;

  const topRep = report?.leaderboard[0];

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Sales</p>
          <h1>Team scorecard</h1>
          <p className="subtitle">Salesperson performance · {rangeLabel}</p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="loading">Loading sales team report...</div> : null}

      {!loading && report ? (
        <>
          {topRep ? (
            <section className="kpi-grid">
              <KpiCard label="Top rep" value={topRep.name} hint={`${formatNumber(topRep.total_deals)} deals`} />
              <KpiCard label="Team deals" value={formatNumber(report.leaderboard.reduce((sum, row) => sum + row.total_deals, 0))} />
              <KpiCard label="Avg attach (top 10)" value={`${(
                report.leaderboard.slice(0, 10).reduce((sum, row) => sum + row.attach_rate, 0) /
                Math.min(10, report.leaderboard.length)
              ).toFixed(1)}%`} />
            </section>
          ) : null}

          <section className="sales-section">
            <SalesTeamTrendChart data={report.monthlyTrends} names={report.topNames} />
          </section>

          <div className="table-card">
            <h3>Leaderboard</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Salesperson</th>
                    <th>Total</th>
                    <th>New</th>
                    <th>Used</th>
                    <th>Contracts</th>
                    <th>Attach %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.leaderboard.map((row, index) => (
                    <tr key={row.name}>
                      <td>{index + 1}</td>
                      <td>{row.name}</td>
                      <td>{formatNumber(row.total_deals)}</td>
                      <td>{formatNumber(row.new_deals)}</td>
                      <td>{formatNumber(row.used_deals)}</td>
                      <td>{formatNumber(row.deals_with_contracts)}</td>
                      <td>{row.attach_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
