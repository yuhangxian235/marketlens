import {
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Receipt,
  type ReceiptResult,
  UnsignedIntegerString,
} from "@themoss/core";
import { decodeEventLog } from "viem";
import { z } from "zod/v4";
import { PredictionMarketAbi } from "./abis/prediction-market.js";

export const MARKETLENS_LOCAL_ADDRESS: AddressValue =
  "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

const positiveInteger = UnsignedIntegerString.refine(
  (value: string) => BigInt(value) > 0n,
  "Expected a positive integer.",
).describe("A positive base-10 integer string.");
const question = z.string().refine(
  (value) => {
    const length = new TextEncoder().encode(value).length;
    return length >= 1 && length <= 280;
  },
  "Expected 1–280 UTF-8 bytes.",
).describe("A binary market question containing 1–280 UTF-8 bytes.");
const outcome = z.enum(["YES", "NO"]).describe("A binary YES or NO outcome.");

const createMarketParams = {
  question: {
    type: question,
    description: "Binary market question containing 1–280 UTF-8 bytes.",
  },
  closesAt: {
    type: positiveInteger,
    description: "Future Unix timestamp in seconds at the pinned simulation block.",
  },
} satisfies ParamsSpec;

const buyPositionParams = {
  marketId: {
    type: positiveInteger,
    description: "Positive base-10 MarketLens market identifier.",
  },
  outcome: {
    type: outcome,
    description: "Required binary position: YES or NO.",
  },
  paymentWei: {
    type: positiveInteger.refine(
      (value: string) => BigInt(value) % 1_000_000_000n === 0n,
      "Expected a value aligned to 1 gwei.",
    ).describe("A positive base-10 wei amount aligned to 1 gwei."),
    description: "Exact native MON payment in wei, aligned to 1 gwei.",
  },
} satisfies ParamsSpec;

const claimRewardParams = {
  marketId: {
    type: positiveInteger,
    description: "Positive base-10 MarketLens market identifier.",
  },
} satisfies ParamsSpec;

type CreateMarketOutcome = {
  operation: "create_market";
  marketId: string;
  creator: AddressValue;
  questionHash: Hex;
  question: string;
  closesAt: string;
};

type BuyPositionOutcome = {
  operation: "buy_position";
  marketId: string;
  wallet: AddressValue;
  outcome: "YES" | "NO";
  amount: string;
  positionUnits: string;
  yesPoolAfter: string;
  noPoolAfter: string;
};

type ClaimRewardOutcome = {
  operation: "claim_reward";
  marketId: string;
  wallet: AddressValue;
  outcome: "YES" | "NO";
  winningStake: string;
  payout: string;
  refundMode: boolean;
};

function outcomeName(value: number): "YES" | "NO" {
  if (value === 1) return "YES";
  if (value === 2) return "NO";
  throw new Error(`Unexpected Change: invalid prediction-market outcome ${value}`);
}

function decodeMarketEvent(
  change: Extract<Change, { kind: "event" }>,
): ReturnType<typeof decodeEventLog<typeof PredictionMarketAbi>> {
  if (change.address.toLowerCase() !== MARKETLENS_LOCAL_ADDRESS) {
    throw new Error("Unexpected Change: event came from an unverified address");
  }
  try {
    return decodeEventLog({
      abi: PredictionMarketAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    throw new Error("Unexpected Change: unsupported prediction-market event");
  }
}

@Protocol({
  name: "marketlens",
  category: "prediction-market",
  description:
    "Create, buy, and claim on the source-pinned experimental MarketLens prediction market.",
  contracts: {
    market: { abi: PredictionMarketAbi, addr: MARKETLENS_LOCAL_ADDRESS },
  },
  labels: { PredictionMarket: MARKETLENS_LOCAL_ADDRESS },
})
export class MarketLensPredictionMarketProtocol {
  declare market: Handle<typeof PredictionMarketAbi>;

  @Capability<MarketLensPredictionMarketProtocol, typeof createMarketParams>({
    intent: "Create a binary MarketLens prediction market",
    verb: "create",
    params: createMarketParams,
    receipt: "createMarketReceipt",
    risk: ["adminAction"],
    tags: ["prediction-market", "owner-only"],
  })
  async createMarket(params: InferParams<typeof createMarketParams>) {
    return [this.market.createMarket([params.question, BigInt(params.closesAt)])];
  }

  @Capability<MarketLensPredictionMarketProtocol, typeof buyPositionParams>({
    intent: "Buy a YES or NO position with native MON",
    verb: "buy",
    params: buyPositionParams,
    receipt: "buyPositionReceipt",
    risk: ["fundOut"],
    tags: ["prediction-market", "native-mon"],
  })
  async buyPosition(params: InferParams<typeof buyPositionParams>) {
    const selected = params.outcome === "YES" ? 1 : 2;
    return [
      this.market.buyPosition([BigInt(params.marketId), selected], {
        value: BigInt(params.paymentWei),
      }),
    ];
  }

  @Capability<MarketLensPredictionMarketProtocol, typeof claimRewardParams>({
    intent: "Claim a resolved market reward or zero-winner refund",
    verb: "claim",
    params: claimRewardParams,
    receipt: "claimRewardReceipt",
    risk: ["contractInteraction"],
    tags: ["prediction-market", "claim"],
  })
  async claimReward(params: InferParams<typeof claimRewardParams>) {
    return [this.market.claimReward([BigInt(params.marketId)])];
  }

  @Receipt()
  createMarketReceipt(
    changes: readonly Change[],
  ): ReceiptResult<CreateMarketOutcome> {
    if (changes.length !== 1 || changes[0]?.kind !== "event") {
      throw new Error("create market Receipt requires exactly one MarketCreated event");
    }
    const change = changes[0];
    const decoded = decodeMarketEvent(change);
    if (decoded.eventName !== "MarketCreated") {
      throw new Error(`Unexpected Change: create market emitted ${decoded.eventName}`);
    }
    const outcome: CreateMarketOutcome = {
      operation: "create_market",
      marketId: decoded.args.marketId.toString(),
      creator: decoded.args.creator,
      questionHash: decoded.args.questionHash,
      question: decoded.args.question,
      closesAt: decoded.args.closesAt.toString(),
    };
    return {
      kind: "receipt",
      outcome,
      text: `Created Market ${outcome.marketId}: ${outcome.question}`,
      changes: [
        {
          kind: "change",
          change,
          data: outcome,
          text: `MarketCreated ${outcome.marketId} by ${outcome.creator}`,
        },
      ],
    };
  }

  @Receipt()
  buyPositionReceipt(
    changes: readonly Change[],
  ): ReceiptResult<BuyPositionOutcome> {
    let eventChange: Extract<Change, { kind: "event" }> | undefined;
    let nativeChange: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    let outcome: BuyPositionOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (nativeChange) throw new Error("buy Receipt has multiple native transfers");
        nativeChange = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }
      if (eventChange) throw new Error("buy Receipt has multiple events");
      eventChange = change;
      const decoded = decodeMarketEvent(change);
      if (decoded.eventName !== "PositionBought") {
        throw new Error(`Unexpected Change: buy emitted ${decoded.eventName}`);
      }
      outcome = {
        operation: "buy_position",
        marketId: decoded.args.marketId.toString(),
        wallet: decoded.args.wallet,
        outcome: outcomeName(decoded.args.outcome),
        amount: decoded.args.amount.toString(),
        positionUnits: decoded.args.positionUnits.toString(),
        yesPoolAfter: decoded.args.yesPoolAfter.toString(),
        noPoolAfter: decoded.args.noPoolAfter.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: outcome,
        text: `Bought ${outcome.outcome} in Market ${outcome.marketId}: ${outcome.amount} wei`,
      };
    });
    if (
      !outcome ||
      !nativeChange ||
      nativeChange.from.toLowerCase() !== outcome.wallet.toLowerCase() ||
      nativeChange.to.toLowerCase() !== MARKETLENS_LOCAL_ADDRESS ||
      nativeChange.value !== outcome.amount ||
      outcome.positionUnits !== outcome.amount
    ) {
      throw new Error(
        "buy Receipt requires matching PositionBought and wallet-to-market native Changes",
      );
    }
    return {
      kind: "receipt",
      outcome,
      text: `Bought ${outcome.outcome} in Market ${outcome.marketId}`,
      changes: parsed,
    };
  }

  @Receipt()
  claimRewardReceipt(
    changes: readonly Change[],
  ): ReceiptResult<ClaimRewardOutcome> {
    let nativeChange: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    let outcome: ClaimRewardOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (nativeChange) throw new Error("claim Receipt has multiple native transfers");
        nativeChange = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }
      const decoded = decodeMarketEvent(change);
      if (decoded.eventName !== "RewardClaimed" || outcome) {
        throw new Error(`Unexpected Change: claim emitted ${decoded.eventName}`);
      }
      outcome = {
        operation: "claim_reward",
        marketId: decoded.args.marketId.toString(),
        wallet: decoded.args.wallet,
        outcome: outcomeName(decoded.args.outcome),
        winningStake: decoded.args.winningStake.toString(),
        payout: decoded.args.payout.toString(),
        refundMode: decoded.args.refundMode,
      };
      return {
        kind: "change" as const,
        change,
        data: outcome,
        text: `Claimed ${outcome.payout} wei from Market ${outcome.marketId}`,
      };
    });
    if (
      !outcome ||
      !nativeChange ||
      nativeChange.from.toLowerCase() !== MARKETLENS_LOCAL_ADDRESS ||
      nativeChange.to.toLowerCase() !== outcome.wallet.toLowerCase() ||
      nativeChange.value !== outcome.payout
    ) {
      throw new Error(
        "claim Receipt requires matching RewardClaimed and market-to-wallet native Changes",
      );
    }
    return {
      kind: "receipt",
      outcome,
      text: `Claimed Market ${outcome.marketId} reward`,
      changes: parsed,
    };
  }
}
