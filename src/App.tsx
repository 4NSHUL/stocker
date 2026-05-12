"use client";

import { ExternalLink, Loader2, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CandlestickChart from "./components/CandlestickChart";
import HotStocksPanel from "./components/HotStocksPanel";
import MetricGrid from "./components/MetricGrid";
import SearchBox from "./components/SearchBox";
import SupportResistancePanel from "./components/SupportResistancePanel";
import VerdictCard from "./components/VerdictCard";
import { WATCHLIST, normalizeSymbol } from "./data/markets";
import type { AnalysisError, StockAnalysis, StockSuggestion } from "./types";

type ChartRange = "1y" | "5y";

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "NA";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatMarketTime(value?: string) {
  if (!value) {
    return "Market timestamp unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function App() {
  const [searchValue, setSearchValue] = useState(WATCHLIST[0].symbol);
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>(WATCHLIST.slice(0, 8));
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>("1y");
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (symbol: string) => {
    const normalized = normalizeSymbol(symbol);

    if (!normalized) {
      return;
    }

    setLoading(true);
    setError(null);
    setSearchValue(normalized);

    try {
      const response = await fetch(`/api/analyze?symbol=${encodeURIComponent(normalized)}`);
      const data = (await response.json()) as StockAnalysis | AnalysisError;

      if (!response.ok || "error" in data) {
        throw new Error("detail" in data && data.detail ? data.detail : "Analysis failed.");
      }

      setAnalysis(data);
      setChartRange("1y");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to analyze this stock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runAnalysis(WATCHLIST[0].symbol);
  }, [runAnalysis]);

  useEffect(() => {
    const query = searchValue.trim();

    if (query.length < 2) {
      setSuggestions(WATCHLIST.slice(0, 8));
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        const data = (await response.json()) as { suggestions?: StockSuggestion[] };

        setSuggestions(data.suggestions?.length ? data.suggestions : WATCHLIST.slice(0, 8));
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setSuggestions(WATCHLIST.slice(0, 8));
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 240);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchValue]);

  const activeCandles = chartRange === "1y" ? analysis?.candles1y : analysis?.candles5y;
  const priceMoveClass = useMemo(() => {
    const change = analysis?.metrics.dayChangePercent ?? 0;

    if (change > 0) {
      return "price-move price-move--up";
    }

    if (change < 0) {
      return "price-move price-move--down";
    }

    return "price-move";
  }, [analysis]);

  function handleSubmit() {
    const normalized = normalizeSymbol(searchValue);
    const exact = suggestions.find((suggestion) => normalizeSymbol(suggestion.symbol) === normalized);
    const target = exact?.symbol ?? suggestions[0]?.symbol ?? normalized;

    void runAnalysis(target);
  }

  function handlePick(stock: StockSuggestion) {
    setSuggestions([]);
    void runAnalysis(stock.symbol);
  }

  return (
    <main className="app-shell">
      <section className="main-panel">
        <header className="hero">
          <div>
            <p className="eyebrow">Stocker</p>
            <h1>Market Signal</h1>
          </div>
          <div className="source-pill">
            <ShieldCheck aria-hidden="true" size={17} />
            Yahoo live chart data with source cross-check links
          </div>
        </header>

        <SearchBox
          loading={loading}
          suggestions={suggestions}
          value={searchValue}
          onChange={setSearchValue}
          onSelect={handlePick}
          onSubmit={handleSubmit}
        />

        {searching ? (
          <div className="inline-status">
            <Loader2 aria-hidden="true" size={15} />
            Searching market symbols
          </div>
        ) : null}

        {error ? (
          <section className="error-panel" role="alert">
            <strong>Analysis failed</strong>
            <p>{error}</p>
          </section>
        ) : null}

        {analysis ? (
          <>
            <section className="stock-header">
              <div>
                <p className="eyebrow">{analysis.exchange ?? analysis.region}</p>
                <h2>
                  {analysis.displayName}
                  <span>{analysis.symbol}</span>
                </h2>
              </div>

              <div className="price-stack">
                <strong>
                  {analysis.currency ? `${analysis.currency} ` : ""}
                  {analysis.metrics.latestClose.toLocaleString(undefined, {
                    maximumFractionDigits: 2
                  })}
                </strong>
                <span className={priceMoveClass}>{formatPercent(analysis.metrics.dayChangePercent)}</span>
              </div>
            </section>

            <div className="meta-row">
              <span>{formatMarketTime(analysis.regularMarketTime)}</span>
              <span>Generated {formatMarketTime(analysis.generatedAt)}</span>
              <button onClick={() => runAnalysis(analysis.symbol)} type="button">
                <RefreshCw aria-hidden="true" size={15} />
                Refresh
              </button>
            </div>

            <section className="verdict-grid">
              <VerdictCard verdict={analysis.swing} />
              <VerdictCard verdict={analysis.longTerm} />
            </section>

            <section className="chart-toolbar" aria-label="Chart range">
              <div>
                <p className="eyebrow">Timeframe</p>
                <h2>Price action and patterns</h2>
              </div>
              <div className="segmented-control">
                <button
                  className={chartRange === "1y" ? "active" : ""}
                  onClick={() => setChartRange("1y")}
                  type="button"
                >
                  1Y daily
                </button>
                <button
                  className={chartRange === "5y" ? "active" : ""}
                  onClick={() => setChartRange("5y")}
                  type="button"
                >
                  5Y weekly
                </button>
              </div>
            </section>

            <CandlestickChart
              candles={activeCandles ?? []}
              currency={analysis.currency}
              patterns={analysis.patterns}
              title={`${analysis.symbol} ${chartRange === "1y" ? "last year" : "five year"} candles`}
            />

            <section className="pattern-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Detected pattern</p>
                  <h2>Rule-based chart signals</h2>
                </div>
                <TrendingUp aria-hidden="true" size={21} />
              </div>

              <div className="pattern-list">
                {analysis.patterns.map((pattern) => (
                  <article className={`pattern-card pattern-card--${pattern.tone}`} key={`${pattern.name}-${pattern.detail}`}>
                    <strong>{pattern.name}</strong>
                    <p>{pattern.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <MetricGrid currency={analysis.currency} metrics={analysis.metrics} />

            <SupportResistancePanel currency={analysis.currency} levels={analysis.levels} />

            <section className="source-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Source checks</p>
                  <h2>Validate before investing</h2>
                </div>
              </div>
              <div className="source-links">
                {analysis.sources.map((source) => (
                  <a href={source.url} key={source.label} rel="noreferrer" target="_blank">
                    {source.label}
                    <ExternalLink aria-hidden="true" size={14} />
                  </a>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="loading-panel">
            <Loader2 aria-hidden="true" size={22} />
            Preparing first analysis
          </section>
        )}
      </section>

      <HotStocksPanel activeSymbol={analysis?.symbol} onPick={handlePick} />
    </main>
  );
}
