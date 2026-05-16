"use client";

import { BarChart3, RefreshCw, Target, TrendingUp } from "lucide-react";
import type { NiftySwingScan } from "../types";

interface NiftySwingPicksPanelProps {
  error: string | null;
  loading: boolean;
  scan: NiftySwingScan | null;
  onAnalyze: (symbol: string) => void;
  onRefresh: () => void;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
}

export default function NiftySwingPicksPanel({
  error,
  loading,
  scan,
  onAnalyze,
  onRefresh
}: NiftySwingPicksPanelProps) {
  return (
    <section className="swing-scan">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Today&apos;s scan</p>
          <h2>Nifty 100 swing buys</h2>
        </div>
        <button className="refresh-button" disabled={loading} onClick={onRefresh} type="button">
          <RefreshCw aria-hidden="true" size={15} />
          {loading ? "Scanning" : "Refresh"}
        </button>
      </div>

      <div className="scan-summary">
        <div>
          <Target aria-hidden="true" size={17} />
          <strong>{scan ? scan.qualifiedCount : 0}</strong>
          <span>good-buy candidates</span>
        </div>
        <div>
          <BarChart3 aria-hidden="true" size={17} />
          <strong>{scan ? scan.totalScanned : 100}</strong>
          <span>Nifty 100 stocks scanned</span>
        </div>
        <div>
          <TrendingUp aria-hidden="true" size={17} />
          <strong>
            {scan ? `${scan.marketBreadth.advances}/${scan.marketBreadth.declines}` : "NA"}
          </strong>
          <span>advance/decline</span>
        </div>
      </div>

      {error ? (
        <div className="scan-error" role="alert">
          {error}
        </div>
      ) : null}

      {scan ? (
        <>
          <div className="scan-meta">
            <span>{scan.source}</span>
            <span>{scan.timestamp}</span>
          </div>

          <div className="pick-list">
            {scan.picks.length > 0 ? (
              scan.picks.map((pick) => (
                <article className="pick-card" key={pick.symbol}>
                  <div className="pick-card__top">
                    <div>
                      <span className="rank-pill">#{pick.rank}</span>
                      <h3>{pick.symbol}</h3>
                      <p>{pick.companyName}</p>
                    </div>
                    <div className="score-chip">{pick.score}</div>
                  </div>

                  <div className="pick-metrics">
                    <span>Today {formatPercent(pick.dayChangePercent)}</span>
                    <span>30D {formatPercent(pick.oneMonthReturn)}</span>
                    <span>1Y {formatPercent(pick.oneYearReturn)}</span>
                    <span>{pick.nearYearHighPercent.toFixed(1)}% from high</span>
                  </div>

                  <div className="setup-row">
                    <strong>{pick.setup}</strong>
                    <span>INR {formatPrice(pick.lastPrice)}</span>
                  </div>

                  <ul className="pick-reasons">
                    {pick.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>

                  {pick.risks.length > 0 ? (
                    <p className="risk-note">{pick.risks.join(" ")}</p>
                  ) : null}

                  <button onClick={() => onAnalyze(pick.yahooSymbol)} type="button">
                    Open full analysis
                  </button>
                </article>
              ))
            ) : (
              <div className="empty-picks">
                No Nifty 100 stock passed the swing-buy threshold right now.
              </div>
            )}
          </div>

          <p className="method-note">{scan.method}</p>
        </>
      ) : (
        <div className="empty-picks">{loading ? "Scanning live Nifty 100 data..." : "Scan not loaded yet."}</div>
      )}
    </section>
  );
}
