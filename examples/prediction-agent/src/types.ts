// Prediction Agent Integration — Agent-specific types
// These are INDEPENDENT of MarketLens types.
// Adapter bridges Agent output → MarketLens AgentProposal.

/** Agent's own market input (captured from Polymarket or live) */
export interface AgentMarketInput {
  marketId: string;
  question: string;
  conditionId: string;
  outcomes: Array<{
    label: string;
    tokenId: string;
    price: number;
  }>;
  capturedAt: string;
  source: string;
  live: boolean;
}

/** Agent's own strategy configuration */
export interface AgentStrategyConfig {
  /** If YES outcome price is below this, propose BUY YES */
  buyThresholdYes: number;
  /** Target size per intent (in USDC units) */
  targetSize: number;
  /** Number of intents to generate */
  intentCount: number;
}

/** Agent-generated trade intent — before MarketLens sees it */
export interface PredictionAgentIntent {
  agentRunId: string;
  marketId: string;
  conditionId: string;
  tokenId: string;
  outcome: "YES" | "NO";
  side: "BUY" | "SELL";
  /** Price in cents string (e.g., "5" = 5¢) */
  price: string;
  /** Requested amount in USDC units (string for bigint compat) */
  requestedAmount: string;
  /** Strategy rationale code */
  rationaleCode: string;
  /** Signal that triggered this intent */
  signalDescription: string;
  generatedAt: string;
  /** Unique index within this agent run */
  intentIndex: number;
}

/** Signing gateway decision */
export interface SigningDecision {
  proposalId: string;
  actionAllowed: boolean;
  signed: boolean;
  signature: string | null;
  reason: string;
}

/** Polymarket-compatible EIP-712 order (simplified for prototype) */
export interface PolyOrder {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: number; // 0=BUY, 1=SELL
}

/** EIP-712 domain for Polymarket CTF Exchange */
export const POLYMARKET_EIP712_DOMAIN = {
  name: "CTF Exchange",
  version: "1",
  chainId: 137,
  verifyingContract: "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E" as const,
} as const;

export const POLYMARKET_ORDER_TYPES = {
  Order: [
    { name: "salt", type: "uint256" },
    { name: "maker", type: "address" },
    { name: "signer", type: "address" },
    { name: "taker", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "expiration", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "feeRateBps", type: "uint256" },
    { name: "side", type: "uint8" },
    { name: "signatureType", type: "uint8" },
    { name: "signature", type: "bytes" },
  ],
} as const;
