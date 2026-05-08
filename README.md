# Stocker

Modern stock analysis dashboard for Indian and US equities.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data

- Search, quotes, and candles are fetched server-side from Yahoo Finance chart/search endpoints.
- Source buttons link to Yahoo Finance, Moneycontrol, NSE/BSE, or US-market reference pages for cross-checking.
- The app computes swing and long-term views from price action, moving averages, RSI, volume, drawdown, and pattern rules.

This is analysis tooling, not financial advice.
