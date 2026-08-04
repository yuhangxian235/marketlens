// CLOB public client — orderbook snapshots
import type { OrderbookSnapshot } from "../models/orderbook";
import booksFixture from "../fixtures/orderbooks.json" with { type: "json" };

export class ClobPublicClient {
  constructor(private _baseUrl = "https://clob.polymarket.com") {}

  async getBook(tokenId: string): Promise<OrderbookSnapshot | null> {
    return (booksFixture as Record<string,OrderbookSnapshot>)[tokenId] ?? null;
  }
  async getBooks(tokenIds: string[]): Promise<Map<string,OrderbookSnapshot>> {
    const m = new Map<string,OrderbookSnapshot>();
    for (const id of tokenIds) {
      const b = await this.getBook(id);
      if (b) m.set(id, b);
    }
    return m;
  }
}
