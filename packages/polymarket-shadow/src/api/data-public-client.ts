// Data API client — historical data (stub)
export class DataPublicClient {
  constructor(private _baseUrl = "https://data-api.polymarket.com") {}
  async getTrades(_marketId: string): Promise<unknown[]> { return []; }
}
