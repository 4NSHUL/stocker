import { ArrowDownToLine, ArrowUpToLine } from "lucide-react";
import type { PriceLevel, SupportResistanceAnalysis } from "../types";

interface SupportResistancePanelProps {
  currency?: string;
  levels: SupportResistanceAnalysis;
}

function formatPrice(value: number, currency?: string) {
  return `${currency ? `${currency} ` : ""}${value.toLocaleString(undefined, {
    maximumFractionDigits: 2
  })}`;
}

function formatDistance(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function LevelRow({ currency, level }: { currency?: string; level: PriceLevel }) {
  return (
    <article className={`level-row level-row--${level.kind}`}>
      <div>
        <strong>{formatPrice(level.level, currency)}</strong>
        <span>{formatDistance(level.distancePercent)} from last close</span>
      </div>
      <div className="level-meta">
        <span>{level.confidence}</span>
        <span>{level.touches} touches</span>
        <span>{level.lastSeen}</span>
      </div>
    </article>
  );
}

export default function SupportResistancePanel({ currency, levels }: SupportResistancePanelProps) {
  return (
    <section className="levels-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live levels</p>
          <h2>Support and resistance</h2>
        </div>
        <span className="source-chip">{levels.source}</span>
      </div>

      <div className="levels-grid">
        <div className="level-group">
          <div className="level-group__title">
            <ArrowDownToLine aria-hidden="true" size={18} />
            <h3>Next supports</h3>
          </div>
          {(levels.supports.length > 0 ? levels.supports : []).map((level) => (
            <LevelRow currency={currency} key={`${level.kind}-${level.level}`} level={level} />
          ))}
          {levels.supports.length === 0 ? <p className="empty-levels">No nearby support found in live candles.</p> : null}
        </div>

        <div className="level-group">
          <div className="level-group__title">
            <ArrowUpToLine aria-hidden="true" size={18} />
            <h3>Next resistances</h3>
          </div>
          {(levels.resistances.length > 0 ? levels.resistances : []).map((level) => (
            <LevelRow currency={currency} key={`${level.kind}-${level.level}`} level={level} />
          ))}
          {levels.resistances.length === 0 ? (
            <p className="empty-levels">No nearby resistance found in live candles.</p>
          ) : null}
        </div>
      </div>

      <p className="method-note">{levels.method}</p>
    </section>
  );
}
