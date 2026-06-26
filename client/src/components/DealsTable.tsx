import type { Deal } from "../types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function DealsTable({
  deals,
  page,
  totalPages,
  onPageChange,
}: {
  deals: Deal[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="table-card">
      <div className="table-header">
        <h3>Recent deals</h3>
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Deal #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Service contracts</th>
              <th>Salesperson</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td>{deal.deal_number}</td>
                <td>{formatDate(deal.deal_date)}</td>
                <td>{deal.buyer_name || deal.customer_number}</td>
                <td>
                  {[deal.model_year, deal.make, deal.model].filter(Boolean).join(" ")}
                  <div className="subtle">{deal.vin}</div>
                </td>
                <td>
                  <span className="badge">{deal.vehicle_type_label}</span>
                  <span className="badge muted">{deal.record_type_label}</span>
                </td>
                <td>
                  {deal.service_contracts.length > 0 ? (
                    <div className="contract-list">
                      {deal.service_contracts.map((contract) => (
                        <span key={contract} className="badge contract">
                          {contract}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="subtle">None</span>
                  )}
                </td>
                <td>{deal.salesperson && deal.salesperson !== "[]" ? deal.salesperson : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
