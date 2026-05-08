import type { Candle, PatternSignal } from "../types";

interface CandlestickChartProps {
  candles: Candle[];
  currency?: string;
  patterns: PatternSignal[];
  title: string;
}

function yFor(value: number, min: number, max: number, height: number, topPadding: number) {
  const range = max - min || 1;

  return topPadding + (1 - (value - min) / range) * height;
}

function formatPrice(value: number, currency?: string) {
  return `${currency ? `${currency} ` : ""}${value.toLocaleString(undefined, {
    maximumFractionDigits: value > 100 ? 0 : 2
  })}`;
}

export default function CandlestickChart({ candles, currency, patterns, title }: CandlestickChartProps) {
  if (candles.length === 0) {
    return (
      <section className="chart-panel">
        <p>No candle data available.</p>
      </section>
    );
  }

  const width = 820;
  const height = 380;
  const leftPadding = 54;
  const rightPadding = 70;
  const topPadding = 42;
  const bottomPadding = 46;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;
  const lows = candles.map((candle) => candle.low);
  const highs = candles.map((candle) => candle.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const step = chartWidth / candles.length;
  const candleWidth = Math.max(2, Math.min(7, step * 0.62));
  const latest = candles.at(-1)!;
  const first = candles[0];
  const primaryPattern = patterns[0];
  const gridValues = [max, min + (max - min) * 0.66, min + (max - min) * 0.33, min];
  const latestX = leftPadding + (candles.length - 0.5) * step;
  const latestY = yFor(latest.close, min, max, chartHeight, topPadding);

  return (
    <section className="chart-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Candlestick chart</p>
          <h2>{title}</h2>
        </div>
        <div className="chart-dates">
          {first.date} to {latest.date}
        </div>
      </div>

      <svg className="candle-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
        <title>{title}</title>
        <rect className="chart-bg" height={height} rx="18" width={width} x="0" y="0" />

        {gridValues.map((value) => {
          const y = yFor(value, min, max, chartHeight, topPadding);

          return (
            <g key={value}>
              <line className="grid-line" x1={leftPadding} x2={width - rightPadding} y1={y} y2={y} />
              <text className="axis-label" x={width - rightPadding + 12} y={y + 4}>
                {formatPrice(value, currency)}
              </text>
            </g>
          );
        })}

        {candles.map((candle, index) => {
          const x = leftPadding + index * step + step / 2;
          const openY = yFor(candle.open, min, max, chartHeight, topPadding);
          const closeY = yFor(candle.close, min, max, chartHeight, topPadding);
          const highY = yFor(candle.high, min, max, chartHeight, topPadding);
          const lowY = yFor(candle.low, min, max, chartHeight, topPadding);
          const isUp = candle.close >= candle.open;
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));

          return (
            <g className={isUp ? "candle candle--up" : "candle candle--down"} key={`${candle.date}-${index}`}>
              <line x1={x} x2={x} y1={highY} y2={lowY} />
              <rect height={bodyHeight} rx="1.5" width={candleWidth} x={x - candleWidth / 2} y={bodyY} />
            </g>
          );
        })}

        {primaryPattern ? (
          <g className={`pattern-marker pattern-marker--${primaryPattern.tone}`}>
            <line x1={latestX} x2={latestX} y1={topPadding + 6} y2={chartHeight + topPadding} />
            <circle cx={latestX} cy={latestY} r="5" />
            <rect height="28" rx="14" width="184" x={Math.max(leftPadding, latestX - 178)} y="12" />
            <text x={Math.max(leftPadding + 14, latestX - 164)} y="31">
              {primaryPattern.name}
            </text>
          </g>
        ) : null}

        <text className="axis-date" x={leftPadding} y={height - 14}>
          {first.date}
        </text>
        <text className="axis-date axis-date--end" x={width - rightPadding} y={height - 14}>
          {latest.date}
        </text>
      </svg>
    </section>
  );
}
