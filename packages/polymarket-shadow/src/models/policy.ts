// User-defined verification policy
export interface BatchPolicy {
  policyId: string;
  policyHash: string;
  name: string;
  executionMode: "ALL_OR_NOTHING" | "ALLOW_ELIGIBLE_ONLY";
  maxActions?: number;
  maxTotalSpend: string;         // string for bigint precision
  maxSpendPerMarket: string;
  maxExposurePerEvent: string;
  maxSingleActionSpend: string;
  maxSlippageBps: number;
  allowedMarkets?: string[];
  blockedMarkets?: string[];
  allowedSides?: ("BUY"|"SELL")[];
  allowedOrderTypes?: ("FOK"|"FAK"|"GTC"|"GTD")[];
  partialFillAllowed: boolean;
  maxSnapshotAgeSeconds: number;
  minSecondsBeforeMarketEnd: number;
  maxActionsPerMarket: number;
  blockConflictingOutcomes: boolean;
  requireAllActionsPass: boolean;
  failClosedOnMissingData: boolean;
}
