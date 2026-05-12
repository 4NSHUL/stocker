export type MarketRegion = "IN" | "US" | "GLOBAL";

export type VerdictLabel = "Good candidate" | "Watchlist" | "Risky";

export type PatternTone = "bullish" | "bearish" | "neutral";

export interface StockSuggestion {
  symbol: string;
  name: string;
  exchange?: string;
  region: MarketRegion;
  quoteType?: string;
  source: "watchlist" | "yahoo";
  reason?: string;
}

export interface Candle {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PatternSignal {
  name: string;
  tone: PatternTone;
  detail: string;
}

export type PriceLevelKind = "support" | "resistance";

export interface PriceLevel {
  kind: PriceLevelKind;
  level: number;
  distancePercent: number;
  touches: number;
  confidence: "High" | "Medium" | "Low";
  lastSeen: string;
  source: string;
}

export interface SupportResistanceAnalysis {
  supports: PriceLevel[];
  resistances: PriceLevel[];
  source: string;
  method: string;
}

export interface HorizonVerdict {
  horizon: "Swing" | "Long term";
  label: VerdictLabel;
  score: number;
  summary: string;
  positives: string[];
  risks: string[];
}

export interface AnalysisMetrics {
  latestClose: number;
  previousClose: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;
  weekChangePercent: number | null;
  oneMonthReturn: number | null;
  threeMonthReturn: number | null;
  sixMonthReturn: number | null;
  oneYearReturn: number | null;
  fiveYearCagr: number | null;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  volumeRatio20: number | null;
  annualizedVolatility20: number | null;
  high52Week: number | null;
  low52Week: number | null;
  maxDrawdown1Year: number | null;
  support: number | null;
  resistance: number | null;
}

export interface SourceLink {
  label: string;
  url: string;
}

export interface StockAnalysis {
  symbol: string;
  displayName: string;
  exchange?: string;
  region: MarketRegion;
  currency?: string;
  regularMarketTime?: string;
  generatedAt: string;
  candles1y: Candle[];
  candles5y: Candle[];
  metrics: AnalysisMetrics;
  patterns: PatternSignal[];
  levels: SupportResistanceAnalysis;
  swing: HorizonVerdict;
  longTerm: HorizonVerdict;
  sources: SourceLink[];
}

export interface AnalysisError {
  error: string;
  detail?: string;
}
