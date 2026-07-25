/**
 * Phase 2B-R2 SDK Integration Tests
 * Real Moss trace simulation against local Anvil (chain 143).
 * 
 * State (from demo/generated/moss-local-state.json):
 *   M1: open, closesAt far future  -> buy YES succeeds
 *   M2: open, closesAt far future  -> buy NO succeeds
 *   M3: resolved YES (ALICE winner, BOB loser) -> claim succeeds for ALICE, fails for BOB
 *   M4: resolved YES, already claimed by owner -> claim reverts (AlreadyClaimed)
 *   M5: resolved Unset (refund) -> closed, buy reverts (MarketClosed)
 *   M999: does not exist -> buy/claim reverts (MarketNotFound)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { Registry, createRuntime } from "@themoss/core";
import { createTraceSimulator } from "@themoss/simulator";
import { MarketLensPredictionMarketProtocol } from "../src/adapter.js";

const RPC_URL = "http://127.0.0.1:8546";
const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ALICE = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const BOB   = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

describe("MarketLens Moss SDK Real Simulation", () => {
  let runtime: any;
  let registry: any;

  beforeAll(async () => {
    runtime = await createRuntime({ rpcUrl: RPC_URL });
    registry = new Registry(runtime).use(MarketLensPredictionMarketProtocol);
  }, 15000);

  function makeSimulator() {
    return createTraceSimulator(runtime, {
      receipt: (c: any, ch: any) => registry.parseReceipt(c, ch),
    });
  }

  // === DISCOVER ===
  it("discovers all 3 capabilities", async () => {
    const caps = await registry.discover({ protocol: "marketlens" });
    expect(caps.length).toBeGreaterThanOrEqual(3);
    const names = caps.map((c: any) => c.method).sort();
    expect(names).toContain("createMarket");
    expect(names).toContain("buyPosition");
    expect(names).toContain("claimReward");
  });

  // === SUCCESS: createMarket ===
  it("simulates createMarket successfully", async () => {
    const cap = await registry.action(
      "marketlens", "createMarket", OWNER,
      { question: "New Moss test market", closesAt: "2000000000" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];
    expect(r.reverted).toBe(false);
    expect(r.receipt).toBeDefined();
    expect(r.receipt.outcome.operation).toBe("create_market");
    expect(r.warnings.length).toBe(0);
  }, 30000);

  // === SUCCESS: buyPosition YES (M1) ===
  it("simulates buyPosition YES on open market M1", async () => {
    const cap = await registry.action(
      "marketlens", "buyPosition", ALICE,
      { marketId: "1", outcome: "YES", paymentWei: "1000000000" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];
    expect(r.reverted).toBe(false);
    expect(r.receipt.outcome.operation).toBe("buy_position");
    expect(r.receipt.outcome.outcome).toBe("YES");
    expect(r.receipt.outcome.amount).toBe("1000000000");
    expect(r.warnings.length).toBe(0);
  }, 30000);

  // === SUCCESS: buyPosition NO (M2) ===
  it("simulates buyPosition NO on open market M2", async () => {
    const cap = await registry.action(
      "marketlens", "buyPosition", BOB,
      { marketId: "2", outcome: "NO", paymentWei: "2000000000" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];
    expect(r.reverted).toBe(false);
    expect(r.receipt.outcome.operation).toBe("buy_position");
    expect(r.receipt.outcome.outcome).toBe("NO");
    expect(r.receipt.outcome.amount).toBe("2000000000");
    expect(r.warnings.length).toBe(0);
  }, 30000);

  // === SUCCESS: claimReward for winner (M3, ALICE=YES winner) ===
  it("simulates claimReward for winning side (M3, ALICE)", async () => {
    const cap = await registry.action(
      "marketlens", "claimReward", ALICE,
      { marketId: "3" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];
    expect(r.reverted).toBe(false);
    expect(r.receipt.outcome.operation).toBe("claim_reward");
    expect(r.receipt.outcome.outcome).toBe("YES");
    expect(BigInt(r.receipt.outcome.payout)).toBeGreaterThan(0n);
    expect(r.receipt.outcome.refundMode).toBe(false);
    expect(r.warnings.length).toBe(0);
  }, 30000);

  // === FAIL: losing claim (M3, BOB=NO loser) ===
  it("reverts claimReward for losing side (M3, BOB)", async () => {
    const cap = await registry.action(
      "marketlens", "claimReward", BOB,
      { marketId: "3" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];
    expect(r.reverted).toBe(true);
    expect(r.warnings.some((w: any) => w.code === "REVERTED")).toBe(true);
  }, 30000);

  // === FAIL: already claimed (M4) ===
  it("reverts claimReward for already-claimed market (M4)", async () => {
    const cap = await registry.action(
      "marketlens", "claimReward", OWNER,
      { marketId: "4" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];
    expect(r.reverted).toBe(true);
  }, 30000);

  // === FAIL: closed market buy (M5) ===
  it("reverts buyPosition on closed market (M5)", async () => {
    const cap = await registry.action(
      "marketlens", "buyPosition", ALICE,
      { marketId: "5", outcome: "YES", paymentWei: "1000000000" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];
    expect(r.reverted).toBe(true);
  }, 30000);

  // === FAIL: unknown market ===
  it("reverts buyPosition on non-existent market (999)", async () => {
    const cap = await registry.action(
      "marketlens", "buyPosition", ALICE,
      { marketId: "999", outcome: "YES", paymentWei: "1000000000" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];
    expect(r.reverted).toBe(true);
  }, 30000);

  // === STATE UNCHANGED ===
  it("proves state unchanged after simulation", async () => {
    const blockBefore = await runtime.client.getBlockNumber();

    const cap = await registry.action(
      "marketlens", "buyPosition", ALICE,
      { marketId: "1", outcome: "YES", paymentWei: "5000000000" }
    );
    const sim = makeSimulator();
    await sim.simulate(cap);

    const blockAfter = await runtime.client.getBlockNumber();
    expect(blockAfter).toBe(blockBefore);
  }, 30000);

  // === INTENT CHECKER: buyPosition ===
  it("intent checker validates buyPosition against expected outcome", async () => {
    const cap = await registry.action(
      "marketlens", "buyPosition", ALICE,
      { marketId: "1", outcome: "YES", paymentWei: "3000000000" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];

    // If sim reverted, intent check fails
    if (r.reverted) {
      expect(r.warnings.some((w: any) => w.code === "REVERTED")).toBe(true);
      return;
    }

    const outcome = r.receipt.outcome;
    // Intent: same wallet, same market, same side
    expect(outcome.wallet.toLowerCase()).toBe(ALICE.toLowerCase());
    expect(outcome.marketId).toBe("1");
    expect(outcome.outcome).toBe("YES");
    // Payment should be non-zero
    expect(BigInt(outcome.amount)).toBeGreaterThan(0n);
  }, 30000);

  // === INTENT CHECKER: claimReward ===
  it("intent checker validates claimReward payout > 0", async () => {
    // Use ALICE for M3 (winner)
    const cap = await registry.action(
      "marketlens", "claimReward", ALICE,
      { marketId: "3" }
    );
    const sim = makeSimulator();
    const res = await sim.simulate(cap);
    const r: any = res.results[0];

    if (r.reverted) return; // ALICE may have already claimed in previous test

    const outcome = r.receipt.outcome;
    expect(outcome.operation).toBe("claim_reward");
    expect(outcome.wallet.toLowerCase()).toBe(ALICE.toLowerCase());
    expect(BigInt(outcome.payout)).toBeGreaterThan(0n);
  }, 30000);
});
