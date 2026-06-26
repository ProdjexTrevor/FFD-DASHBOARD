import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BreakdownItem, NamedCount } from "../types";

const COLORS = ["var(--tenant-primary, #2563eb)", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2", "#4f46e5", "#65a30d"];

export function KpiCard({
  label,
  value,
  detail,
  hint,
}: {
  label: string;
  value: string | number;
  detail?: string;
  hint?: string;
}) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {detail ? <span className="kpi-detail">{detail}</span> : null}
      {hint ? <span className="kpi-hint">{hint}</span> : null}
    </div>
  );
}

export function SalesKpiCard({
  label,
  count,
  priorCount,
  changePct,
  periodLabel,
}: {
  label: string;
  count: number;
  priorCount: number;
  changePct: number;
  periodLabel: string;
}) {
  const trendClass = changePct > 0 ? "yoy-up" : changePct < 0 ? "yoy-down" : "yoy-flat";
  const trendSymbol = changePct > 0 ? "+" : "";

  return (
    <div className="kpi-card sales-kpi-card">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{new Intl.NumberFormat().format(count)}</strong>
      <div className="yoy-row">
        <span className="yoy-prior">{new Intl.NumberFormat().format(priorCount)} last year</span>
        <span className={`yoy-change ${trendClass}`}>
          {trendSymbol}
          {changePct}% {periodLabel}
        </span>
      </div>
    </div>
  );
}

export function MonthlyTrendChart({ data }: { data: Array<{ month: string; total: number; new_vehicles: number; used_vehicles: number }> }) {
  const chartData = data.slice(-18);

  return (
    <div className="chart-card">
      <h3>Deal volume by month</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="total" name="Total deals" stroke="var(--tenant-primary, #2563eb)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="new_vehicles" name="New" stroke="#059669" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="used_vehicles" name="Used" stroke="#d97706" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownPieChart({
  title,
  data,
  height = 260,
}: {
  title: string;
  data: BreakdownItem[];
  height?: number;
}) {
  const chartData = data.filter((item) => item.count > 0 && item.key_name !== "[]");

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={chartData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
            {chartData.map((entry, index) => (
              <Cell key={entry.key_name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopBarChart({
  title,
  data,
  labelWidth = 90,
}: {
  title: string;
  data: NamedCount[];
  labelWidth?: number;
}) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={labelWidth} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="var(--tenant-primary, #2563eb)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatContractLabel(name: string) {
  if (!name || name === "Other") return name;
  if (name === name.toUpperCase()) {
    return name
      .split(/\s+/)
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }
  return name;
}

export function AttachRateTrendChart({
  data,
}: {
  data: Array<{ month: string; attach_rate: number; total_deals: number }>;
}) {
  const chartData = data.slice(-18);

  return (
    <div className="chart-card">
      <h3>F&I attach rate by month</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, "auto"]} />
          <Tooltip formatter={(value, name) => (name === "attach_rate" ? [`${value}%`, "Attach rate"] : [value, name])} />
          <Line type="monotone" dataKey="attach_rate" name="Attach rate" stroke="var(--tenant-primary, #2563eb)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AttachRateBarItem {
  attach_rate: number;
  label?: string;
  name?: string;
}

export function AttachRateBarChart({
  title,
  data,
  labelKey = "label",
  labelWidth = 90,
}: {
  title: string;
  data: AttachRateBarItem[];
  labelKey?: string;
  labelWidth?: number;
}) {
  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
          <YAxis type="category" dataKey={labelKey} width={labelWidth} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => [`${value}%`, "Attach rate"]} />
          <Bar dataKey="attach_rate" fill="var(--tenant-primary, #2563eb)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesTeamTrendChart({
  data,
  names,
}: {
  data: Array<Record<string, string | number>>;
  names: string[];
}) {
  return (
    <div className="chart-card">
      <h3>Top reps — monthly volume</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {names.map((name, index) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              name={name}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServiceContractChart({ title, data }: { title: string; data: BreakdownItem[] }) {
  const chartData = data
    .filter((item) => item.count > 0 && item.key_name !== "[]")
    .map((item) => ({
      name: formatContractLabel(item.label),
      count: item.count,
    }));

  const total = chartData.reduce((sum, row) => sum + row.count, 0);
  const height = Math.max(320, chartData.length * 42 + 48);

  return (
    <div className="chart-card service-contract-chart">
      <div className="chart-card-header">
        <h3>{title}</h3>
        <span className="chart-subtitle">{new Intl.NumberFormat().format(total)} total sold</span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => new Intl.NumberFormat().format(Number(value))} />
          <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => {
              const count = Number(value);
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
              return [`${new Intl.NumberFormat().format(count)} (${pct}%)`, "Sold"];
            }}
          />
          <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
