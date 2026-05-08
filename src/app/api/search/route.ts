import { NextResponse } from "next/server";
import { searchWatchlist, WATCHLIST } from "../../../data/markets";
import { searchYahoo } from "../../../lib/yahoo";
import type { StockSuggestion } from "../../../types";

function dedupeSuggestions(suggestions: StockSuggestion[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const key = suggestion.symbol.toUpperCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({
      suggestions: WATCHLIST.slice(0, 8)
    });
  }

  const localMatches = searchWatchlist(query, 6);

  try {
    const yahooMatches = await searchYahoo(query);

    return NextResponse.json({
      suggestions: dedupeSuggestions([...localMatches, ...yahooMatches]).slice(0, 12)
    });
  } catch (error) {
    return NextResponse.json(
      {
        suggestions: localMatches,
        warning: error instanceof Error ? error.message : "Search provider unavailable."
      },
      {
        status: localMatches.length > 0 ? 200 : 502
      }
    );
  }
}
