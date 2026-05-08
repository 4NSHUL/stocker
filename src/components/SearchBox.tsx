"use client";

import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { StockSuggestion } from "../types";

interface SearchBoxProps {
  value: string;
  suggestions: StockSuggestion[];
  loading: boolean;
  onChange: (value: string) => void;
  onSelect: (suggestion: StockSuggestion) => void;
  onSubmit: () => void;
}

export default function SearchBox({
  value,
  suggestions,
  loading,
  onChange,
  onSelect,
  onSubmit
}: SearchBoxProps) {
  const [open, setOpen] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOpen(false);
    onSubmit();
  }

  return (
    <form className="search-box" onSubmit={handleSubmit}>
      <div className="search-field">
        <Search aria-hidden="true" size={19} />
        <input
          aria-label="Search Indian or US stock"
          autoComplete="off"
          placeholder="Search Reliance, TCS, Apple, NVDA..."
          value={value}
          onChange={(event) => {
            setOpen(true);
            onChange(event.target.value);
          }}
          onFocus={() => setOpen(true)}
        />

        {open && suggestions.length > 0 ? (
          <div className="suggestions" role="listbox">
            {suggestions.map((suggestion) => (
              <button
                aria-label={`Analyze ${suggestion.name}`}
                key={`${suggestion.symbol}-${suggestion.source}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  onSelect(suggestion);
                }}
                type="button"
              >
                <span>
                  <strong>{suggestion.symbol}</strong>
                  <small>{suggestion.name}</small>
                </span>
                <em>{suggestion.exchange ?? suggestion.region}</em>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button className="submit-button" disabled={loading || value.trim().length === 0} type="submit">
        {loading ? "Analyzing" : "Analyze"}
      </button>
    </form>
  );
}
