// Gamma API client — market discovery
// Network unreachable as of 2026-07-25. Returns committed fixtures.
import type { PolyMarket } from "../models/market";
import marketsFixture from "../fixtures/markets.json" with { type: "json" };

export class GammaClient {
  constructor(private _baseUrl = "https://gamma-api.polymarket.com") {}

  async getMarkets(): Promise<PolyMarket[]> { return marketsFixture as PolyMarket[]; }
  async getMarket(id: string): Promise<PolyMarket | null> {
    return (marketsFixture as PolyMarket[]).find(m => m.marketId === id) ?? null;
  }
}
