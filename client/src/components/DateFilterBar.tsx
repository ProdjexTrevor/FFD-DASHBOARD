import { DATE_PRESET_OPTIONS, formatDateRangeLabel, resolveDateRange, type DateFilterState } from "../lib/dateFilter";

export function DateFilterBar({
  filter,
  onChange,
}: {
  filter: DateFilterState;
  onChange: (next: DateFilterState) => void;
}) {
  const activeRange = resolveDateRange(filter);

  return (
    <div className="date-filter-bar">
      <div className="date-filter-main">
        <label>
          Date range
          <select
            value={filter.preset}
            onChange={(event) =>
              onChange({
                ...filter,
                preset: event.target.value as DateFilterState["preset"],
              })
            }
          >
            {DATE_PRESET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {filter.preset === "custom" ? (
          <>
            <label>
              From
              <input
                type="date"
                value={filter.customStart}
                onChange={(event) => onChange({ ...filter, customStart: event.target.value })}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={filter.customEnd}
                onChange={(event) => onChange({ ...filter, customEnd: event.target.value })}
              />
            </label>
          </>
        ) : null}
      </div>

      <span className="date-filter-label">{formatDateRangeLabel(activeRange)}</span>
    </div>
  );
}
