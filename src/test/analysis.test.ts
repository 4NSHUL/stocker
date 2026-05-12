import { describe, expect, it } from "vitest";
import { analyzeCandles } from "../lib/analysis";
import type { Candle } from "../types";

function candles(count: number, stepSeconds: number, startPrice = 100, dailyStep = 0.55): Candle[] {
  const start = Date.UTC(2021, 0, 1) / 1000;

  return Array.from({ length: count }, (_, index) => {
    const close = startPrice + index * dailyStep;
    const open = close - 0.22;

    return {
      timestamp: start + index * stepSeconds,
      date: new Date((start + index * stepSeconds) * 1000).toISOString().slice(0, 10),
      open,
      high: close + 1.1,
      low: open - 1.05,
      close,
      volume: 1_000_000 + index * 2_500
    };
  });
}

describe("analyzeCandles", () => {
  it("scores a persistent uptrend as investable from both horizons", () => {
    const result = analyzeCandles(candles(252, 24 * 60 * 60), candles(260, 7 * 24 * 60 * 60));

    expect(result.metrics.sma20).toBeGreaterThan(result.metrics.sma50 ?? 0);
    expect(result.metrics.sma50).toBeGreaterThan(result.metrics.sma200 ?? 0);
    expect(result.swing.score).toBeGreaterThanOrEqual(65);
    expect(result.longTerm.score).toBeGreaterThanOrEqual(70);
    expect(result.patterns.some((pattern) => pattern.name === "Bullish continuation")).toBe(true);
    expect(result.levels.supports).toHaveLength(3);
    expect(result.levels.resistances).toHaveLength(3);
    expect(result.levels.supports.every((level) => level.level < result.metrics.latestClose)).toBe(true);
    expect(result.levels.resistances.every((level) => level.level > result.metrics.latestClose)).toBe(true);
  });
});
