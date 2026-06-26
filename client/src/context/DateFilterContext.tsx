import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  formatDateRangeLabel,
  resolveDateRange,
  type DateFilterState,
  type DateRange,
} from "../lib/dateFilter";

function todayInputValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

interface DateFilterContextValue {
  filter: DateFilterState;
  setFilter: (filter: DateFilterState) => void;
  activeRange: DateRange;
  rangeLabel: string;
}

const DateFilterContext = createContext<DateFilterContextValue | null>(null);

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<DateFilterState>({
    preset: "30d",
    customStart: "",
    customEnd: todayInputValue(),
  });

  const activeRange = useMemo(() => resolveDateRange(filter), [filter]);
  const rangeLabel = useMemo(() => formatDateRangeLabel(activeRange), [activeRange]);

  return (
    <DateFilterContext.Provider value={{ filter, setFilter, activeRange, rangeLabel }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error("useDateFilter must be used within DateFilterProvider");
  }
  return context;
}
