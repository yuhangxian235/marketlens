// CLOB orderbook model
export interface OrderbookSnapshot {
  tokenId: string;
  conditionId: string;
  outcome: string;
  timestamp: number;
  capturedAt: string;
  bids: BookLevel[];
  asks: BookLevel[];
  tickSize: string;
  minOrderSize: string;
  negRisk: boolean;
  bookHash: string;
  responseSha256: string;
}
export interface BookLevel {
  price: string;  // cents, as string for precision
  size: string;   // shares, as string for precision
}
