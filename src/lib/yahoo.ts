import { buildSourceLinks, getRegionFromSymbol, normalizeSymbol } from "../data/markets";
import type { Candle, StockAnalysis, StockSuggestion } from "../types";
import { analyzeCandles } from "./analysis";

interface YahooQuote {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  exchDisp?: string;
  quoteType?: string;
}

interface YahooSearchResponse {
  quotes?: YahooQuote[];
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        shortName?: string;
        longName?: string;
        currency?: string;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    };
  };
}

export class YahooDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YahooDataError";
  }
}

const yahooHeaders = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 Stocker/1.0"
};

function yahooRegion(symbol: string, exchange?: string) {
  const upperExchange = exchange?.toUpperCase() ?? "";

  if (upperExchange.includes("NSE") || upperExchange.includes("BSE") || symbol.endsWith(".NS") || symbol.endsWith(".BO")) {
    return "IN" as const;
  }

  return getRegionFromSymbol(symbol);
}

export async function searchYahoo(query: string): Promise<StockSuggestion[]> {
  const url = new URL("https://query2.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", query);
  url.searchParams.set("quotesCount", "12");
  url.searchParams.set("newsCount", "0");
  url.searchParams.set("enableFuzzyQuery", "true");
  url.searchParams.set("quotesQueryId", "tss_match_phrase_query");

  const response = await fetch(url, {
    cache: "no-store",
    headers: yahooHeaders
  });

  if (!response.ok) {
    throw new YahooDataError(`Yahoo search failed with ${response.status}.`);
  }

  const data = (await response.json()) as YahooSearchResponse;

  return (data.quotes ?? [])
    .filter((quote) => quote.symbol && quote.quoteType !== "CRYPTOCURRENCY")
    .slice(0, 12)
    .map((quote) => {
      const symbol = normalizeSymbol(quote.symbol ?? "");
      const exchange = quote.exchDisp ?? quote.exchange;

      return {
        symbol,
        name: quote.shortname ?? quote.longname ?? symbol,
        exchange,
        region: yahooRegion(symbol, exchange),
        quoteType: quote.quoteType,
        source: "yahoo" as const
      };
    });
}

function symbolCandidates(symbol: string) {
  const normalized = normalizeSymbol(symbol);

  if (!normalized) {
    return [];
  }

  if (normalized.endsWith(".NS") || normalized.endsWith(".BO")) {
    return [normalized];
  }

  return [normalized, `${normalized}.NS`, `${normalized}.BO`];
}

async function fetchCandles(symbol: string, range: "1y" | "5y", interval: "1d" | "1wk") {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("range", range);
  url.searchParams.set("interval", interval);
  url.searchParams.set("includePrePost", "false");
  url.searchParams.set("events", "div,splits");

  const response = await fetch(url, {
    cache: "no-store",
    headers: yahooHeaders
  });

  if (!response.ok) {
    throw new YahooDataError(`Yahoo chart failed with ${response.status}.`);
  }

  const data = (await response.json()) as YahooChartResponse;
  const error = data.chart?.error;

  if (error) {
    throw new YahooDataError(error.description ?? error.code ?? "Yahoo chart returned an error.");
  }

  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const quote = result?.indicators?.quote?.[0];

  if (!result || !quote || timestamps.length === 0) {
    throw new YahooDataError("Yahoo chart returned no candles.");
  }

  const candles: Candle[] = timestamps
    .map((timestamp, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index] ?? 0;

      if (
        typeof open !== "number" ||
        typeof high !== "number" ||
        typeof low !== "number" ||
        typeof close !== "number" ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        return null;
      }

      return {
        timestamp,
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open,
        high,
        low,
        close,
        volume: typeof volume === "number" && Number.isFinite(volume) ? volume : 0
      };
    })
    .filter((candle): candle is Candle => Boolean(candle));

  if (candles.length === 0) {
    throw new YahooDataError("Yahoo chart returned only empty candles.");
  }

  return {
    meta: result.meta ?? {},
    candles
  };
}

export async function analyzeYahooSymbol(inputSymbol: string): Promise<StockAnalysis> {
  const candidates = symbolCandidates(inputSymbol);
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const [daily, weekly] = await Promise.all([
        fetchCandles(candidate, "1y", "1d"),
        fetchCandles(candidate, "5y", "1wk")
      ]);
      const resolvedSymbol = normalizeSymbol(daily.meta.symbol ?? candidate);
      const displayName = daily.meta.shortName ?? daily.meta.longName ?? resolvedSymbol;
      const analysis = analyzeCandles(daily.candles, weekly.candles);

      return {
        symbol: resolvedSymbol,
        displayName,
        exchange: daily.meta.fullExchangeName ?? daily.meta.exchangeName,
        region: getRegionFromSymbol(resolvedSymbol),
        currency: daily.meta.currency,
        regularMarketTime: daily.meta.regularMarketTime
          ? new Date(daily.meta.regularMarketTime * 1000).toISOString()
          : undefined,
        generatedAt: new Date().toISOString(),
        candles1y: daily.candles,
        candles5y: weekly.candles,
        sources: buildSourceLinks(resolvedSymbol, displayName),
        ...analysis
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new YahooDataError(
    lastError instanceof Error ? lastError.message : "Unable to resolve this symbol from Yahoo Finance."
  );
}
