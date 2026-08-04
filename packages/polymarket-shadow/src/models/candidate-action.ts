// Agent-generated candidate action
export interface CandidateAction {
  actionId: string;
  sourceAgent: string;
  createdAt: string;
  marketId: string;
  conditionId: string;
  tokenId: string;
  outcome: string;
  side: "BUY" | "SELL";
  orderType: "FOK" | "FAK" | "GTC" | "GTD";
  limitPrice: string;          // cents, string
  buyBudget?: string;          // max spend, string
  sellShares?: string;         // shares to sell, string
  maxSpend?: string;
  minReceiveShares?: string;
  minReceiveCollateral?: string;
  maxAveragePrice?: string;
  maxSlippageBps: number;
  expiration?: string;
  postOnly: boolean;
  rationale: string;
  userPolicyRef: string;
}
export type OrderSide = "BUY" | "SELL";
export type OrderType = "FOK" | "FAK" | "GTC" | "GTD";
