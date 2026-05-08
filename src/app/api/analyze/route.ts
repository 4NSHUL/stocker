import { NextResponse } from "next/server";
import { analyzeYahooSymbol } from "../../../lib/yahoo";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.trim();

  if (!symbol) {
    return NextResponse.json(
      {
        error: "Missing symbol."
      },
      {
        status: 400
      }
    );
  }

  try {
    const analysis = await analyzeYahooSymbol(symbol);

    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to analyze this stock.",
        detail: error instanceof Error ? error.message : "Unknown market-data error."
      },
      {
        status: 502
      }
    );
  }
}
