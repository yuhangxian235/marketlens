import type {
  BuyPositionInput,
  ClaimRewardInput,
  CreateMarketInput,
  MarketLensSimulationEnvelope,
  PreparedAction,
} from "./types.js";

export interface PredictionMarketActionAdapter {
  createMarket(input: CreateMarketInput): Promise<PreparedAction>;
  buyPosition(input: BuyPositionInput): Promise<PreparedAction>;
  claimReward(input: ClaimRewardInput): Promise<PreparedAction>;
  simulate(action: PreparedAction): Promise<MarketLensSimulationEnvelope>;
}

