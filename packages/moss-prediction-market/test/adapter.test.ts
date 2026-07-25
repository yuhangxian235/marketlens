import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
} from "viem";
import { describe, expect, it } from "vitest";
import { PredictionMarketAbi } from "../src/abis/prediction-market.js";
import {
  MARKETLENS_LOCAL_ADDRESS,
  MarketLensPredictionMarketProtocol,
} from "../src/index.js";

const account = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

describe("MarketLens source-pinned Protocol", () => {
  it("builds one unsigned buy transaction with exact calldata and value", async () => {
    const registry = new Registry(runtime).use(MarketLensPredictionMarketProtocol);
    const capability = await registry.action(
      "marketlens",
      "buyPosition",
      account,
      {
        marketId: "7",
        outcome: "YES",
        paymentWei: "1000000000",
      },
    );
    if (capability.kind !== "capability") throw new Error("expected capability");

    expect(flattenCapabilityTree(capability)).toHaveLength(1);
    expect(flattenCapabilityTree(capability)[0]?.transaction).toMatchObject({
      from: account,
      to: MARKETLENS_LOCAL_ADDRESS,
      value: "0x3b9aca00",
    });
  });

  it("covers the original native transfer and PositionBought Changes in order", async () => {
    const registry = new Registry(runtime).use(MarketLensPredictionMarketProtocol);
    const capability = await registry.action(
      "marketlens",
      "buyPosition",
      account,
      {
        marketId: "7",
        outcome: "YES",
        paymentWei: "1000000000",
      },
    );
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: account,
      to: MARKETLENS_LOCAL_ADDRESS,
      value: "1000000000",
    } satisfies Change;
    const bought = {
      kind: "event",
      address: MARKETLENS_LOCAL_ADDRESS,
      topics: encodeEventTopics({
        abi: PredictionMarketAbi,
        eventName: "PositionBought",
        args: { marketId: 7n, wallet: account, outcome: 1 },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        [
          `0x${"12".repeat(32)}`,
          1_000_000_000n,
          1_000_000_000n,
          1_000_000_000n,
          0n,
        ],
      ),
    } satisfies Change;

    const receipt = registry.parseReceipt(capability, [native, bought]);

    expect(receipt.outcome).toEqual({
      operation: "buy_position",
      marketId: "7",
      wallet: account,
      outcome: "YES",
      amount: "1000000000",
      positionUnits: "1000000000",
      yesPoolAfter: "1000000000",
      noPoolAfter: "0",
    });
    expect(receipt.changes[0]).toMatchObject({ change: native });
    expect(receipt.changes[1]).toMatchObject({ change: bought });
  });

  it("fails closed when a buy native-transfer Change is missing", async () => {
    const registry = new Registry(runtime).use(MarketLensPredictionMarketProtocol);
    const capability = await registry.action(
      "marketlens",
      "buyPosition",
      account,
      {
        marketId: "7",
        outcome: "NO",
        paymentWei: "1000000000",
      },
    );
    if (capability.kind !== "capability") throw new Error("expected capability");
    const bought = {
      kind: "event",
      address: MARKETLENS_LOCAL_ADDRESS,
      topics: encodeEventTopics({
        abi: PredictionMarketAbi,
        eventName: "PositionBought",
        args: { marketId: 7n, wallet: account, outcome: 2 },
      }) as readonly Hex[],
      data: encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
          { type: "uint256" },
        ],
        [`0x${"12".repeat(32)}`, 1_000_000_000n, 1_000_000_000n, 0n, 1_000_000_000n],
      ),
    } satisfies Change;

    expect(() => registry.parseReceipt(capability, [bought])).toThrow(
      "requires matching PositionBought",
    );
  });
});
