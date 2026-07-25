import {
  decodeFunctionData,
  encodeFunctionData,
  isAddress,
  type Address,
} from "viem";

import { predictionMarketAbi } from "../../../../artifacts/abi/PredictionMarket.js";
import type { PredictionMarketActionAdapter } from "../adapter.js";
import { createMockEnvelope } from "../envelope.js";
import type {
  BuyPositionInput,
  ClaimRewardInput,
  CreateMarketInput,
  MarketLensSimulationEnvelope,
  Outcome,
  PreparedAction,
} from "../types.js";

export interface MockAdapterConfig {
  chainId: number;
  contractAddress: Address;
}

const outcomeValue: Record<Outcome, 1 | 2> = { YES: 1, NO: 2 };

function requireAddress(value: Address, field: string): void {
  if (!isAddress(value, { strict: true })) {
    throw new TypeError(`${field} must be a checksummed or lowercase EVM address`);
  }
}

function prepared(
  config: MockAdapterConfig,
  operation: PreparedAction["operation"],
  sender: Address,
  data: `0x${string}`,
  value: bigint,
  intent: PreparedAction["intent"],
): PreparedAction {
  const decoded = decodeFunctionData({ abi: predictionMarketAbi, data });
  return {
    schemaVersion: 1,
    verificationMode: "mock",
    operation,
    unsignedTransaction: {
      from: sender,
      to: config.contractAddress,
      data,
      value: value.toString(),
      chainId: config.chainId,
    },
    decodedCall: {
      functionName: decoded.functionName,
      args: decoded.args ?? [],
    },
    intent,
  };
}

export class MockPredictionMarketActionAdapter
  implements PredictionMarketActionAdapter
{
  constructor(private readonly config: MockAdapterConfig) {
    requireAddress(config.contractAddress, "contractAddress");
  }

  async createMarket(input: CreateMarketInput): Promise<PreparedAction> {
    requireAddress(input.sender, "sender");
    const questionLength = new TextEncoder().encode(input.question).length;
    if (questionLength < 1 || questionLength > 280) {
      throw new RangeError("question must contain 1–280 UTF-8 bytes");
    }
    if (input.closesAt <= 0n) {
      throw new RangeError("closesAt must be a positive Unix timestamp");
    }
    const data = encodeFunctionData({
      abi: predictionMarketAbi,
      functionName: "createMarket",
      args: [input.question, input.closesAt],
    });
    return prepared(this.config, "create_market", input.sender, data, 0n, {
      sender: input.sender,
      question: input.question,
      closesAt: input.closesAt.toString(),
    });
  }

  async buyPosition(input: BuyPositionInput): Promise<PreparedAction> {
    requireAddress(input.sender, "sender");
    if (input.marketId <= 0n) throw new RangeError("marketId must be positive");
    if (input.paymentWei <= 0n) throw new RangeError("paymentWei must be positive");
    if (input.paymentWei % 1_000_000_000n !== 0n) {
      throw new RangeError("paymentWei must be aligned to 1 gwei");
    }
    const data = encodeFunctionData({
      abi: predictionMarketAbi,
      functionName: "buyPosition",
      args: [input.marketId, outcomeValue[input.outcome]],
    });
    return prepared(
      this.config,
      "buy_position",
      input.sender,
      data,
      input.paymentWei,
      {
        sender: input.sender,
        marketId: input.marketId.toString(),
        outcome: input.outcome,
        paymentWei: input.paymentWei.toString(),
      },
    );
  }

  async claimReward(input: ClaimRewardInput): Promise<PreparedAction> {
    requireAddress(input.sender, "sender");
    if (input.marketId <= 0n) throw new RangeError("marketId must be positive");
    const data = encodeFunctionData({
      abi: predictionMarketAbi,
      functionName: "claimReward",
      args: [input.marketId],
    });
    return prepared(this.config, "claim_reward", input.sender, data, 0n, {
      sender: input.sender,
      marketId: input.marketId.toString(),
    });
  }

  async simulate(action: PreparedAction): Promise<MarketLensSimulationEnvelope> {
    return createMockEnvelope(action);
  }
}

