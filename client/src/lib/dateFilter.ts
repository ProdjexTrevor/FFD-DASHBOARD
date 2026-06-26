export type DatePreset = "all" | "7d" | "30d" | "90d" | "thisMonth" | "lastMonth" | "ytd" | "custom";

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface DateFilterState {
  preset: DatePreset;
  customStart: string;
  customEnd: string;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveDateRange(filter: DateFilterState): DateRange {
  const today = new Date();
  const endDate = toDateInputValue(today);

  if (filter.preset === "all") {
    return {};
  }

  if (filter.preset === "custom") {
    return {
      startDate: filter.customStart || undefined,
      endDate: filter.customEnd || undefined,
    };
  }

  const start = new Date(today);

  switch (filter.preset) {
    case "7d":
      start.setDate(start.getDate() - 6);
      return { startDate: toDateInputValue(start), endDate };
    case "30d":
      start.setDate(start.getDate() - 29);
      return { startDate: toDateInputValue(start), endDate };
    case "90d":
      start.setDate(start.getDate() - 89);
      return { startDate: toDateInputValue(start), endDate };
    case "thisMonth":
      return {
        startDate: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
        endDate,
      };
    case "lastMonth": {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: toDateInputValue(firstDayLastMonth),
        endDate: toDateInputValue(lastDayLastMonth),
      };
    }
    case "ytd":
      return {
        startDate: toDateInputValue(new Date(today.getFullYear(), 0, 1)),
        endDate,
      };
    default:
      return {};
  }
}

export function formatDateRangeLabel(range: DateRange) {
  if (!range.startDate && !range.endDate) {
    return "All time";
  }

  const format = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString();

  if (range.startDate && range.endDate) {
    return `${format(range.startDate)} – ${format(range.endDate)}`;
  }

  if (range.startDate) {
    return `From ${format(range.startDate)}`;
  }

  return `Through ${format(range.endDate!)}`;
}

export const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "ytd", label: "Year to date" },
  { value: "custom", label: "Custom range" },
];
