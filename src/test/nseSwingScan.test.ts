import { describe, expect, it } from "vitest";
import { testExports } from "../lib/nse";

describe("scoreSwingPick", () => {
  it("qualifies a liquid Nifty 100 momentum setup", () => {
    const pick = testExports.scoreSwingPick({
      symbol: "ADANIGREEN",
      lastPrice: 1000,
      pChange: 1.4,
      perChange30d: 18,
      perChange365d: 22,
      nearWKH: 7,
      totalTradedValue: 12_000_000_000,
      meta: {
        companyName: "Adani Green Energy Limited",
        industry: "Power"
      }
    });

    expect(pick).not.toBeNull();
    expect(pick?.score).toBeGreaterThanOrEqual(72);
    expect(pick?.setup).toBe("Breakout momentum");
    expect(pick?.reasons.length).toBeGreaterThan(0);
  });

  it("rejects an overextended vertical move", () => {
    const pick = testExports.scoreSwingPick({
      symbol: "HOTMOVE",
      lastPrice: 1000,
      pChange: 7,
      perChange30d: 48,
      perChange365d: 80,
      nearWKH: 1,
      totalTradedValue: 12_000_000_000
    });

    expect(pick).toBeNull();
  });
});
