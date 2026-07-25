/**
 * Action vs Manual Builder Exact Comparison
 * Verifies Moss Registry.action() produces identical calldata to manual builder
 */
import { describe, it, expect, beforeAll } from "vitest";
import { Registry, createRuntime, flattenCapabilityTree } from "@themoss/core";
import { MarketLensPredictionMarketProtocol, MARKETLENS_LOCAL_ADDRESS } from "../src/index.js";
import { encodeFunctionData, getAddress, keccak256, toHex } from "viem";
import { PredictionMarketAbi } from "../src/abis/prediction-market.js";

const RPC = "http://127.0.0.1:8546";
const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ALICE = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

function manualCreateMarket(question: string, closesAt: string) {
  return {
    from: OWNER,
    to: MARKETLENS_LOCAL_ADDRESS,
    data: encodeFunctionData({ abi: PredictionMarketAbi, functionName: "createMarket", args: [question, BigInt(closesAt)] }),
    value: "0x0",
  };
}

function manualBuyPosition(marketId: string, outcome: number, paymentWei: string, from: string) {
  return {
    from,
    to: MARKETLENS_LOCAL_ADDRESS,
    data: encodeFunctionData({ abi: PredictionMarketAbi, functionName: "buyPosition", args: [BigInt(marketId), outcome] }),
    value: toHex(BigInt(paymentWei)),
  };
}

function manualClaimReward(marketId: string, from: string) {
  return {
    from,
    to: MARKETLENS_LOCAL_ADDRESS,
    data: encodeFunctionData({ abi: PredictionMarketAbi, functionName: "claimReward", args: [BigInt(marketId)] }),
    value: "0x0",
  };
}

describe("Action vs Manual Builder Comparison", () => {
  let runtime: any, registry: any;
  beforeAll(async () => {
    runtime = await createRuntime({ rpcUrl: RPC });
    registry = new Registry(runtime).use(MarketLensPredictionMarketProtocol);
  }, 15000);

  function compare(scenario: string, moss: any, manual: any) {
    const mossTx = flattenCapabilityTree(moss)[0]?.transaction;
    const results: any = { scenario };

    results.from_equal = mossTx.from.toLowerCase() === manual.from.toLowerCase();
    results.to_equal = mossTx.to.toLowerCase() === manual.to.toLowerCase();
    results.data_equal = mossTx.data === manual.data;
    results.value_equal = mossTx.value === manual.value;
    results.transaction_count = flattenCapabilityTree(moss).length;
    results.status = results.from_equal && results.to_equal && results.data_equal && results.value_equal ? "ALL_MATCH" : "MISMATCH";

    if (!results.from_equal) console.error(`FROM mismatch: moss=${mossTx.from} manual=${manual.from}`);
    if (!results.to_equal) console.error(`TO mismatch: moss=${mossTx.to} manual=${manual.to}`);
    if (!results.data_equal) console.error(`DATA mismatch:\n  moss=${mossTx.data}\n  manual=${manual.data}`);
    if (!results.value_equal) console.error(`VALUE mismatch: moss=${mossTx.value} manual=${manual.value}`);

    expect(results.status).toBe("ALL_MATCH");
    return results;
  }

  it("create_market: exact match", async () => {
    const moss = await registry.action("marketlens", "createMarket", OWNER, { question: "Compare test", closesAt: "2000000000" });
    compare("create_market", moss, manualCreateMarket("Compare test", "2000000000"));
  });

  it("buy_position YES: exact match", async () => {
    const moss = await registry.action("marketlens", "buyPosition", ALICE, { marketId: "1", outcome: "YES", paymentWei: "1000000000" });
    compare("buy_position_YES", moss, manualBuyPosition("1", 1, "1000000000", ALICE));
  });

  it("buy_position NO: exact match", async () => {
    const moss = await registry.action("marketlens", "buyPosition", ALICE, { marketId: "2", outcome: "NO", paymentWei: "2000000000" });
    compare("buy_position_NO", moss, manualBuyPosition("2", 2, "2000000000", ALICE));
  });

  it("claim_reward: exact match", async () => {
    const moss = await registry.action("marketlens", "claimReward", ALICE, { marketId: "3" });
    compare("claim_reward", moss, manualClaimReward("3", ALICE));
  });
});
