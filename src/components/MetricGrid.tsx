import type { AnalysisMetrics } from "../types";

interface MetricGridProps {
  currency?: string;
  metrics: AnalysisMetrics;
}

function formatValue(value: number | null, suffix = "") {
  if (value === null) {
    return "NA";
  }

  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: Math.abs(value) < 10 ? 2 : 0
  })}${suffix}`;
}

export default function MetricGrid({ currency, metrics }: MetricGridProps) {
  const currencyPrefix = currency ? `${currency} ` : "";
  const items = [
    ["Latest close", `${currencyPrefix}${formatValue(metrics.latestClose)}`],
    ["1M return", formatValue(metrics.oneMonthReturn, "%")],
    ["3M return", formatValue(metrics.threeMonthReturn, "%")],
    ["1Y return", formatValue(metrics.oneYearReturn, "%")],
    ["5Y CAGR", formatValue(metrics.fiveYearCagr, "%")],
    ["RSI 14", formatValue(metrics.rsi14)],
    ["SMA 50", `${currencyPrefix}${formatValue(metrics.sma50)}`],
    ["SMA 200", `${currencyPrefix}${formatValue(metrics.sma200)}`],
    ["Volume vs 20D", metrics.volumeRatio20 === null ? "NA" : `${formatValue(metrics.volumeRatio20)}x`],
    ["20D volatility", formatValue(metrics.annualizedVolatility20, "%")],
    ["52W high", `${currencyPrefix}${formatValue(metrics.high52Week)}`],
    ["Max drawdown", formatValue(metrics.maxDrawdown1Year, "%")]
  ];

  return (
    <section className="metric-grid" aria-label="Stock metrics">
      {items.map(([label, value]) => (
        <div className="metric" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </section>
  );
}
