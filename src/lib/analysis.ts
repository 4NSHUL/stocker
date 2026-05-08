import type {
  AnalysisMetrics,
  Candle,
  HorizonVerdict,
  PatternSignal,
  VerdictLabel
} from "../types";

const tradingDaysPerYear = 252;

function round(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentChange(current: number, previous: number | null | undefined) {
  if (!previous || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function valueBefore(candles: Candle[], daysAgo: number) {
  const latest = candles.at(-1);

  if (!latest) {
    return null;
  }

  const target = latest.timestamp - daysAgo * 24 * 60 * 60;
  const previous = [...candles].reverse().find((candle) => candle.timestamp <= target);

  return previous?.close ?? null;
}

function simpleMovingAverage(candles: Candle[], period: number) {
  if (candles.length < period) {
    return null;
  }

  const values = candles.slice(-period).map((candle) => candle.close);

  return average(values);
}

function historicalSimpleMovingAverage(candles: Candle[], period: number, offset: number) {
  if (candles.length < period + offset) {
    return null;
  }

  const end = candles.length - offset;
  const values = candles.slice(end - period, end).map((candle) => candle.close);

  return average(values);
}

function rsi(candles: Candle[], period = 14) {
  if (candles.length <= period) {
    return null;
  }

  const closes = candles.map((candle) => candle.close);
  const deltas = closes.slice(1).map((close, index) => close - closes[index]);
  const recent = deltas.slice(-period);
  const gains = recent.filter((delta) => delta > 0);
  const losses = recent.filter((delta) => delta < 0).map(Math.abs);
  const averageGain = average(gains) ?? 0;
  const averageLoss = average(losses) ?? 0;

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;

  return 100 - 100 / (1 + relativeStrength);
}

function volumeRatio(candles: Candle[], period = 20) {
  if (candles.length < period + 1) {
    return null;
  }

  const latestVolume = candles.at(-1)?.volume;
  const averageVolume = average(candles.slice(-period - 1, -1).map((candle) => candle.volume));

  if (!latestVolume || !averageVolume) {
    return null;
  }

  return latestVolume / averageVolume;
}

function annualizedVolatility(candles: Candle[], period = 20) {
  if (candles.length < period + 1) {
    return null;
  }

  const closes = candles.slice(-period - 1).map((candle) => candle.close);
  const returns = closes.slice(1).map((close, index) => Math.log(close / closes[index]));
  const meanReturn = average(returns);

  if (meanReturn === null) {
    return null;
  }

  const variance = average(returns.map((value) => (value - meanReturn) ** 2));

  if (variance === null) {
    return null;
  }

  return Math.sqrt(variance) * Math.sqrt(tradingDaysPerYear) * 100;
}

function highLow(candles: Candle[]) {
  if (candles.length === 0) {
    return {
      high: null,
      low: null
    };
  }

  return {
    high: Math.max(...candles.map((candle) => candle.high)),
    low: Math.min(...candles.map((candle) => candle.low))
  };
}

function maxDrawdown(candles: Candle[]) {
  let peak = -Infinity;
  let worstDrawdown = 0;

  candles.forEach((candle) => {
    peak = Math.max(peak, candle.close);

    if (peak > 0) {
      worstDrawdown = Math.min(worstDrawdown, ((candle.close - peak) / peak) * 100);
    }
  });

  return Number.isFinite(worstDrawdown) ? worstDrawdown : null;
}

function fiveYearCagr(candles5y: Candle[]) {
  const first = candles5y[0]?.close;
  const latest = candles5y.at(-1)?.close;

  if (!first || !latest || candles5y.length < 80) {
    return null;
  }

  const years = (candles5y.at(-1)!.timestamp - candles5y[0].timestamp) / (365.25 * 24 * 60 * 60);

  if (years <= 0) {
    return null;
  }

  return (latest / first) ** (1 / years) * 100 - 100;
}

function supportResistance(candles: Candle[]) {
  const recent = candles.slice(-60);

  if (recent.length === 0) {
    return {
      support: null,
      resistance: null
    };
  }

  return {
    support: Math.min(...recent.map((candle) => candle.low)),
    resistance: Math.max(...recent.map((candle) => candle.high))
  };
}

function grade(score: number): VerdictLabel {
  if (score >= 72) {
    return "Good candidate";
  }

  if (score >= 55) {
    return "Watchlist";
  }

  return "Risky";
}

function compactReasons(reasons: Array<string | null | false>) {
  return reasons.filter((reason): reason is string => Boolean(reason)).slice(0, 4);
}

function latestCandlePattern(candles: Candle[]): PatternSignal[] {
  const latest = candles.at(-1);
  const previous = candles.at(-2);

  if (!latest || !previous) {
    return [];
  }

  const body = Math.abs(latest.close - latest.open);
  const fullRange = Math.max(latest.high - latest.low, 0.01);
  const upperWick = latest.high - Math.max(latest.open, latest.close);
  const lowerWick = Math.min(latest.open, latest.close) - latest.low;
  const patterns: PatternSignal[] = [];

  if (
    latest.close > latest.open &&
    previous.close < previous.open &&
    latest.close >= previous.open &&
    latest.open <= previous.close
  ) {
    patterns.push({
      name: "Bullish engulfing",
      tone: "bullish",
      detail: "Latest candle fully recovered the prior red body."
    });
  }

  if (
    latest.close < latest.open &&
    previous.close > previous.open &&
    latest.open >= previous.close &&
    latest.close <= previous.open
  ) {
    patterns.push({
      name: "Bearish engulfing",
      tone: "bearish",
      detail: "Latest candle rejected the prior green body."
    });
  }

  if (body / fullRange < 0.18) {
    patterns.push({
      name: "Doji",
      tone: "neutral",
      detail: "Buyers and sellers closed near the same level."
    });
  }

  if (lowerWick > body * 2 && upperWick < body * 1.1) {
    patterns.push({
      name: "Hammer-style rejection",
      tone: "bullish",
      detail: "Long lower wick points to demand near intraday lows."
    });
  }

  return patterns;
}

export function analyzeCandles(candles1y: Candle[], candles5y: Candle[]) {
  const latest = candles1y.at(-1);

  if (!latest) {
    throw new Error("No candles available for analysis.");
  }

  const previousClose = candles1y.at(-2)?.close ?? null;
  const oneYearRange = candles1y.slice(-252);
  const { high, low } = highLow(oneYearRange);
  const { support, resistance } = supportResistance(candles1y);
  const sma20 = simpleMovingAverage(candles1y, 20);
  const sma50 = simpleMovingAverage(candles1y, 50);
  const sma200 = simpleMovingAverage(candles1y, 200);
  const previousSma50 = historicalSimpleMovingAverage(candles1y, 50, 20);
  const previousSma200 = historicalSimpleMovingAverage(candles1y, 200, 20);
  const oneYearReference = valueBefore(candles1y, 365) ?? candles1y[0]?.close ?? null;

  const metrics: AnalysisMetrics = {
    latestClose: round(latest.close)!,
    previousClose: round(previousClose),
    dayChange: round(previousClose ? latest.close - previousClose : null),
    dayChangePercent: round(percentChange(latest.close, previousClose)),
    weekChangePercent: round(percentChange(latest.close, valueBefore(candles1y, 7))),
    oneMonthReturn: round(percentChange(latest.close, valueBefore(candles1y, 30))),
    threeMonthReturn: round(percentChange(latest.close, valueBefore(candles1y, 91))),
    sixMonthReturn: round(percentChange(latest.close, valueBefore(candles1y, 182))),
    oneYearReturn: round(percentChange(latest.close, oneYearReference)),
    fiveYearCagr: round(fiveYearCagr(candles5y)),
    sma20: round(sma20),
    sma50: round(sma50),
    sma200: round(sma200),
    rsi14: round(rsi(candles1y)),
    volumeRatio20: round(volumeRatio(candles1y)),
    annualizedVolatility20: round(annualizedVolatility(candles1y)),
    high52Week: round(high),
    low52Week: round(low),
    maxDrawdown1Year: round(maxDrawdown(oneYearRange)),
    support: round(support),
    resistance: round(resistance)
  };

  const isAboveSma20 = Boolean(sma20 && latest.close > sma20);
  const isAboveSma50 = Boolean(sma50 && latest.close > sma50);
  const isAboveSma200 = Boolean(sma200 && latest.close > sma200);
  const hasGoldenCross = Boolean(
    sma50 && sma200 && previousSma50 && previousSma200 && sma50 > sma200 && previousSma50 <= previousSma200
  );
  const hasDeathCross = Boolean(
    sma50 && sma200 && previousSma50 && previousSma200 && sma50 < sma200 && previousSma50 >= previousSma200
  );
  const nearHigh = Boolean(high && latest.close >= high * 0.94);
  const nearSupport = Boolean(support && latest.close <= support * 1.08);
  const volumeExpansion = Boolean(metrics.volumeRatio20 && metrics.volumeRatio20 >= 1.15);
  const cleanRsi = metrics.rsi14 === null || (metrics.rsi14 >= 42 && metrics.rsi14 <= 72);
  const overbought = Boolean(metrics.rsi14 && metrics.rsi14 > 74);
  const oversold = Boolean(metrics.rsi14 && metrics.rsi14 < 34);

  const swingScore =
    42 +
    (isAboveSma20 ? 10 : -5) +
    (isAboveSma50 ? 12 : -8) +
    ((metrics.oneMonthReturn ?? 0) > 0 ? 8 : -5) +
    ((metrics.threeMonthReturn ?? 0) > 0 ? 8 : -5) +
    (cleanRsi ? 8 : -8) +
    (volumeExpansion ? 6 : 0) +
    (nearHigh ? 6 : 0) +
    (overbought ? -10 : 0) +
    (nearSupport ? -4 : 0);

  const longTermScore =
    44 +
    (isAboveSma200 ? 16 : -12) +
    (sma50 && sma200 && sma50 > sma200 ? 12 : -8) +
    ((metrics.oneYearReturn ?? 0) > 0 ? 10 : -8) +
    ((metrics.fiveYearCagr ?? 0) > 8 ? 12 : (metrics.fiveYearCagr ?? 0) > 0 ? 6 : -8) +
    ((metrics.maxDrawdown1Year ?? -100) > -30 ? 8 : -8) +
    ((metrics.annualizedVolatility20 ?? 100) < 45 ? 6 : -6) +
    (hasDeathCross ? -12 : 0) +
    (hasGoldenCross ? 6 : 0);

  const swing: HorizonVerdict = {
    horizon: "Swing",
    label: grade(Math.max(0, Math.min(100, swingScore))),
    score: Math.max(0, Math.min(100, Math.round(swingScore))),
    summary:
      swingScore >= 72
        ? "Momentum and short-term structure are supportive."
        : swingScore >= 55
          ? "Setup is workable, but confirmation matters."
          : "Short-term risk is stronger than the current reward profile.",
    positives: compactReasons([
      isAboveSma20 && "Price is above the 20-day average.",
      isAboveSma50 && "Price is above the 50-day average.",
      nearHigh && "Trading near the 52-week high.",
      volumeExpansion && "Latest volume is above the 20-day average.",
      oversold && "RSI shows a possible oversold bounce area."
    ]),
    risks: compactReasons([
      !isAboveSma20 && "Price is below the 20-day average.",
      !isAboveSma50 && "Price is below the 50-day average.",
      overbought && "RSI is stretched above 74.",
      nearSupport && "Price is close to recent support.",
      (metrics.annualizedVolatility20 ?? 0) > 55 && "Short-term volatility is elevated."
    ])
  };

  const longTerm: HorizonVerdict = {
    horizon: "Long term",
    label: grade(Math.max(0, Math.min(100, longTermScore))),
    score: Math.max(0, Math.min(100, Math.round(longTermScore))),
    summary:
      longTermScore >= 72
        ? "Trend quality supports deeper fundamental review."
        : longTermScore >= 55
          ? "Long-term picture is mixed and needs patience."
          : "Long-term trend quality is weak from price action alone.",
    positives: compactReasons([
      isAboveSma200 && "Price is above the 200-day average.",
      Boolean(sma50 && sma200 && sma50 > sma200) && "50-day average is above the 200-day average.",
      (metrics.oneYearReturn ?? 0) > 0 && "One-year return is positive.",
      (metrics.fiveYearCagr ?? 0) > 8 && "Five-year CAGR is above 8%.",
      (metrics.maxDrawdown1Year ?? -100) > -25 && "One-year drawdown has stayed controlled."
    ]),
    risks: compactReasons([
      !isAboveSma200 && "Price is below the 200-day average.",
      hasDeathCross && "Recent death-cross style moving-average risk.",
      (metrics.oneYearReturn ?? 0) < 0 && "One-year return is negative.",
      (metrics.fiveYearCagr ?? 0) < 0 && "Five-year CAGR is negative.",
      (metrics.maxDrawdown1Year ?? 0) < -35 && "One-year drawdown is deep."
    ])
  };

  const patterns: PatternSignal[] = [
    ...latestCandlePattern(candles1y),
    isAboveSma20 && isAboveSma50 && (metrics.threeMonthReturn ?? 0) > 0
      ? {
          name: "Bullish continuation",
          tone: "bullish",
          detail: "Price is above key short averages with positive 3-month momentum."
        }
      : null,
    hasGoldenCross
      ? {
          name: "Golden cross",
          tone: "bullish",
          detail: "50-day average has crossed above the 200-day average."
        }
      : null,
    hasDeathCross
      ? {
          name: "Death cross",
          tone: "bearish",
          detail: "50-day average has crossed below the 200-day average."
        }
      : null,
    nearHigh && volumeExpansion
      ? {
          name: "Breakout watch",
          tone: "bullish",
          detail: "Price is near the 52-week high with volume expansion."
        }
      : null,
    overbought
      ? {
          name: "Overbought stretch",
          tone: "bearish",
          detail: "RSI is high enough to watch for pullback risk."
        }
      : null,
    oversold
      ? {
          name: "Oversold area",
          tone: "neutral",
          detail: "RSI is low; demand confirmation is needed before acting."
        }
      : null
  ].filter((pattern): pattern is PatternSignal => Boolean(pattern));

  if (patterns.length === 0) {
    patterns.push({
      name: "No clean pattern",
      tone: "neutral",
      detail: "The latest candles do not show a high-confidence rule-based pattern."
    });
  }

  return {
    metrics,
    swing,
    longTerm,
    patterns
  };
}

export const testExports = {
  percentChange,
  simpleMovingAverage,
  rsi,
  maxDrawdown,
  fiveYearCagr
};
