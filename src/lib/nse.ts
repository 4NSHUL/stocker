import type { NiftySwingPick, NiftySwingScan } from "../types";

interface NseIndexStock {
  symbol?: string;
  lastPrice?: number;
  pChange?: number;
  totalTradedValue?: number;
  nearWKH?: number;
  nearWKL?: number;
  perChange365d?: number;
  perChange30d?: number;
  meta?: {
    companyName?: string;
    industry?: string;
  };
}

interface NseIndexResponse {
  name?: string;
  advance?: {
    declines?: string;
    advances?: string;
    unchanged?: string;
  };
  timestamp?: string;
  data?: NseIndexStock[];
}

const nseHeaders = {
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/market-data/live-equity-market?symbol=NIFTY%20100",
  "User-Agent": "Mozilla/5.0 Stocker/1.0"
};

function numberOrZero(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseCount(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "0", 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function scoreRange(value: number, ranges: Array<[boolean, number]>) {
  const match = ranges.find(([condition]) => condition);

  return match?.[1] ?? 0;
}

function compactReasons(reasons: Array<string | false>) {
  return reasons.filter((reason): reason is string => Boolean(reason));
}

function setupLabel(oneMonthReturn: number, dayChangePercent: number, nearYearHighPercent: number) {
  if (nearYearHighPercent <= 8 && oneMonthReturn >= 6) {
    return "Breakout momentum";
  }

  if (dayChangePercent <= 0.8 && dayChangePercent >= -1.8 && oneMonthReturn >= 4) {
    return "Pullback in uptrend";
  }

  if (oneMonthReturn >= 10) {
    return "Momentum continuation";
  }

  return "Early swing watch";
}

function scoreSwingPick(stock: NseIndexStock): Omit<NiftySwingPick, "rank"> | null {
  const symbol = stock.symbol ?? "";

  if (!symbol || symbol === "NIFTY 100") {
    return null;
  }

  const lastPrice = numberOrZero(stock.lastPrice);
  const dayChangePercent = numberOrZero(stock.pChange);
  const oneMonthReturn = numberOrZero(stock.perChange30d);
  const oneYearReturn = numberOrZero(stock.perChange365d);
  const nearYearHighPercent = numberOrZero(stock.nearWKH);
  const tradedValueCr = numberOrZero(stock.totalTradedValue) / 10_000_000;
  const isOverextended = oneMonthReturn > 35 || (oneMonthReturn > 24 && dayChangePercent > 4);
  const isWeakTrend = oneMonthReturn < 2 || oneYearReturn < -20;

  const score =
    34 +
    scoreRange(oneMonthReturn, [
      [oneMonthReturn >= 8 && oneMonthReturn <= 24, 26],
      [oneMonthReturn >= 4 && oneMonthReturn < 8, 18],
      [oneMonthReturn > 24 && oneMonthReturn <= 35, 12],
      [oneMonthReturn > 35, -12],
      [oneMonthReturn > 0 && oneMonthReturn < 4, 6],
      [oneMonthReturn <= 0, -14]
    ]) +
    scoreRange(dayChangePercent, [
      [dayChangePercent >= -1.2 && dayChangePercent <= 2.8, 16],
      [dayChangePercent > 2.8 && dayChangePercent <= 5, 10],
      [dayChangePercent < -1.2 && dayChangePercent >= -3, 4],
      [dayChangePercent > 5, -8],
      [dayChangePercent < -3, -12]
    ]) +
    scoreRange(oneYearReturn, [
      [oneYearReturn >= 12, 12],
      [oneYearReturn >= 0 && oneYearReturn < 12, 7],
      [oneYearReturn < 0 && oneYearReturn >= -12, -3],
      [oneYearReturn < -12, -10]
    ]) +
    scoreRange(nearYearHighPercent, [
      [nearYearHighPercent <= 8, 12],
      [nearYearHighPercent > 8 && nearYearHighPercent <= 18, 8],
      [nearYearHighPercent > 18 && nearYearHighPercent <= 32, 2],
      [nearYearHighPercent > 32, -8]
    ]) +
    scoreRange(tradedValueCr, [
      [tradedValueCr >= 800, 8],
      [tradedValueCr >= 250 && tradedValueCr < 800, 5],
      [tradedValueCr >= 100 && tradedValueCr < 250, 2],
      [tradedValueCr < 100, -3]
    ]) +
    (isOverextended ? -10 : 0);

  const finalScore = Math.round(clamp(score, 0, 100));

  if (finalScore < 72 || isWeakTrend) {
    return null;
  }

  return {
    symbol,
    yahooSymbol: `${symbol}.NS`,
    companyName: stock.meta?.companyName ?? symbol,
    industry: stock.meta?.industry,
    lastPrice,
    dayChangePercent,
    oneMonthReturn,
    oneYearReturn,
    nearYearHighPercent,
    tradedValueCr: Math.round(tradedValueCr * 10) / 10,
    score: finalScore,
    setup: setupLabel(oneMonthReturn, dayChangePercent, nearYearHighPercent),
    reasons: compactReasons([
      oneMonthReturn >= 8 && oneMonthReturn <= 24 && `Healthy 30D momentum at ${oneMonthReturn.toFixed(2)}%.`,
      oneMonthReturn > 24 && oneMonthReturn <= 35 && `Strong 30D move at ${oneMonthReturn.toFixed(2)}%.`,
      dayChangePercent >= -1.2 && dayChangePercent <= 2.8 && "Today is still in a tradable entry zone.",
      nearYearHighPercent <= 12 && "Price is close to 52-week leadership zone.",
      oneYearReturn >= 0 && "Longer trend is not negative.",
      tradedValueCr >= 250 && "Liquidity is strong enough for cleaner swing entries."
    ]).slice(0, 4),
    risks: compactReasons([
      oneMonthReturn > 24 && "Move is already extended; use staged entry or wait for pullback.",
      dayChangePercent > 3 && "Intraday move is hot; avoid chasing a vertical candle.",
      nearYearHighPercent <= 3 && "Very close to 52-week high; breakout failure risk is higher.",
      oneYearReturn < 0 && "One-year trend is still negative."
    ]).slice(0, 3)
  };
}

async function fetchNifty100FromNse() {
  const url = "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20100";
  let response = await fetch(url, {
    cache: "no-store",
    headers: nseHeaders
  });

  if (response.status === 401 || response.status === 403) {
    const homeResponse = await fetch("https://www.nseindia.com/", {
      cache: "no-store",
      headers: nseHeaders
    });
    const cookie = homeResponse.headers.get("set-cookie");

    response = await fetch(url, {
      cache: "no-store",
      headers: {
        ...nseHeaders,
        ...(cookie ? { Cookie: cookie } : {})
      }
    });
  }

  if (!response.ok) {
    throw new Error(`NSE Nifty 100 request failed with ${response.status}.`);
  }

  return (await response.json()) as NseIndexResponse;
}

export async function buildNiftySwingScan(): Promise<NiftySwingScan> {
  const data = await fetchNifty100FromNse();
  const stocks = (data.data ?? []).filter((stock) => stock.symbol && stock.symbol !== "NIFTY 100");
  const picks = stocks
    .map(scoreSwingPick)
    .filter((pick): pick is Omit<NiftySwingPick, "rank"> => Boolean(pick))
    .sort((left, right) => right.score - left.score || right.oneMonthReturn - left.oneMonthReturn)
    .map((pick, index) => ({
      rank: index + 1,
      ...pick
    }));

  return {
    indexName: data.name ?? "NIFTY 100",
    timestamp: data.timestamp ?? "Market timestamp unavailable",
    generatedAt: new Date().toISOString(),
    source: "NSE live NIFTY 100 market snapshot",
    method: "Scores all Nifty 100 constituents by 30D momentum, daily entry zone, 1Y trend, 52W leadership, liquidity, and overextension risk.",
    totalScanned: stocks.length,
    qualifiedCount: picks.length,
    marketBreadth: {
      advances: parseCount(data.advance?.advances),
      declines: parseCount(data.advance?.declines),
      unchanged: parseCount(data.advance?.unchanged)
    },
    picks
  };
}

export const testExports = {
  scoreSwingPick
};
