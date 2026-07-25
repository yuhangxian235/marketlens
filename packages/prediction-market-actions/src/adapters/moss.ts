import type { PredictionMarketActionAdapter } from "../adapter.js";
import type {
  BuyPositionInput,
  ClaimRewardInput,
  CreateMarketInput,
  MarketLensSimulationEnvelope,
  PreparedAction,
} from "../types.js";

export const MOSS_SOURCE_COMMIT =
  "d09b38cbc44ee7f5722c5d09e7224f7750187762" as const;

export const MOSS_INTEGRATION_BLOCKERS = [
  "Prediction-market category and create/buy verbs are absent from the pinned closed vocabulary.",
  "An honest admin-action/claim risk label is absent.",
  "The public simulator result omits the exact pinned block hash and timestamp.",
  "A deployed address bytecode hash and zero-Warning live trace must be verified together.",
] as const;

export class MossIntegrationUnavailableError extends Error {
  constructor() {
    super(
      `Moss source-pinned adapter is fail-closed: ${MOSS_INTEGRATION_BLOCKERS.join(
        " ",
      )}`,
    );
    this.name = "MossIntegrationUnavailableError";
  }
}

export class MossPredictionMarketActionAdapter
  implements PredictionMarketActionAdapter
{
  private unavailable(): never {
    throw new MossIntegrationUnavailableError();
  }

  async createMarket(input: CreateMarketInput): Promise<PreparedAction> {
    void input;
    return this.unavailable();
  }

  async buyPosition(input: BuyPositionInput): Promise<PreparedAction> {
    void input;
    return this.unavailable();
  }

  async claimReward(input: ClaimRewardInput): Promise<PreparedAction> {
    void input;
    return this.unavailable();
  }

  async simulate(action: PreparedAction): Promise<MarketLensSimulationEnvelope> {
    void action;
    return this.unavailable();
  }
}
