import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { VscReinsuranceReport, VscReinsuranceRow } from "../types";

const EXPORT_COLUMNS: Array<{ key: keyof VscReinsuranceRow; label: string }> = [
  { key: "fdd_dealer_number", label: "FDD Dealer #" },
  { key: "fdd_contract_number", label: "FDD Contract #" },
  { key: "customer_first_name", label: "Customer First" },
  { key: "customer_last_name", label: "Customer Last" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "year", label: "Year" },
  { key: "vin", label: "VIN" },
  { key: "odometer_on_sale", label: "Odometer on Sale" },
  { key: "new_used", label: "New/Used" },
  { key: "term_months", label: "Term (months)" },
  { key: "coverage", label: "Coverage" },
  { key: "mileage_selected", label: "Mileage Selected" },
  { key: "deductible_tier", label: "Deductible" },
  { key: "effective_sale_date", label: "Effective Sale Date" },
  { key: "agreement_price", label: "Agreement Price" },
  { key: "total_fees_all_adds", label: "Total Fees All Adds" },
  { key: "amount_paid_to_administrator", label: "Amount Paid to Administrator" },
  { key: "estimated_admin_fees", label: "Estimated Admin Fees" },
  { key: "amount_ceded_to_reins", label: "Amount Ceded to Reins" },
  { key: "term_years", label: "Term Years" },
  { key: "interest_income", label: "Interest Income (4.10%)" },
  { key: "reins_profit_share", label: "Reins Profit (25%)" },
  { key: "total_reins_projected", label: "Total Reins Projected" },
  { key: "dealer_vsc_profit", label: "Dealer VSC Profit" },
  { key: "projected_income", label: "Projected Income" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatCellValue(row: VscReinsuranceRow, key: keyof VscReinsuranceRow) {
  const value = row[key];

  if (key === "effective_sale_date" || key === "deal_date") {
    return formatDate(String(value ?? ""));
  }

  if (typeof value === "number") {
    if (key === "odometer_on_sale" || key === "mileage_selected" || key === "term_years" || key === "term_months") {
      return String(value);
    }
    return value.toFixed(2);
  }

  return value == null ? "" : String(value);
}

function buildFilename(report: VscReinsuranceReport, extension: string) {
  const dealer = report.fddDealerNumber || `tenant-${report.tenantId}`;
  const start = report.period.startDate ?? "all";
  const end = report.period.endDate ?? "time";
  return `vsc-sales-reinsurance-${dealer}-${start}-to-${end}.${extension}`;
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportVscReportCsv(report: VscReinsuranceReport) {
  const headerLines = [
    `Dealership,${report.dealershipName ?? ""}`,
    `FDD Dealer #,${report.fddDealerNumber ?? ""}`,
    `Report Number,${report.reportNumber}`,
    `Beginning Reporting Period,${report.period.startDate ?? ""}`,
    `Ending Reporting Period,${report.period.endDate ?? ""}`,
    "",
  ];

  const headers = EXPORT_COLUMNS.map((column) => column.label);
  const lines = [
    ...headerLines,
    headers.join(","),
    ...report.rows.map((row) =>
      EXPORT_COLUMNS.map((column) => escapeCsv(formatCellValue(row, column.key))).join(",")
    ),
    "",
    [
      "Totals",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      report.summary.total_agreement_price.toFixed(2),
      report.summary.total_fees_all_adds.toFixed(2),
      report.summary.total_amount_paid_to_administrator.toFixed(2),
      "",
      report.summary.total_amount_ceded_to_reins.toFixed(2),
      "",
      report.summary.total_interest_income.toFixed(2),
      "",
      report.summary.total_reins_projected.toFixed(2),
      report.summary.total_dealer_vsc_profit.toFixed(2),
      report.summary.total_projected_income.toFixed(2),
    ].join(","),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildFilename(report, "csv");
  link.click();
  URL.revokeObjectURL(url);
}

export function exportVscReportPdf(report: VscReinsuranceReport) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  doc.setFontSize(14);
  doc.text("VSC Sales and Reinsurance Reporting", 40, 36);
  doc.setFontSize(10);
  doc.text(`Dealership: ${report.dealershipName ?? ""}`, 40, 54);
  doc.text(`FDD Dealer #: ${report.fddDealerNumber ?? ""}`, 40, 68);
  doc.text(`Period: ${report.period.startDate ?? "All"} to ${report.period.endDate ?? "All"}`, 40, 82);
  doc.text(`Contracts: ${report.summary.total_contracts}`, 40, 96);

  autoTable(doc, {
    startY: 110,
    head: [EXPORT_COLUMNS.map((column) => column.label)],
    body: report.rows.map((row) => EXPORT_COLUMNS.map((column) => formatCellValue(row, column.key))),
    styles: { fontSize: 6, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42] },
    margin: { left: 20, right: 20 },
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 110;
  doc.setFontSize(9);
  doc.text(
    `Totals — Agreement: $${report.summary.total_agreement_price.toFixed(2)} | Reins Projected: $${report.summary.total_reins_projected.toFixed(2)} | Dealer Profit: $${report.summary.total_dealer_vsc_profit.toFixed(2)} | Projected Income: $${report.summary.total_projected_income.toFixed(2)}`,
    40,
    finalY + 24
  );

  doc.save(buildFilename(report, "pdf"));
}

export { EXPORT_COLUMNS, formatCellValue, formatDate };
