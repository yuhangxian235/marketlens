/**
 * Receipt Coverage Tests
 * Validates Receipt parser behavior for all Change combinations
 */
import { describe, it, expect } from "vitest";
import { Registry, type Change, type Hex } from "@themoss/core";
import { encodeEventTopics, encodeAbiParameters, getAddress } from "viem";
import { PredictionMarketAbi } from "../src/abis/prediction-market.js";
import {
  MARKETLENS_LOCAL_ADDRESS,
  MarketLensPredictionMarketProtocol,
  verifyPredictionMarketReceipt,
} from "../src/index.js";

const account = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const WRONG = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const runtime = { rpcUrl: "http://offline", client: {} as any };

function makePositionBought(args: { marketId: number; wallet: string; outcome: 1|2; amount: number; yesAfter: number; noAfter: number }): Change {
  return {
    kind: "event",
    address: MARKETLENS_LOCAL_ADDRESS,
    topics: encodeEventTopics({ abi: PredictionMarketAbi, eventName: "PositionBought", args: { marketId: BigInt(args.marketId), wallet: getAddress(args.wallet), outcome: args.outcome } }) as readonly Hex[],
    data: encodeAbiParameters(
      [{type:"bytes32"},{type:"uint256"},{type:"uint256"},{type:"uint256"},{type:"uint256"}],
      [`0x${"ab".repeat(32)}`, BigInt(args.amount), BigInt(args.amount), BigInt(args.yesAfter), BigInt(args.noAfter)])
  } satisfies Change;
}

function makeNative(from: string, to: string, value: string): Change {
  return { kind: "nativeTransfer", from: getAddress(from), to: getAddress(to), value };
}

describe("Receipt Coverage", () => {
  const registry = new Registry(runtime).use(MarketLensPredictionMarketProtocol);
  const parseReceipt = (capability: Parameters<typeof registry.parseReceipt>[0], changes: Change[]) =>
    verifyPredictionMarketReceipt(capability, registry.parseReceipt(capability, changes));

  it("buyPosition: correct nativeTransfer + event → success", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const native = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const event = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    const receipt = parseReceipt(cap, [native, event]);
    expect(receipt.outcome).toMatchObject({ operation: "buy_position" });
    expect(receipt.changes).toHaveLength(2);
  });

  it("buyPosition: missing nativeTransfer → fail closed", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const event = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    expect(() => parseReceipt(cap, [event])).toThrow("requires matching PositionBought");
  });

  it("buyPosition: duplicate nativeTransfer → fail closed", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const n1 = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const n2 = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const event = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    expect(() => parseReceipt(cap, [n1, n2, event])).toThrow("multiple native transfers");
  });

  it("buyPosition: duplicate event → fail closed", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const native = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const e1 = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    const e2 = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 2_000_000_000, noAfter: 0 });
    expect(() => parseReceipt(cap, [native, e1, e2])).toThrow("multiple events");
  });

  it("buyPosition: wrong contract address → fail closed", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const native = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const event = {
      kind: "event" as const,
      address: WRONG,
      topics: encodeEventTopics({ abi: PredictionMarketAbi, eventName: "PositionBought", args: { marketId: 7n, wallet: getAddress(account), outcome: 1 } }) as readonly Hex[],
      data: encodeAbiParameters([{type:"bytes32"},{type:"uint256"},{type:"uint256"},{type:"uint256"},{type:"uint256"}], [`0x${"ab".repeat(32)}`, 1_000_000_000n, 1_000_000_000n, 1_000_000_000n, 0n])
    } satisfies Change;
    expect(() => parseReceipt(cap, [native, event])).toThrow("unverified address");
  });

  it("buyPosition: wrong buyer (native from ≠ event wallet) → fail closed", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const native = makeNative(WRONG, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const event = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    expect(() => parseReceipt(cap, [native, event])).toThrow("requires matching PositionBought");
  });

  it("buyPosition: amount mismatch (native ≠ event amount) → fail closed", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const native = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "2000000000");
    const event = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    expect(() => parseReceipt(cap, [native, event])).toThrow("requires matching PositionBought");
  });

  it("buyPosition: wrong outcome (event says NO, params say YES) → fail", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "NO", paymentWei: "1000000000" })) as any;
    const native = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const event = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    expect(() => parseReceipt(cap, [native, event])).toThrow(
      "Receipt outcome does not match Capability params: outcome",
    );
  });

  it("buyPosition: reordered Changes (event before native) → still works (order-preserving)", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const native = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const event = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    const receipt = parseReceipt(cap, [event, native]);
    expect(receipt.outcome).toMatchObject({ operation: "buy_position" });
    expect(receipt.changes[0]).toMatchObject({ kind: "change", change: { kind: "event" } });
    expect(receipt.changes[1]).toMatchObject({
      kind: "change",
      change: { kind: "nativeTransfer" },
    });
  });

  it("buyPosition: extra unknown Change → fail closed", async () => {
    const cap = (await registry.action("marketlens", "buyPosition", account, { marketId: "7", outcome: "YES", paymentWei: "1000000000" })) as any;
    const native = makeNative(account, MARKETLENS_LOCAL_ADDRESS, "1000000000");
    const event = makePositionBought({ marketId: 7, wallet: account, outcome: 1, amount: 1_000_000_000, yesAfter: 1_000_000_000, noAfter: 0 });
    const extra: Change = { kind: "event", address: WRONG, topics: [], data: "0x" };
    expect(() => parseReceipt(cap, [native, event, extra])).toThrow();
  });

  it("claimReward: wrong payout (native ≠ event payout) → fail closed", async () => {
    const cap = (await registry.action("marketlens", "claimReward", account, { marketId: "3" })) as any;
    const event: Change = {
      kind: "event", address: MARKETLENS_LOCAL_ADDRESS,
      topics: encodeEventTopics({ abi: PredictionMarketAbi, eventName: "RewardClaimed", args: { marketId: 3n, wallet: getAddress(account), outcome: 1 } }) as readonly Hex[],
      data: encodeAbiParameters(
        [{type:"uint256"},{type:"uint256"},{type:"bool"}],
        [1_000_000_000n, 1_000_000_000n, false],
      )
    } satisfies Change;
    const native: Change = makeNative(MARKETLENS_LOCAL_ADDRESS, account, "2000000000");
    expect(() => parseReceipt(cap, [native, event])).toThrow("requires matching RewardClaimed");
  });
});
