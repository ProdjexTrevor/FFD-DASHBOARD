import { useEffect, useState } from "react";
import { KpiCard } from "../components/Charts";
import { useDateFilter } from "../context/DateFilterContext";
import { useTenant } from "../context/TenantContext";
import { fetchVscReinsuranceReport } from "../lib/api";
import { EXPORT_COLUMNS, exportVscReportCsv, exportVscReportPdf, formatCellValue } from "../lib/exportVscReport";
import type { VscReinsuranceReport } from "../types";

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function VscSalesReinsurancePage() {
  const { tenant } = useTenant();
  const { activeRange, rangeLabel } = useDateFilter();
  const [report, setReport] = useState<VscReinsuranceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    setLoading(true);
    setError(null);

    fetchVscReinsuranceReport(tenant.id, activeRange)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenant, activeRange]);

  if (!tenant) return null;

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Reporting</p>
          <h1>VSC Sales &amp; Reinsurance</h1>
          <p className="subtitle">
            DealerTrack VSC contracts with projected reinsurance income · {rangeLabel}
          </p>
        </div>
        {report ? (
          <div className="report-actions">
            <button type="button" className="report-export-btn" onClick={() => exportVscReportCsv(report)}>
              Export CSV
            </button>
            <button type="button" className="report-export-btn" onClick={() => exportVscReportPdf(report)}>
              Export PDF
            </button>
          </div>
        ) : null}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="loading">Loading VSC sales report...</div> : null}

      {!loading && report ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="VSC contracts" value={formatNumber(report.summary.total_contracts)} hint={rangeLabel} />
            <KpiCard
              label="Agreement total"
              value={formatMoney(report.summary.total_agreement_price)}
              hint={`${report.summary.priced_from_packages} priced from FDD packages`}
            />
            <KpiCard
              label="Projected income"
              value={formatMoney(report.summary.total_projected_income)}
              hint={`Reins ${formatMoney(report.summary.total_reins_projected)} + dealer ${formatMoney(report.summary.total_dealer_vsc_profit)}`}
            />
          </section>

          <div className="info-banner">
            Data sources: DealerTrack deals and service contracts (`deals`, `service_contracts`), FDD pricing
            (`package_calculations`, `warranty_packages`, tenant fee settings). Reinsurance projections use admin fee
            ${report.constants.admin_fee_estimate}, {(report.constants.reins_interest_rate * 100).toFixed(2)}% interest,
            and {(report.constants.reins_profit_pct * 100).toFixed(0)}% profit share.
            {report.summary.priced_estimated > 0
              ? ` ${report.summary.priced_estimated} contract(s) use estimated pricing where no FDD package calculation exists.`
              : ""}
          </div>

          <div className="table-card">
            <h3>VSC contract detail</h3>
            <div className="table-wrap report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    {EXPORT_COLUMNS.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr>
                      <td colSpan={EXPORT_COLUMNS.length}>No VSC contracts found for this dealership and date range.</td>
                    </tr>
                  ) : (
                    report.rows.map((row) => (
                      <tr key={`${row.vin}-${row.effective_sale_date}-${row.fdd_contract_number}`}>
                        {EXPORT_COLUMNS.map((column) => (
                          <td key={column.key}>{formatCellValue(row, column.key)}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
                {report.rows.length > 0 ? (
                  <tfoot>
                    <tr>
                      <td colSpan={15}>Totals</td>
                      <td>{report.summary.total_agreement_price.toFixed(2)}</td>
                      <td>{report.summary.total_fees_all_adds.toFixed(2)}</td>
                      <td>{report.summary.total_amount_paid_to_administrator.toFixed(2)}</td>
                      <td />
                      <td>{report.summary.total_amount_ceded_to_reins.toFixed(2)}</td>
                      <td />
                      <td>{report.summary.total_interest_income.toFixed(2)}</td>
                      <td />
                      <td>{report.summary.total_reins_projected.toFixed(2)}</td>
                      <td>{report.summary.total_dealer_vsc_profit.toFixed(2)}</td>
                      <td>{report.summary.total_projected_income.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
