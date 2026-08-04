// Action-level + batch-level receipts
export interface ActionReceipt {
  receiptVersion: string;
  actionId: string;
  sourceAgent: string;
  simulationType: "POLYMARKET_ORDERBOOK_SHADOW";
  generatedAt: string;
  marketSnapshot: MarketSnapshotMeta;
  orderbookSnapshotHash: string;
  bookTimestamp: number;
  market: string;
  outcome: string;
  side: "BUY" | "SELL";
  orderType: string;
  requested: RequestedFill;
  estimatedFill: EstimatedFill;
  levelsConsumed: number;
  immediateFill: EstimatedFill;
  restingRemainder: EstimatedFill | null;
  averagePrice: string;
  worstPrice: string;
  collateralSpent: string;
  collateralReceived: string;
  sharesBought: string;
  sharesSold: string;
  slippageBps: number;
  partialFill: boolean;
  actionChecks: ActionCheckResult[];
  actionVerdict: "PASS" | "BLOCKED" | "REVIEW" | "NOT_APPLICABLE";
  verdictReason: string;
  unsigned: true;
  notSubmitted: true;
  notBroadcast: true;
  limitations: string;
  receiptHash: string;
}
export interface MarketSnapshotMeta {
  marketId: string;
  question: string;
  conditionId: string;
  capturedAt: string;
  source: "polymarket_public_gamma";
}
export interface RequestedFill {
  side: string; limitPrice: string; size: string; orderType: string;
}
export interface EstimatedFill {
  filled: boolean; filledSize: string; filledPrice: string;
  remainingSize: string; partialFill: boolean;
}
export interface ActionCheckResult {
  rule: string; expected: string; actual: string;
  status: "PASS"|"BLOCKED"|"REVIEW"|"NOT_APPLICABLE"; reason: string;
}

export interface BatchReceipt {
  batchId: string;
  policyId: string;
  policyHash: string;
  generatedAt: string;
  snapshotCapturedAt: string;
  snapshotHashes: string[];
  executionMode: string;
  proposedActionCount: number;
  eligibleActionCount: number;
  blockedActionCount: number;
  reviewActionCount: number;
  totalProposedSpend: string;
  totalEligibleSpend: string;
  exposureByMarket: Record<string,string>;
  exposureByEvent: Record<string,string>;
  actionReceipts: ActionReceipt[];
  batchChecks: ActionCheckResult[];
  eligibleActionIds: string[];
  blockedActionIds: string[];
  batchVerdict: "ELIGIBLE"|"PARTIALLY_ELIGIBLE"|"BLOCKED"|"REVIEW_REQUIRED";
  unsigned: true; notSubmitted: true; notBroadcast: true;
  limitations: string;
  batchReceiptHash: string;
}
