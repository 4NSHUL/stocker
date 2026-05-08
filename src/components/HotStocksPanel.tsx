"use client";

import { Flame, Search } from "lucide-react";
import { WATCHLIST } from "../data/markets";
import type { StockSuggestion } from "../types";

interface HotStocksPanelProps {
  activeSymbol?: string;
  onPick: (stock: StockSuggestion) => void;
}

export default function HotStocksPanel({ activeSymbol, onPick }: HotStocksPanelProps) {
  return (
    <aside className="side-panel" aria-label="Hot stocks">
      <div className="panel-heading">
        <span className="icon-token">
          <Flame aria-hidden="true" size={16} />
        </span>
        <div>
          <p className="eyebrow">Hot watchlist</p>
          <h2>Quick search</h2>
        </div>
      </div>

      <div className="hot-list">
        {WATCHLIST.map((stock) => (
          <button
            className={stock.symbol === activeSymbol ? "hot-stock hot-stock--active" : "hot-stock"}
            key={stock.symbol}
            onClick={() => onPick(stock)}
            type="button"
          >
            <span>
              <strong>{stock.symbol}</strong>
              <small>{stock.name}</small>
            </span>
            <Search aria-hidden="true" size={16} />
          </button>
        ))}
      </div>
    </aside>
  );
}
