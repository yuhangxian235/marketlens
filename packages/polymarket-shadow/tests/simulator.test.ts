// Orderbook replay + batch policy tests
import { describe, it, expect } from "vitest";
import { GammaClient } from "../src/api/gamma-client";
import { ClobPublicClient } from "../src/api/clob-public-client";
import { replayBuy, replaySell } from "../src/simulation/orderbook-replay";
import { simulateBatch } from "../src/simulation/batch-simulator";
import { sha256 } from "../src/snapshot/hash";
import type { CandidateAction } from "../src/models/candidate-action";
import type { BatchPolicy } from "../src/models/policy";

const defaultPolicy: BatchPolicy = {
  policyId: "test-v1", policyHash: sha256("test-v1"),
  name: "Test Policy", executionMode: "ALLOW_ELIGIBLE_ONLY",
  maxTotalSpend: "50000", maxSpendPerMarket: "30000", maxExposurePerEvent: "50000",
  maxSingleActionSpend: "20000", maxSlippageBps: 500,
  partialFillAllowed: false, maxSnapshotAgeSeconds: 3600,
  minSecondsBeforeMarketEnd: 300, maxActionsPerMarket: 3,
  blockConflictingOutcomes: true, requireAllActionsPass: false,
  failClosedOnMissingData: true,
};

const gamma = new GammaClient();
const clob = new ClobPublicClient();

describe("GammaClient", () => {
  it("returns markets", async () => {
    const m = await gamma.getMarkets();
    expect(m.length).toBeGreaterThanOrEqual(3);
  });
  it("market has token IDs", async () => {
    const m = await gamma.getMarket("eth-q3-3000");
    expect(m).not.toBeNull();
    expect(m!.tokenIds).toContain("token_eth_yes");
  });
});

describe("Orderbook replay — BUY", () => {
  it("fully fills at market", async () => {
    const book = await clob.getBook("token_eth_yes");
    expect(book).not.toBeNull();
    const action: CandidateAction = {
      actionId: "buy-1", sourceAgent: "test", createdAt: new Date().toISOString(),
      marketId: "eth-q3-3000", conditionId: "0xeth3000",
      tokenId: "token_eth_yes", outcome: "Yes", side: "BUY",
      orderType: "GTC", limitPrice: "70", buyBudget: "500", maxSlippageBps: 500,
      rationale: "ETH bullish", userPolicyRef: "test-v1", postOnly: false,
    };
    const r = replayBuy(action, book!, 500);
    expect(r.filled).toBe(true);
    expect(BigInt(r.filledSize)).toBeGreaterThan(0n);
  });

  it("no fill below market", async () => {
    const book = await clob.getBook("token_eth_yes");
    const action: CandidateAction = {
      actionId: "buy-2", sourceAgent: "test", createdAt: new Date().toISOString(),
      marketId: "eth-q3-3000", conditionId: "0xeth3000",
      tokenId: "token_eth_yes", outcome: "Yes", side: "BUY",
      orderType: "GTC", limitPrice: "10", buyBudget: "500", maxSlippageBps: 500,
      rationale: "way below", userPolicyRef: "test-v1", postOnly: false,
    };
    const r = replayBuy(action, book!, 500);
    expect(r.filled).toBe(false);
  });
});

describe("Orderbook replay — SELL", () => {
  it("sells into bids", async () => {
    const book = await clob.getBook("token_eth_yes");
    const action: CandidateAction = {
      actionId: "sell-1", sourceAgent: "test", createdAt: new Date().toISOString(),
      marketId: "eth-q3-3000", conditionId: "0xeth3000",
      tokenId: "token_eth_yes", outcome: "Yes", side: "SELL",
      orderType: "GTC", limitPrice: "60", sellShares: "500", maxSlippageBps: 500,
      rationale: "taking profit", userPolicyRef: "test-v1", postOnly: false,
    };
    const r = replaySell(action, book!, 500);
    expect(r.filled).toBe(true);
  });
});

describe("Batch simulation", () => {
  it("processes batch with mixed results", async () => {
    const markets = await gamma.getMarkets();
    const actions: CandidateAction[] = [
      { actionId:"A",sourceAgent:"agent",createdAt:new Date().toISOString(),marketId:"eth-q3-3000",conditionId:"0xeth3000",tokenId:"token_eth_yes",outcome:"Yes",side:"BUY",orderType:"GTC",limitPrice:"68",buyBudget:"500",maxSlippageBps:500,rationale:"ETH bullish",userPolicyRef:"test-v1",postOnly:false },
      { actionId:"B",sourceAgent:"agent",createdAt:new Date().toISOString(),marketId:"btc-100k-q3",conditionId:"0xbtc100k",tokenId:"token_btc_no",outcome:"No",side:"BUY",orderType:"GTC",limitPrice:"95",buyBudget:"500",maxSlippageBps:500,rationale:"BTC won't hit",userPolicyRef:"test-v1",postOnly:false },
    ];

    const books = new Map();
    for (const a of actions) books.set(a.tokenId, await clob.getBook(a.tokenId));

    const { receipts } = simulateBatch({
      actions, books, policy: defaultPolicy,
      snapshotCapturedAt: "2026-07-25T12:00:00Z", snapshotHashes: ["abc"],
    });

    expect(receipts.length).toBe(2);
    expect(receipts.every(r => r.simulationType === "POLYMARKET_ORDERBOOK_SHADOW")).toBe(true);
    expect(receipts.every(r => r.unsigned === true)).toBe(true);
  });
});

describe("Hash determinism", () => {
  it("same input produces same hash", () => {
    const h1 = sha256("test");
    const h2 = sha256("test");
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
  });
});
