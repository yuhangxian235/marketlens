// Polymarket market model
export interface PolyMarket {
  marketId: string;
  question: string;
  slug: string;
  conditionId: string;
  outcomes: OutcomeDef[];
  tokenIds: string[];
  outcomePrices: string[];
  volume: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  acceptingOrders: boolean;
  resolved: boolean;
  endDate: string | null;
  negRisk: boolean;
  negRiskMarketId: string | null;
  tags: string[];
}
export interface OutcomeDef {
  label: string;
  tokenId: string;
  price: number;
}
