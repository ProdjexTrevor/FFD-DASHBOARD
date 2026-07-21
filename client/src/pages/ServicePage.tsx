import { useEffect, useState } from "react";
import { KpiCard, TopBarChart } from "../components/Charts";
import { useDateFilter } from "../context/DateFilterContext";
import { useTenant } from "../context/TenantContext";
import { fetchServiceDetails, fetchServiceReport } from "../lib/api";
import type { ServiceAppointmentRow, ServiceDetailRow, ServiceReport } from "../types";

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function ServicePage() {
  const { tenant } = useTenant();
  const { activeRange, rangeLabel } = useDateFilter();
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [selected, setSelected] = useState<ServiceAppointmentRow | null>(null);
  const [details, setDetails] = useState<ServiceDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant) return;

    setLoading(true);
    setError(null);
    setSelected(null);
    setDetails([]);

    fetchServiceReport(tenant.id, activeRange)
      .then((data) => {
        setReport(data);
        if (data.appointments[0]) {
          setSelected(data.appointments[0]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tenant, activeRange]);

  useEffect(() => {
    if (!tenant || !selected) {
      setDetails([]);
      return;
    }

    setDetailsLoading(true);
    setDetailsError(null);

    fetchServiceDetails(tenant.id, selected.id)
      .then((data) => setDetails(data.details))
      .catch((err) => setDetailsError(err.message))
      .finally(() => setDetailsLoading(false));
  }, [tenant, selected]);

  if (!tenant) return null;

  const serviceTypeChart = (report?.byServiceType ?? []).map((row) => ({
    name: row.name,
    count: row.count,
  }));

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Service</p>
          <h1>Appointments</h1>
          <p className="subtitle">
            Service appointments and line details from DealerTrack · {rangeLabel}
          </p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <div className="loading">Loading service appointments...</div> : null}

      {!loading && report ? (
        <>
          <section className="kpi-grid">
            <KpiCard label="Appointments" value={formatNumber(report.summary.appointment_count)} hint={rangeLabel} />
            <KpiCard label="Detail lines" value={formatNumber(report.summary.detail_line_count)} />
            <KpiCard label="Unique VINs" value={formatNumber(report.summary.unique_vins)} />
            <KpiCard label="Retail total" value={formatMoney(report.summary.total_retail)} />
          </section>

          <section className="chart-grid">
            <TopBarChart title="Appointments by RO status" data={report.byStatus} labelWidth={80} />
            <TopBarChart title="Detail lines by service type" data={serviceTypeChart} labelWidth={80} />
          </section>

          <div className="table-card">
            <h3>Appointments</h3>
            <p className="table-hint">Click a row to load appointment details.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Appt #</th>
                    <th>Status</th>
                    <th>Customer</th>
                    <th>Writer</th>
                    <th>Odometer</th>
                    <th>VIN</th>
                    <th>Lines</th>
                    <th>Estimate</th>
                    <th>Retail</th>
                  </tr>
                </thead>
                <tbody>
                  {report.appointments.length === 0 ? (
                    <tr>
                      <td colSpan={10}>No appointments found for this date range.</td>
                    </tr>
                  ) : (
                    report.appointments.map((row) => (
                      <tr
                        key={row.id}
                        className={selected?.id === row.id ? "table-row-selected" : "table-row-clickable"}
                        onClick={() => setSelected(row)}
                      >
                        <td>{formatDateTime(row.appointment_date_time)}</td>
                        <td>{row.appointment_number ?? "—"}</td>
                        <td>{row.ro_status ?? "—"}</td>
                        <td>{row.customer_name || row.customer_key || "—"}</td>
                        <td>{row.service_writer_id ?? "—"}</td>
                        <td>{row.odometer_in ? formatNumber(row.odometer_in) : "—"}</td>
                        <td>{row.sample_vin ?? "—"}</td>
                        <td>{formatNumber(row.line_count)}</td>
                        <td>{formatMoney(row.total_estimate)}</td>
                        <td>{formatMoney(row.retail_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="table-card">
            <h3>
              Appointment details
              {selected ? ` · #${selected.appointment_number ?? selected.id}` : ""}
            </h3>
            {detailsError ? <div className="error-banner">{detailsError}</div> : null}
            {detailsLoading ? <div className="loading">Loading appointment details...</div> : null}
            {!detailsLoading && selected ? (
              <div className="table-wrap report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>VIN</th>
                      <th>Type</th>
                      <th>Service</th>
                      <th>Op code</th>
                      <th>Tech</th>
                      <th>Pay</th>
                      <th>Hours</th>
                      <th>Qty</th>
                      <th>Part</th>
                      <th>Retail</th>
                      <th>Cost</th>
                      <th>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.length === 0 ? (
                      <tr>
                        <td colSpan={13}>No detail lines for this appointment.</td>
                      </tr>
                    ) : (
                      details.map((row) => (
                        <tr key={row.id}>
                          <td>{row.service_line_number ?? "—"}</td>
                          <td>{row.vin ?? "—"}</td>
                          <td>{row.line_type ?? "—"}</td>
                          <td>{row.service_type ?? "—"}</td>
                          <td>{row.labor_op_code ?? "—"}</td>
                          <td>{row.technician_id ?? "—"}</td>
                          <td>{row.line_payment_method ?? "—"}</td>
                          <td>{row.labor_hours}</td>
                          <td>{row.quantity}</td>
                          <td>{row.part_number ?? "—"}</td>
                          <td>{formatMoney(row.actual_retail_amount)}</td>
                          <td>{formatMoney(row.cost)}</td>
                          <td>{row.comments ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
            {!selected && !detailsLoading ? (
              <p className="table-hint">Select an appointment above to view its detail lines.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
