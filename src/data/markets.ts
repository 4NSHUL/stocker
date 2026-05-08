import type { MarketRegion, SourceLink, StockSuggestion } from "../types";

export const WATCHLIST: StockSuggestion[] = [
  {
    symbol: "RELIANCE.NS",
    name: "Reliance Industries",
    exchange: "NSE",
    region: "IN",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Large-cap India energy, retail, and telecom bellwether"
  },
  {
    symbol: "TCS.NS",
    name: "Tata Consultancy Services",
    exchange: "NSE",
    region: "IN",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "High-quality Indian IT services leader"
  },
  {
    symbol: "HDFCBANK.NS",
    name: "HDFC Bank",
    exchange: "NSE",
    region: "IN",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "India private banking bellwether"
  },
  {
    symbol: "INFY.NS",
    name: "Infosys",
    exchange: "NSE",
    region: "IN",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Liquid IT services swing candidate"
  },
  {
    symbol: "ICICIBANK.NS",
    name: "ICICI Bank",
    exchange: "NSE",
    region: "IN",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Private bank momentum and earnings proxy"
  },
  {
    symbol: "LT.NS",
    name: "Larsen & Toubro",
    exchange: "NSE",
    region: "IN",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Infrastructure and capex cycle proxy"
  },
  {
    symbol: "BHARTIARTL.NS",
    name: "Bharti Airtel",
    exchange: "NSE",
    region: "IN",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Telecom leader with defensive growth profile"
  },
  {
    symbol: "SBIN.NS",
    name: "State Bank of India",
    exchange: "NSE",
    region: "IN",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Public-sector banking liquidity leader"
  },
  {
    symbol: "AAPL",
    name: "Apple",
    exchange: "NASDAQ",
    region: "US",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Mega-cap US quality and liquidity leader"
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    exchange: "NASDAQ",
    region: "US",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "AI and cloud compounder"
  },
  {
    symbol: "NVDA",
    name: "NVIDIA",
    exchange: "NASDAQ",
    region: "US",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "AI semiconductor momentum leader"
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    exchange: "NASDAQ",
    region: "US",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Cloud, ads, and commerce scale"
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    exchange: "NASDAQ",
    region: "US",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "Search, ads, cloud, and AI platform exposure"
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    exchange: "NASDAQ",
    region: "US",
    quoteType: "EQUITY",
    source: "watchlist",
    reason: "High-beta EV and autonomy swing candidate"
  }
];

export function getRegionFromSymbol(symbol: string): MarketRegion {
  const upperSymbol = symbol.toUpperCase();

  if (upperSymbol.endsWith(".NS") || upperSymbol.endsWith(".BO")) {
    return "IN";
  }

  if (/^[A-Z.-]{1,6}$/.test(upperSymbol)) {
    return "US";
  }

  return "GLOBAL";
}

export function baseSymbol(symbol: string) {
  return symbol.toUpperCase().replace(/\.(NS|BO)$/u, "");
}

export function normalizeSymbol(input: string) {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

export function buildSourceLinks(symbol: string, name: string): SourceLink[] {
  const normalizedSymbol = normalizeSymbol(symbol);
  const region = getRegionFromSymbol(normalizedSymbol);
  const symbolBase = baseSymbol(normalizedSymbol);
  const encodedSymbol = encodeURIComponent(normalizedSymbol);
  const encodedSearch = encodeURIComponent(name || symbolBase);
  const links: SourceLink[] = [
    {
      label: "Yahoo Finance",
      url: `https://finance.yahoo.com/quote/${encodedSymbol}`
    },
    {
      label: "Moneycontrol",
      url: `https://www.moneycontrol.com/search/?search_str=${encodedSearch}`
    }
  ];

  if (region === "IN") {
    links.push(
      {
        label: "NSE",
        url: `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbolBase)}`
      },
      {
        label: "BSE",
        url: `https://www.bseindia.com/search.aspx?q=${encodeURIComponent(symbolBase)}`
      }
    );
  } else {
    links.push(
      {
        label: "Nasdaq",
        url: `https://www.nasdaq.com/market-activity/stocks/${encodeURIComponent(symbolBase.toLowerCase())}`
      },
      {
        label: "SEC",
        url: `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(symbolBase)}`
      }
    );
  }

  return links;
}

export function fuzzyScore(query: string, candidate: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 100;
  }

  if (normalizedCandidate.startsWith(normalizedQuery)) {
    return 85;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 70;
  }

  let score = 0;
  let cursor = 0;

  for (const character of normalizedQuery) {
    const index = normalizedCandidate.indexOf(character, cursor);

    if (index === -1) {
      return 0;
    }

    score += index === cursor ? 9 : 4;
    cursor = index + 1;
  }

  return Math.min(60, score);
}

export function searchWatchlist(query: string, limit = 8) {
  return WATCHLIST.map((stock) => ({
    stock,
    score: Math.max(
      fuzzyScore(query, stock.symbol),
      fuzzyScore(query, stock.name),
      fuzzyScore(query, stock.exchange ?? "")
    )
  }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ stock }) => stock);
}
