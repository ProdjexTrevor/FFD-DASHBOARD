import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "../components/Charts";
import { useDateFilter } from "../context/DateFilterContext";
import { fetchDealershipCompareReport } from "../lib/api";
import type { DealershipCompareRow } from "../types";

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function DealershipComparePage() {
  const { activeRange, rangeLabel } = useDateFilter();
  const [rows, setRows] = useState<DealershipCompareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchDealershipCompareReport(activeRange)
      .then(setRows)
      .catch((err) => {
        const status = err.response?.status;
        const detail = err.response?.data?.error;
        if (status === 500) {
          setError(detail ?? "Comparison failed. Try a shorter date range.");
        } else {
          setError(detail ?? err.message);
        }
      })
      .finally(() => setLoading(false));
  }, [activeRange]);

  const totalDeals = rows.reduce((sum, row) => sum + row.total_deals, 0);
  const avgAttach = rows.length
    ? (rows.reduce((sum, row) => sum + row.attach_rate, 0) / rows.length).toFixed(1)
    : "0.0";

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Network</p>
          <h1>Dealership compare</h1>
          <p className="subtitle">All active tenants · {rangeLabel}</p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="loading">Loading comparison...</div> : null}

      {!loading && rows.length > 0 ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="Dealerships" value={rows.length} />
            <KpiCard label="Network deals" value={formatNumber(totalDeals)} hint={rangeLabel} />
            <KpiCard label="Avg attach rate" value={`${avgAttach}%`} />
          </section>

          <div className="chart-card compare-chart">
            <h3>Deal volume by dealership</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="new_deals" name="New" stackId="deals">
                  {rows.map((row) => (
                    <Cell key={`new-${row.id}`} fill={row.primary_color ?? "#2563eb"} />
                  ))}
                </Bar>
                <Bar dataKey="used_deals" name="Used" stackId="deals" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="table-card">
            <h3>Comparison table</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Dealership</th>
                    <th>Deals</th>
                    <th>New</th>
                    <th>Used</th>
                    <th>Customers</th>
                    <th>Contracts</th>
                    <th>Attach %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="compare-dot" style={{ backgroundColor: row.primary_color }} />
                        {row.name}
                      </td>
                      <td>{formatNumber(row.total_deals)}</td>
                      <td>{formatNumber(row.new_deals)}</td>
                      <td>{formatNumber(row.used_deals)}</td>
                      <td>{formatNumber(row.unique_customers)}</td>
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
