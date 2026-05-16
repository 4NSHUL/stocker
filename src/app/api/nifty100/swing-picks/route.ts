import { NextResponse } from "next/server";
import { buildNiftySwingScan } from "../../../../lib/nse";

export async function GET() {
  try {
    const scan = await buildNiftySwingScan();

    return NextResponse.json(scan);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to scan Nifty 100.",
        detail: error instanceof Error ? error.message : "Unknown NSE market-data error."
      },
      {
        status: 502
      }
    );
  }
}
